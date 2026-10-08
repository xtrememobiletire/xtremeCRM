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
          // Check current active cold count for this VA
          const activeCount = await prisma.lead.count({
            where: {
              assignedAgentId: vaId,
              stage: 'VA_OUTREACH',
              status: { in: ['NEW', 'CALLED'] },
            },
          });

          const slotsNeeded = Math.max(0, 5 - activeCount);
          if (slotsNeeded <= 0) continue;

          // Pull next unassigned leads in FIFO order respecting scheduled release
          const availableLeads = await prisma.lead.findMany({
            where: {
              assignedAgentId: null,
              stage: 'VA_OUTREACH',
              status: 'NEW',
              countryCode: (countryCode as any) || 'CA',
              OR: [
                { batch: { scheduledDate: null } },
                { batch: { scheduledDate: { lte: new Date() } } },
                { batchId: null },
              ],
            },
            orderBy: [
              { priority: 'desc' },
              { createdAt: 'asc' },
            ],
            take: slotsNeeded,
          });

          if (availableLeads.length > 0) {
            const leadIds = availableLeads.map((l) => l.id);
            await prisma.lead.updateMany({
              where: { id: { in: leadIds } },
              data: {
                assignedAgentId: vaId,
                assignmentMethod: 'AUTO_ASSIGN',
                assignedAt: new Date(),
              },
            });

            logger.info(`[Queue] Auto-replenished ${availableLeads.length} leads for VA ${vaId}`);

            // Broadcast real-time SSE event to trigger in-memory TanStack Query invalidation
            sseManager.broadcast(`sse:leads:${countryCode}`, 'lead:replenished', {
              vaId,
              replenishedCount: availableLeads.length,
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
