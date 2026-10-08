import { PgBoss } from 'pg-boss';
import { config } from '../config/env.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { sseManager } from './sseManager.js';

let boss: PgBoss | null = null;

export const QUEUES = {
  VA_LEAD_REPLENISH: 'va-lead-replenish',
  BATCH_SCHEDULED_RELEASE: 'batch-scheduled-release',
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
      schema: 'pgboss', // Isolated schema per architectural decision
      application_name: 'xtremecrm-queue',
      max: 10,
    });

    boss.on('error', (err: any) => {
      logger.error('[Queue] pg-boss runtime error:', err);
    });

    await boss.start();
    logger.info('[Queue] pg-boss successfully initialized in schema "pgboss"');

    // 1. Worker: VA 5-Cap Replenishment Worker with SKIP LOCKED row-level locking
    await boss.work(QUEUES.VA_LEAD_REPLENISH, async (jobs) => {
      for (const job of jobs) {
        const { vaId, countryCode } = job.data as { vaId: string; countryCode: string };
        if (!vaId) continue;

        try {
          const replenishedCount = await prisma.$transaction(async (tx) => {
            const activeCount = await tx.lead.count({
              where: {
                assignedAgentId: vaId,
                stage: 'VA_OUTREACH',
                status: { in: ['NEW', 'CALLED'] },
              },
            });

            const slotsNeeded = Math.max(0, 5 - activeCount);
            if (slotsNeeded <= 0) return 0;

            // Atomic selection with PostgreSQL row-level SKIP LOCKED (EXISTS subquery eliminates outer join)
            const leadsToClaim: Array<{ id: string }> = await tx.$queryRaw`
              SELECT l.id
              FROM leads l
              WHERE l.assigned_agent_id IS NULL
                AND l.stage = 'VA_OUTREACH'::"LeadStage"
                AND l.status = 'NEW'::"LeadStatus"
                AND l.country_code = ${countryCode || 'CA'}::"CountryCode"
                AND (
                  l.batch_id IS NULL
                  OR EXISTS (
                    SELECT 1 FROM batches b
                    WHERE b.id = l.batch_id
                      AND (b.scheduled_date IS NULL OR b.scheduled_date <= NOW())
                  )
                )
              ORDER BY l.priority DESC, l.created_at ASC
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
              },
            });

            return leadsToClaim.length;
          });

          if (replenishedCount > 0) {
            logger.info(`[Queue] Auto-replenished ${replenishedCount} leads for VA ${vaId}`);

            // Broadcast real-time SSE event to trigger in-memory TanStack Query invalidation
            sseManager.broadcast(`sse:leads:${countryCode}`, 'lead:replenished', {
              vaId,
              replenishedCount,
            });
          }
        } catch (err: any) {
          logger.error(`[Queue] Failed to replenish leads for VA ${vaId}:`, err);
        }
      }
    });

    // 2. Worker: Scheduled Batch Release Worker
    await boss.work(QUEUES.BATCH_SCHEDULED_RELEASE, async (jobs) => {
      for (const job of jobs) {
        const { batchId } = job.data as { batchId: string };
        if (!batchId) continue;

        try {
          const batch = await prisma.batch.findUnique({ where: { id: batchId } });
          if (batch) {
            logger.info(`[Queue] Scheduled batch ${batch.batchName} (${batch.id}) activated`);
            sseManager.broadcast(`sse:leads:${batch.countryCode}`, 'batch:activated', {
              batchId: batch.id,
              batchName: batch.batchName,
            });
          }
        } catch (err: any) {
          logger.error(`[Queue] Batch activation error for ${batchId}:`, err);
        }
      }
    });

    return boss;
  } catch (err: any) {
    logger.error('[Queue] Could not start pg-boss queue service:', err);
    return null;
  }
}

export async function stopQueueService(): Promise<void> {
  if (boss) {
    try {
      await boss.stop();
      logger.info('[Queue] pg-boss stopped gracefully');
    } catch (err) {
      logger.error('[Queue] Error stopping pg-boss:', err);
    }
  }
}

export function getQueue(): PgBoss | null {
  return boss;
}

export async function triggerVaReplenish(vaId: string, countryCode: string): Promise<void> {
  if (!boss) return;
  try {
    await boss.send(QUEUES.VA_LEAD_REPLENISH, { vaId, countryCode });
  } catch (err: any) {
    logger.warn('[Queue] Failed to dispatch replenish job to pg-boss:', err.message);
  }
}
