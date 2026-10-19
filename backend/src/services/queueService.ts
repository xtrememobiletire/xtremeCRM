import { PgBoss } from 'pg-boss';
import { config } from '../config/env.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { sseManager } from './sseManager.js';

let boss: PgBoss | null = null;

export const QUEUES = {
  BATCH_SCHEDULED_RELEASE: 'batch-scheduled-release',
  CALLBACK_DUE_TRIGGER: 'callback-due-trigger',
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
            throw err;
          }
        }
      }
    );

    // Idempotent CALLBACK_DUE_TRIGGER queue registration
    await boss.createQueue(QUEUES.CALLBACK_DUE_TRIGGER, {
      retryLimit: 3,
      retryDelay: 15,
      deadLetter: QUEUES.DEAD_LETTER,
      notify: true,
      retentionSeconds: 86400 * 7,
    });

    // Worker: Callback Due Trigger (wakes up when callbackDate hits)
    await boss.work(
      QUEUES.CALLBACK_DUE_TRIGGER,
      { pollingIntervalSeconds: 15, notifyPollingIntervalSeconds: 30 },
      async (jobs) => {
        for (const job of jobs) {
          const { leadId, preferredAgentId } = job.data as { leadId: string; preferredAgentId?: string };
          if (!leadId) continue;
          await assignDueCallbackAtomic(leadId, preferredAgentId);
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
      // Per-VA advisory lock prevents concurrent transactions assigning duplicate leads
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${vaId}))`;

      if (batchId) {
        // Auto-promote batch to ACTIVE if needed so it is ready for claiming
        await tx.batch.updateMany({
          where: {
            id: batchId,
            status: { not: 'ACTIVE' },
          },
          data: {
            status: 'ACTIVE',
            scheduledDate: new Date(),
          },
        });

        // Release any untouched lead from other batches back to unassigned pool
        await tx.lead.updateMany({
          where: {
            assignedAgentId: vaId,
            stage: 'VA_OUTREACH',
            status: 'NEW',
            disposition: null,
            batchId: { not: batchId },
          },
          data: {
            assignedAgentId: null,
            assignmentMethod: null,
            assignedAt: null,
          },
        });
      }

      const activeCount = await tx.lead.count({
        where: {
          assignedAgentId: vaId,
          stage: 'VA_OUTREACH',
          status: { in: ['NEW', 'CALLED'] },
          disposition: null,
          ...(batchId ? { batchId } : {}),
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
          AND (${batchId || null}::text IS NULL OR l.batch_id = ${batchId || null})
          AND (${batchId || null}::text IS NOT NULL OR l.country_code = ${countryCode || 'CA'}::"CountryCode")
          AND (l.last_called_by_va_id IS NULL OR l.last_called_by_va_id != ${vaId} OR l.last_called_at <= NOW() - INTERVAL '2 hours')
          AND (
            (${batchId || null}::text IS NOT NULL AND l.batch_id = ${batchId || null})
            OR l.batch_id IS NULL
            OR EXISTS (
              SELECT 1 FROM batches b
              WHERE b.id = l.batch_id
                AND b.status = 'ACTIVE'::"BatchStatus"
                AND (b.scheduled_date IS NULL OR b.scheduled_date <= NOW())
            )
          )
        ORDER BY
          CASE WHEN l.status = 'NEW'::"LeadStatus" THEN 0 ELSE 1 END ASC,
          l.priority DESC,
          COALESCE(l.number_of_units, 0) DESC,
          l.call_attempts_count ASC,
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

/**
 * Assign Due Callback Lead Atomically when callback time arrives.
 * Implements 3-tier fallback logic:
 * Tier 1: Sticky VA (if active and not overloaded with < 2 due callbacks)
 * Tier 2: Least-loaded active VA in the same country silo (< 2 due callbacks)
 * Tier 3: Unassigned Callbacks pool (lead.assignedAgentId = null) for manual claim
 */
export async function assignDueCallbackAtomic(
  leadId: string,
  preferredAgentId?: string
): Promise<boolean> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Lock lead row
      const leads: Array<{
        id: string;
        status: string;
        stage: string;
        countryCode: string;
        assignedAgentId: string | null;
      }> = await tx.$queryRaw`
        SELECT id, status, stage, country_code as "countryCode", assigned_agent_id as "assignedAgentId"
        FROM leads
        WHERE id = ${leadId}
        FOR UPDATE
      `;

      if (leads.length === 0) return false;
      const lead = leads[0];

      // If lead is no longer in CALLBACK / AGENT_CALLBACK status, skip
      if (lead.status !== 'CALLBACK' && lead.stage !== 'AGENT_CALLBACK') {
        return false;
      }

      // If Admin/GM/Dispatcher already manually assigned an agent, preserve and notify
      if (lead.assignedAgentId) {
        sseManager.broadcast(`sse:leads:${lead.countryCode}`, 'lead:callback_due', {
          leadId,
          assignedAgentId: lead.assignedAgentId,
          countryCode: lead.countryCode,
        });
        return true;
      }

      let targetAgentId: string | null = null;

      // Tier 1: Preferred (Sticky) Agent
      if (preferredAgentId) {
        const preferredAgent = await tx.user.findFirst({
          where: {
            id: preferredAgentId,
            role: { in: ['CALL_AGENT', 'VIRTUAL_ASSISTANT'] },
            isAgentActive: true,
            deletedAt: null,
          },
        });

        if (preferredAgent) {
          // Check workload cap: max 2 active due callbacks
          const activeCallbackCount = await tx.lead.count({
            where: {
              assignedAgentId: preferredAgentId,
              stage: 'AGENT_CALLBACK',
              status: 'CALLBACK',
              callbackDate: { lte: new Date() },
            },
          });

          if (activeCallbackCount < 2) {
            targetAgentId = preferredAgentId;
          }
        }
      }

      // Tier 2: Country silo overflow to least-loaded active VA
      if (!targetAgentId) {
        const candidates = await tx.user.findMany({
          where: {
            role: { in: ['CALL_AGENT', 'VIRTUAL_ASSISTANT'] },
            countryCode: lead.countryCode as any,
            isAgentActive: true,
            deletedAt: null,
          },
          include: {
            _count: {
              select: {
                assignedLeads: {
                  where: {
                    stage: 'AGENT_CALLBACK',
                    status: 'CALLBACK',
                    callbackDate: { lte: new Date() },
                  },
                },
              },
            },
          },
          orderBy: {
            assignedLeads: {
              _count: 'asc',
            },
          },
        });

        const eligible = candidates.find((c) => c._count.assignedLeads < 2);
        if (eligible) {
          targetAgentId = eligible.id;
        }
      }

      // Tier 3: If no active VA available or all overloaded, remain unassigned in callback pool
      await tx.lead.update({
        where: { id: leadId },
        data: {
          assignedAgentId: targetAgentId,
          assignmentMethod: targetAgentId ? 'AUTO_ASSIGN' : null,
          assignedAt: targetAgentId ? new Date() : null,
        },
      });

      // Broadcast real-time events
      sseManager.broadcast(`sse:leads:${lead.countryCode}`, 'lead:callback_due', {
        leadId,
        assignedAgentId: targetAgentId,
        countryCode: lead.countryCode,
      });

      if (targetAgentId) {
        sseManager.broadcast(`sse:leads:${lead.countryCode}`, 'lead:assigned', {
          leadId,
          assignedAgentId: targetAgentId,
        });
      }

      sseManager.broadcast(`sse:leads:${lead.countryCode}`, 'lead:stats_updated', {
        countryCode: lead.countryCode,
      });

      return true;
    });
  } catch (err: any) {
    logger.error(`[Queue] assignDueCallbackAtomic error for ${leadId}:`, err);
    return false;
  }
}

/**
 * Claim an unassigned callback lead atomically with FOR UPDATE SKIP LOCKED.
 */
export async function claimCallbackLeadAtomic(
  leadId: string,
  agentId: string
): Promise<boolean> {
  if (!leadId || !agentId) return false;

  try {
    return await prisma.$transaction(async (tx) => {
      const claimable: Array<{ id: string; countryCode: string }> = await tx.$queryRaw`
        SELECT id, country_code as "countryCode"
        FROM leads
        WHERE id = ${leadId}
          AND assigned_agent_id IS NULL
          AND stage = 'AGENT_CALLBACK'::"LeadStage"
          AND status = 'CALLBACK'::"LeadStatus"
        FOR UPDATE SKIP LOCKED
      `;

      if (claimable.length === 0) return false;
      const lead = claimable[0];

      await tx.lead.update({
        where: { id: leadId },
        data: {
          assignedAgentId: agentId,
          assignmentMethod: 'MANUAL',
          assignedAt: new Date(),
        },
      });

      sseManager.broadcast(`sse:leads:${lead.countryCode}`, 'lead:assigned', {
        leadId,
        assignedAgentId: agentId,
      });
      sseManager.broadcast(`sse:leads:${lead.countryCode}`, 'lead:stats_updated', {
        countryCode: lead.countryCode,
      });

      return true;
    });
  } catch (err: any) {
    logger.error(`[Queue] claimCallbackLeadAtomic error for lead ${leadId}:`, err);
    return false;
  }
}
