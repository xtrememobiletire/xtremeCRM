import { PgBoss } from 'pg-boss';
import { config } from '../config/env.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { sseManager } from './sseManager.js';

let boss: PgBoss | null = null;

export const QUEUES = {
  BATCH_SCHEDULED_RELEASE: 'batch-scheduled-release',
  DEAD_LETTER: 'crm-dead-letter',
} as const;

export async function initQueueService(): Promise<PgBoss | null> {
  const connectionString = config.DIRECT_URL || config.DATABASE_URL;
  if (!connectionString) {
    logger.warn('[Queue] No connection string available for pg-boss. Skipping queue initialization.');
    return null;
  }

  try {
    boss = new PgBoss({
      connectionString,
      schema: 'pgboss',
      application_name: 'xtremecrm-queue',
      max: 3, // Lean connection pool for Dokploy VPS
      useListenNotify: true, // Native Postgres LISTEN/NOTIFY push wakeup
    });

    boss.on('error', (err: any) => {
      logger.error('[Queue] pg-boss runtime error:', err);
    });

    await boss.start();
    logger.info('[Queue] pg-boss successfully initialized in schema "pgboss"');

    // Idempotent queue registrations
    await boss.createQueue(QUEUES.DEAD_LETTER, {
      retentionSeconds: 86400 * 14,
    });

    await boss.createQueue(QUEUES.BATCH_SCHEDULED_RELEASE, {
      retryLimit: 3,
      retryDelay: 10,
      deadLetter: QUEUES.DEAD_LETTER,
      notify: true,
      retentionSeconds: 86400 * 7,
    });

    logger.info('[Queue] Registered queues: batch-scheduled-release, crm-dead-letter');

    // Worker: Scheduled Batch Release (woken on NOTIFY, 60s relaxed backstop)
    await boss.work(
      QUEUES.BATCH_SCHEDULED_RELEASE,
      {
        pollingIntervalSeconds: 30,
        notifyPollingIntervalSeconds: 60,
      },
      async (jobs) => {
        for (const job of jobs) {
          const { batchId } = job.data as { batchId: string };
          if (!batchId) continue;

          try {
            const batch = await prisma.batch.findUnique({ where: { id: batchId } });
            if (batch) {
              await prisma.batch.update({
                where: { id: batch.id },
                data: { status: 'ACTIVE' },
              });
              logger.info(`[Queue] Scheduled batch ${batch.batchName} (${batch.id}) activated`);

              // Push refill to online VAs
              const activeVas = await prisma.user.findMany({
                where: {
                  role: { in: ['CALL_AGENT', 'VIRTUAL_ASSISTANT'] },
                  countryCode: batch.countryCode,
                  deletedAt: null,
                },
              });
              for (const va of activeVas) {
                await refillAgentQueueAtomic(va.id, batch.countryCode, 1, batch.id);
              }

              sseManager.broadcast(`sse:leads:${batch.countryCode}`, 'batch:activated', {
                batchId: batch.id,
                batchName: batch.batchName,
              });
              sseManager.broadcast(`sse:leads:${batch.countryCode}`, 'lead:stats_updated', {
                countryCode: batch.countryCode,
              });
            }
          } catch (err: any) {
            logger.error(`[Queue] Batch activation error for ${batchId}:`, err);
          }
        }
      }
    );

    return boss;
  } catch (err: any) {
    logger.error('[Queue] Could not start pg-boss queue service:', err);
    return null;
  }
}

export async function stopQueueService(): Promise<void> {
  if (boss) {
    try {
      await boss.stop({ graceful: true, timeout: 4000 });
      logger.info('[Queue] pg-boss drained and stopped gracefully');
    } catch (err) {
      logger.error('[Queue] Error stopping pg-boss:', err);
    }
  }
}

export function getQueue(): PgBoss | null {
  return boss;
}

/**
 * Atomic 1-Cap Lead Refill (Zero-Poll, Synchronous ACID transaction)
 * Called directly on call disposition save and batch activation.
 */
export async function refillAgentQueueAtomic(
  vaId: string,
  countryCode: string,
  targetCap: number = 1,
  batchId?: string
): Promise<number> {
  if (!vaId) return 0;

  try {
    const replenishedCount = await prisma.$transaction(async (tx) => {
      const activeCount = await tx.lead.count({
        where: {
          assignedAgentId: vaId,
          stage: 'VA_OUTREACH',
          status: { in: ['NEW', 'CALLED'] },
          disposition: null,
        },
      });

      const slotsNeeded = Math.max(0, targetCap - activeCount);
      if (slotsNeeded <= 0) return 0;

      const leadsToClaim: Array<{ id: string }> = await tx.$queryRaw`
        SELECT l.id
        FROM leads l
        WHERE l.assigned_agent_id IS NULL
          AND l.stage = 'VA_OUTREACH'::"LeadStage"
          AND l.status IN ('NEW'::"LeadStatus", 'CALLED'::"LeadStatus")
          AND l.country_code = ${countryCode || 'CA'}::"CountryCode"
          AND (
            l.batch_id IS NULL
            OR EXISTS (
              SELECT 1 FROM batches b
              WHERE b.id = l.batch_id
                AND b.status = 'ACTIVE'::"BatchStatus"
                AND (b.scheduled_date IS NULL OR b.scheduled_date <= NOW())
            )
          )
        ORDER BY
          (CASE 
            WHEN ${batchId || null}::text IS NOT NULL AND l.batch_id = ${batchId || null} THEN 0 
            WHEN l.batch_id IS NOT NULL THEN 1 
            ELSE 2 
          END) ASC,
          l.priority DESC,
          l.created_at ASC
        LIMIT ${slotsNeeded}
        FOR UPDATE SKIP LOCKED
      `;

      if (leadsToClaim.length === 0) return 0;

      const ids = leadsToClaim.map((l) => l.id);
      await tx.lead.updateMany({
        where: { id: { in: ids } },
        data: {
          assignedAgentId: vaId,
          assignmentMethod: 'AUTO_ASSIGN',
          assignedAt: new Date(),
          disposition: null,
        },
      });

      return leadsToClaim.length;
    });

    if (replenishedCount > 0) {
      logger.info(`[LeadRefill] Atomically replenished ${replenishedCount} lead(s) for VA ${vaId}`);
      sseManager.broadcast(`sse:leads:${countryCode}`, 'lead:replenished', {
        vaId,
        replenishedCount,
      });
      sseManager.broadcast(`sse:leads:${countryCode}`, 'lead:stats_updated', { countryCode });
    } else {
      await checkAndCompleteBatches(countryCode);
    }

    return replenishedCount;
  } catch (err: any) {
    logger.error(`[LeadRefill] Error in atomic lead refill for VA ${vaId}:`, err);
    return 0;
  }
}

/**
 * Check if active batches in a country have been fully worked up.
 * If all leads in the batch are completed, transition status to COMPLETED and alert Admin/GM.
 */
export async function checkAndCompleteBatches(countryCode: string): Promise<void> {
  try {
    const activeBatches = await prisma.batch.findMany({
      where: {
        countryCode: countryCode as any,
        status: 'ACTIVE',
      },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });

    for (const batch of activeBatches) {
      const pendingCount = await prisma.lead.count({
        where: {
          batchId: batch.id,
          stage: { in: ['VA_OUTREACH', 'AGENT_CALLBACK'] },
          status: { notIn: ['DEAD', 'CONVERTED'] },
        },
      });

      if (pendingCount === 0 && batch._count.leads > 0) {
        await prisma.batch.update({
          where: { id: batch.id },
          data: { status: 'COMPLETED' },
        });
        logger.info(`[Batch] Batch "${batch.batchName}" (${batch.id}) fully completed!`);
        sseManager.broadcast(`sse:leads:${countryCode}`, 'batch:completed', {
          batchId: batch.id,
          batchName: batch.batchName,
        });
        sseManager.broadcast(`sse:leads:${countryCode}`, 'lead:stats_updated', { countryCode });
      }
    }
  } catch (err: any) {
    logger.error('[Batch] Error checking batch completion status:', err);
  }
}

// Deprecated alias for backwards compatibility
export async function triggerVaReplenish(vaId: string, countryCode: string): Promise<void> {
  await refillAgentQueueAtomic(vaId, countryCode, 1);
}
