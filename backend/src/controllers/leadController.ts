import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import { prisma } from '../config/database.js';
import {
  sendSuccess,
  sendError,
  sanitizePaginationParams,
  calculateSkip,
  createPaginatedResponse,
  generateUniqueFleetCode,
} from '../utils/index.js';
import { getIO } from '../config/socket.js';
import { refillAgentQueueAtomic, claimCallbackLeadAtomic, checkAndCompleteBatches, getQueue, QUEUES } from '../services/queueService.js';
import { sseManager } from '../services/sseManager.js';
import { validateAndNormalizePhone } from '../utils/validators.js';
import { logger } from '../utils/logger.js';
import { resolveLeadTimezone, zonedWallTimeToUtc } from '../utils/timezone.js';
import { geocodingService } from '../services/geocodingService.js';

export const VA_LEAD_CAP = 1;

export function getTenantFilter(req: Request) {
  const user = (req as any).user;
  if (['ADMIN', 'GENERAL_MANAGER', 'DEVELOPER', 'SUPER_ADMIN'].includes(user?.role)) {
    const qCountry = (req.query?.countryCode as string) || (req.headers['x-country-code'] as string);
    if (qCountry && qCountry !== 'ALL') {
      return { countryCode: qCountry as any };
    }
    return {};
  }
  return { countryCode: (user?.countryCode || 'CA') as any };
}


export const leadController = {
  /**
   * Get Batches with unassigned and held counts (Admin / GM)
   */
  async getBatches(req: Request, res: Response) {
    try {
      const countryCode = req.query.countryCode as string;
      const status = req.query.status as any;
      const where: any = {};
      if (countryCode && countryCode !== 'ALL') where.countryCode = countryCode;
      if (status && status !== 'ALL') where.status = status;

      const batches = await prisma.batch.findMany({
        where,
        orderBy: [{ scheduledDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          uploadedBy: { select: { id: true, fullName: true, role: true } },
          _count: {
            select: { leads: true },
          },
        },
      });

      if (batches.length === 0) {
        return sendSuccess(res, [], 'Batches retrieved successfully');
      }

      const batchIds = batches.map((b) => b.id);
      const leads = await prisma.lead.findMany({
        where: { batchId: { in: batchIds } },
        select: {
          batchId: true,
          assignedAgentId: true,
          status: true,
          stage: true,
        },
      });

      const metricsMap = new Map<string, { unassignedLeads: number; heldLeads: number; completedLeads: number }>();
      for (const bId of batchIds) {
        metricsMap.set(bId, { unassignedLeads: 0, heldLeads: 0, completedLeads: 0 });
      }

      for (const lead of leads) {
        if (!lead.batchId) continue;
        const m = metricsMap.get(lead.batchId);
        if (!m) continue;

        if (!lead.assignedAgentId && ['NEW', 'CALLED'].includes(lead.status) && lead.stage === 'VA_OUTREACH') {
          m.unassignedLeads++;
        }
        if (lead.assignedAgentId && ['NEW', 'CALLED', 'CALLBACK'].includes(lead.status) && ['VA_OUTREACH', 'AGENT_CALLBACK'].includes(lead.stage)) {
          m.heldLeads++;
        }
        if (['CONVERTED', 'DEAD'].includes(lead.status)) {
          m.completedLeads++;
        }
      }

      const batchesWithMetrics = batches.map((b) => {
        const m = metricsMap.get(b.id) || { unassignedLeads: 0, heldLeads: 0, completedLeads: 0 };
        return {
          ...b,
          totalLeads: b._count.leads || b.totalLeads,
          unassignedLeads: m.unassignedLeads,
          heldLeads: m.heldLeads,
          completedLeads: m.completedLeads,
        };
      });

      return sendSuccess(res, batchesWithMetrics, 'Batches retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Get Active Batches within operating window for VA Campaign Batch Chooser
   * Filters:
   * - status = 'ACTIVE'
   * - scheduledDate is null or <= new Date() (deadlines passed / active now, NEVER future)
   * - unassignedLeads > 0
   * - across all countries so VAs can select any open campaign
   */
  async getAvailableBatchesForVa(req: Request, res: Response) {
    try {
      const now = new Date();

      const batches = await prisma.batch.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { scheduledDate: null },
            { scheduledDate: { lte: now } },
          ],
        },
        orderBy: [{ scheduledDate: 'desc' }, { createdAt: 'desc' }],
      });

      const batchesWithCounts = await Promise.all(
        batches.map(async (b) => {
          const unassignedLeads = await prisma.lead.count({
            where: {
              batchId: b.id,
              assignedAgentId: null,
              status: { in: ['NEW', 'CALLED'] },
              stage: 'VA_OUTREACH',
            },
          });
          return {
            id: b.id,
            batchName: b.batchName,
            countryCode: b.countryCode,
            status: b.status,
            scheduledDate: b.scheduledDate,
            unassignedLeads,
            totalLeads: b.totalLeads,
          };
        })
      );

      const available = batchesWithCounts.filter((b) => b.unassignedLeads > 0);
      return sendSuccess(res, available, 'Available campaign batches retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Get Real-time Lead Stats & VA Workload for Command Center (Admin / GM)
   */
  async getLeadStats(req: Request, res: Response) {
    try {
      const countryCode = (req.query.countryCode as any) || (req as any).countryCode;
      const batchId = (req.query.batchId as string) || undefined;
      const whereBase: any = {};
      if (countryCode && countryCode !== 'ALL') whereBase.countryCode = countryCode;
      if (batchId) whereBase.batchId = batchId;

      const [
        total,
        unassigned,
        inProgress,
        dispatcherReview,
        testService,
        adminApproval,
        converted,
        disqualified,
        callbacks,
        overdueCallbacks,
        scheduledBatches,
        vaWorkloads,
      ] = await Promise.all([
        prisma.lead.count({ where: whereBase }),
        prisma.lead.count({
          where: {
            ...whereBase,
            assignedAgentId: null,
            stage: 'VA_OUTREACH',
            status: { in: ['NEW', 'CALLED'] },
          },
        }),
        prisma.lead.count({
          where: {
            ...whereBase,
            stage: { in: ['VA_OUTREACH', 'AGENT_CALLBACK'] },
            assignedAgentId: { not: null },
          },
        }),
        prisma.lead.count({
          where: {
            ...whereBase,
            stage: 'DISPATCHER_REVIEW',
          },
        }),
        prisma.lead.count({
          where: {
            ...whereBase,
            testServices: { some: {} },
          },
        }),
        prisma.lead.count({
          where: {
            ...whereBase,
            stage: 'ADMIN_APPROVAL',
          },
        }),
        prisma.lead.count({
          where: {
            ...whereBase,
            status: 'CONVERTED',
          },
        }),
        prisma.lead.count({
          where: {
            ...whereBase,
            stage: 'DISQUALIFIED',
          },
        }),
        prisma.lead.count({
          where: {
            ...whereBase,
            stage: 'AGENT_CALLBACK',
          },
        }),
        prisma.lead.count({
          where: {
            ...whereBase,
            stage: 'AGENT_CALLBACK',
            callbackDate: { lte: new Date() },
          },
        }),
        prisma.batch.count({
          where: {
            ...(countryCode ? { countryCode } : {}),
            status: 'SCHEDULED',
          },
        }),
        prisma.user.findMany({
          where: {
            role: { in: ['VIRTUAL_ASSISTANT', 'CALL_AGENT'] },
            deletedAt: null,
            ...(countryCode ? { countryCode } : {}),
          },
          select: {
            id: true,
            fullName: true,
            role: true,
            countryCode: true,
            assignedLeads: {
              where: {
                stage: { in: ['VA_OUTREACH', 'AGENT_CALLBACK'] },
                status: { in: ['NEW', 'CALLED', 'CALLBACK'] },
              },
              select: { id: true },
            },
          },
        }),
      ]);

      return sendSuccess(res, {
        total,
        unassigned,
        inProgress,
        dispatcherReview,
        testService,
        adminApproval,
        converted,
        disqualified,
        callbacks,
        overdueCallbacks,
        pendingGmSignoff: adminApproval,
        scheduledBatches,
        vaWorkloads: vaWorkloads.map((va) => ({
          id: va.id,
          fullName: va.fullName,
          role: va.role,
          countryCode: va.countryCode,
          activeCount: va.assignedLeads.length,
        })),
      }, 'Lead stats retrieved successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * List Outbound Leads with pool-based filtering and pagination
   * Pools: 'va' (5-cap outreach), 'callbacks' (agent callbacks), 'dispatcher' (review/trial), 'admin' (all), 'disqualified'
   */
  async getLeads(req: Request, res: Response) {
    try {
      const pageParam = req.query.page ? Number(req.query.page) : 1;
      const limitParam = req.query.limit ? Number(req.query.limit) : 25;
      const { page, limit } = sanitizePaginationParams(pageParam, limitParam);
      const skip = calculateSkip(page, limit);

      const countryCode = req.query.countryCode as string;
      const batchId = req.query.batchId as string;
      const status = req.query.status as any;
      const disposition = req.query.disposition as any;
      const search = req.query.search as string;
      const assignedAgentId = req.query.assignedAgentId as string;
      const pool = req.query.pool as string;
      const stage = req.query.stage as any;
      const priority = req.query.priority ? Number(req.query.priority) : undefined;

      const user = (req as any).user;
      const conditions: any[] = [];

      if (batchId) conditions.push({ batchId });
      if (countryCode && countryCode !== 'ALL') conditions.push({ countryCode });
      if (status) conditions.push({ status });
      if (disposition) conditions.push({ disposition });
      if (priority !== undefined) conditions.push({ priority });

      // Clean Pool filtering logic strictly aligned with operational lifecycle
      if (pool === 'all') {
        // Master view: All leads across lifecycle, no exclusions
      } else if (pool === 'unassigned') {
        conditions.push({
          assignedAgentId: null,
          status: { in: ['NEW', 'CALLED'] },
          stage: 'VA_OUTREACH',
        });
      } else if (pool === 'assigned' || pool === 'called') {
        // Leads in active VA outreach
        conditions.push({
          stage: 'VA_OUTREACH',
          assignedAgentId: { not: null },
        });
      } else if (pool === 'callbacks') {
        conditions.push({ stage: 'AGENT_CALLBACK' });
      } else if (pool === 'dispatcher') {
        conditions.push({ stage: 'DISPATCHER_REVIEW' });
      } else if (pool === 'approval') {
        conditions.push({ stage: 'ADMIN_APPROVAL' });
      } else if (pool === 'converted') {
        conditions.push({ stage: 'CONVERTED' });
      } else if (pool === 'disqualified') {
        conditions.push({ stage: 'DISQUALIFIED' });
      } else if (pool === 'va') {
        conditions.push({ stage: 'VA_OUTREACH' });
        if (user?.role === 'VIRTUAL_ASSISTANT') {
          conditions.push({ assignedAgentId: user.id });
        } else if (assignedAgentId) {
          conditions.push({ assignedAgentId });
        }
      } else if (stage) {
        conditions.push({ stage });
      } else if (assignedAgentId) {
        conditions.push({ assignedAgentId });
      }

      if (search && search.trim()) {
        const query = search.trim();
        conditions.push({
          OR: [
            { companyName: { contains: query, mode: 'insensitive' } },
            { contactPerson: { contains: query, mode: 'insensitive' } },
            { fleetManager: { contains: query, mode: 'insensitive' } },
            { ceoOwnerName: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
            { altPhone: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { poaEmail: { contains: query, mode: 'insensitive' } },
          ],
        });
      }

      const where: any = conditions.length > 0 ? { AND: conditions } : {};

      // Dynamic sorting based on pool - Always prioritize latest leads (createdAt: 'desc')
      let orderBy: any[] = [{ createdAt: 'desc' }];
      if (pool === 'unassigned') {
        orderBy = [{ createdAt: 'desc' }, { priority: 'desc' }];
      } else if (pool === 'callbacks') {
        orderBy = [{ callbackDate: 'asc' }, { updatedAt: 'desc' }];
      } else if (pool === 'dispatcher' || pool === 'approval') {
        orderBy = [{ updatedAt: 'desc' }, { createdAt: 'desc' }];
      } else if (pool === 'called' || pool === 'assigned' || pool === 'va') {
        orderBy = [{ updatedAt: 'desc' }, { createdAt: 'desc' }];
      } else if (pool === 'disqualified' || pool === 'converted') {
        orderBy = [{ updatedAt: 'desc' }, { createdAt: 'desc' }];
      }

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            batch: {
              select: { id: true, batchName: true, status: true, countryCode: true },
            },
            uploadedBy: {
              select: { id: true, fullName: true, role: true },
            },
            assignedAgent: {
              select: { id: true, fullName: true, role: true },
            },
            assignedDispatcher: {
              select: { id: true, fullName: true, role: true },
            },
            lastCalledByVa: {
              select: { id: true, fullName: true, role: true },
            },
            testServices: {
              select: {
                id: true,
                jobCode: true,
                status: true,
                appointmentDate: true,
                serviceAddress: true,
                driver: { select: { id: true, fullName: true, phone: true } },
              },
            },
            resultingFleet: {
              select: { id: true, fleetCode: true, name: true },
            },
          },
        }),
        prisma.lead.count({ where }),
      ]);

      const paginatedData = createPaginatedResponse(leads, total, page, limit);
      return sendSuccess(res, paginatedData);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * Get single lead by ID
   */
  async getLeadById(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const lead = await prisma.lead.findFirst({
        where: { id, ...getTenantFilter(req) },
        include: {
          uploadedBy: {
            select: { id: true, fullName: true, role: true },
          },
          assignedAgent: {
            select: { id: true, fullName: true, role: true },
          },
          assignedDispatcher: {
            select: { id: true, fullName: true, role: true },
          },
          testServices: {
            select: { id: true, jobCode: true, status: true, appointmentDate: true, serviceAddress: true },
          },
        },
      });

      if (!lead) return sendError(res, 'Lead not found', 404);
      return sendSuccess(res, lead);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * Create a new Lead (pushed by VA, Agent, or Admin)
   */
  async createLead(req: Request, res: Response) {
    try {
      const {
        companyName,
        contactPerson,
        fleetManager,
        ceoOwnerName,
        phone,
        altPhone,
        email,
        poaEmail,
        address,
        website,
        numberOfUnits,
        countryCode = 'CA',
        notes,
        assignedAgentId,
        priority = 0,
        callbackDate,
        callbackDay,
        callbackTime,
      } = req.body;

      const resolvedContact = contactPerson || fleetManager || ceoOwnerName || 'Fleet Manager';
      if (!companyName || !phone) {
        return sendError(res, 'Company name and phone number are required', 400);
      }

      const user = req.user as any;

      // Duplicate check (PRD FR-9.1)
      const existing = await prisma.lead.findFirst({
        where: {
          phone: phone.trim(),
          countryCode: countryCode as any,
        },
      });

      const parsedCallbackDate = callbackDate ? new Date(callbackDate) : null;
      const status = parsedCallbackDate ? 'CALLBACK' : 'NEW';
      const stage = parsedCallbackDate ? 'AGENT_CALLBACK' : 'VA_OUTREACH';
      const isCompanySourced = user?.role === 'ADMIN' || user?.role === 'GENERAL_MANAGER' || user?.role === 'DISPATCHER';

      const lead = await prisma.lead.create({
        data: {
          companyName: companyName.trim(),
          contactPerson: String(resolvedContact).trim(),
          fleetManager: fleetManager?.trim() || null,
          ceoOwnerName: ceoOwnerName?.trim() || null,
          phone: phone.trim(),
          altPhone: altPhone?.trim() || null,
          email: email?.trim() || null,
          poaEmail: poaEmail?.trim() || null,
          address: address?.trim() || null,
          website: website?.trim() || null,
          numberOfUnits: numberOfUnits ? Number(numberOfUnits) : null,
          countryCode: countryCode as any,
          notes: notes?.trim() || null,
          uploadedById: user?.id || null,
          isCompanySourced,
          assignedAgentId: assignedAgentId || null,
          assignmentMethod: assignedAgentId ? 'MANUAL' : null,
          assignedById: assignedAgentId ? user?.id : null,
          status,
          stage,
          priority: Number(priority) || 0,
          callbackDate: parsedCallbackDate,
          callbackDay: callbackDay || null,
          callbackTime: callbackTime || null,
        },
        include: {
          uploadedBy: {
            select: { id: true, fullName: true, role: true },
          },
          assignedAgent: {
            select: { id: true, fullName: true, role: true },
          },
        },
      });

      // Broadcast SSE & socket
      sseManager.broadcast(`sse:leads:${countryCode}`, 'lead:created', {
        lead,
        isDuplicate: !!existing,
      });
      sseManager.broadcast(`sse:leads:${countryCode}`, 'lead:stats_updated', { countryCode });

      try {
        const io = getIO();
        io.to(`dispatch:${countryCode}`).emit('lead:created', {
          lead,
          isDuplicate: !!existing,
        });
      } catch {}

      return sendSuccess(res, lead, 'Lead pushed successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Update lead status, disposition, notes, or assignment
   */
  async updateLead(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const user = (req as any).user;
      const existingCheck = await prisma.lead.findFirst({
        where: { id, ...getTenantFilter(req) },
      });
      if (!existingCheck) return sendError(res, 'Lead not found or access denied', 404);
      const {
        companyName,
        contactPerson,
        fleetManager,
        ceoOwnerName,
        phone,
        altPhone,
        email,
        poaEmail,
        address,
        website,
        numberOfUnits,
        estimatedFleetSize,
        status,
        stage,
        disposition,
        notes,
        priority,
        assignedAgentId,
        assignedDispatcherId,
        whatsappFollowUp,
        whatsappNotes,
        vehicleTypes,
        commonTireSizes,
        dispatcherNotes,
        disqualificationReason,
        disqualifiedNotes,
      } = req.body;

      const existingLead = await prisma.lead.findUnique({ where: { id } });
      if (!existingLead) return sendError(res, 'Lead not found', 404);

      const data: any = {};
      if (companyName !== undefined) data.companyName = companyName;
      if (contactPerson !== undefined) data.contactPerson = contactPerson;
      if (fleetManager !== undefined) data.fleetManager = fleetManager;
      if (ceoOwnerName !== undefined) data.ceoOwnerName = ceoOwnerName;
      if (phone !== undefined) data.phone = phone;
      if (altPhone !== undefined) data.altPhone = altPhone;
      if (email !== undefined) data.email = email;
      if (poaEmail !== undefined) data.poaEmail = poaEmail;
      if (address !== undefined) data.address = address;
      if (website !== undefined) data.website = website;
      if (numberOfUnits !== undefined) data.numberOfUnits = numberOfUnits !== null ? Number(numberOfUnits) : null;
      if (estimatedFleetSize !== undefined) data.estimatedFleetSize = estimatedFleetSize !== null ? Number(estimatedFleetSize) : null;

      if (status !== undefined) data.status = status;
      if (stage !== undefined) data.stage = stage;
      if (disposition !== undefined) data.disposition = disposition;
      if (notes !== undefined) data.notes = notes;
      if (dispatcherNotes !== undefined) data.dispatcherNotes = dispatcherNotes;
      if (disqualificationReason !== undefined) data.disqualificationReason = disqualificationReason;
      if (disqualifiedNotes !== undefined) data.disqualifiedNotes = disqualifiedNotes;
      if (priority !== undefined) data.priority = Number(priority);
      if (assignedAgentId !== undefined) {
        data.assignedAgentId = assignedAgentId || null;
        data.assignmentMethod = assignedAgentId ? 'MANUAL' : null;
        data.assignedAt = assignedAgentId ? new Date() : null;
      }
      if (assignedDispatcherId !== undefined) data.assignedDispatcherId = assignedDispatcherId;
      if (whatsappFollowUp !== undefined) data.whatsappFollowUp = whatsappFollowUp;
      if (whatsappNotes !== undefined) data.whatsappNotes = whatsappNotes;
      if (vehicleTypes !== undefined) data.vehicleTypes = vehicleTypes;
      if (commonTireSizes !== undefined) data.commonTireSizes = commonTireSizes;

      // Track field diff in hitHistory
      const fieldDiff: Record<string, { from: any; to: any }> = {};
      const coreFields = [
        'companyName', 'contactPerson', 'fleetManager', 'ceoOwnerName',
        'phone', 'altPhone', 'email', 'poaEmail', 'address', 'website',
        'numberOfUnits', 'estimatedFleetSize', 'vehicleTypes', 'commonTireSizes'
      ];
      for (const f of coreFields) {
        if (data[f] !== undefined && data[f] !== (existingLead as any)[f]) {
          fieldDiff[f] = { from: (existingLead as any)[f], to: data[f] };
        }
      }

      if (Object.keys(fieldDiff).length > 0) {
        const existingHits = Array.isArray(existingLead.hitHistory) ? (existingLead.hitHistory as any[]) : [];
        const editorName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Staff';
        const editRecord = {
          action: 'FIELD_EDIT',
          editedAt: new Date().toISOString(),
          editedById: user?.id,
          editedByName: editorName,
          diff: fieldDiff,
        };
        data.hitHistory = [...existingHits, editRecord];
      }

      const updated = await prisma.lead.update({
        where: { id },
        data,
        include: {
          uploadedBy: { select: { id: true, fullName: true, role: true } },
          assignedAgent: { select: { id: true, fullName: true, role: true } },
          assignedDispatcher: { select: { id: true, fullName: true, role: true } },
          lastCalledByVa: { select: { id: true, fullName: true, role: true } },
        },
      });

      sseManager.broadcast(`sse:leads:${updated.countryCode}`, 'lead:updated', updated);
      sseManager.broadcast(`sse:leads:${updated.countryCode}`, 'lead:stats_updated', { countryCode: updated.countryCode });

      try {
        const io = getIO();
        io.to(`dispatch:${updated.countryCode}`).emit('lead:updated', updated);
      } catch {}

      return sendSuccess(res, updated, 'Lead updated');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Claim an unassigned callback lead (Atomic ACID with SKIP LOCKED)
   */
  async claimCallbackLead(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const agentId = (req as any).user?.id;
      if (!agentId) return sendError(res, 'Unauthorized', 401);

      const claimed = await claimCallbackLeadAtomic(id, agentId);
      if (!claimed) {
        return sendError(res, 'Could not claim callback lead. It may have already been claimed or rescheduled.', 409);
      }

      const lead = await prisma.lead.findUnique({
        where: { id },
        include: {
          uploadedBy: { select: { id: true, fullName: true, role: true } },
          assignedAgent: { select: { id: true, fullName: true, role: true } },
          lastCalledByVa: { select: { id: true, fullName: true, role: true } },
        },
      });

      return sendSuccess(res, lead, 'Callback lead claimed successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Advance Lead Stage (FR-9.6)
   */
  async advanceStage(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const existingCheck = await prisma.lead.findFirst({
        where: { id, ...getTenantFilter(req) },
      });
      if (!existingCheck) return sendError(res, 'Lead not found or access denied', 404);
      const { stage, assignedDispatcherId, notes, dispatcherNotes, vehicleTypes, commonTireSizes } = req.body;

      const lead = await prisma.lead.findFirst({ where: { id, ...getTenantFilter(req) } });
      if (!lead) return sendError(res, 'Lead not found or access denied', 404);

      const updateData: any = {
        stage,
        updatedAt: new Date(),
      };

      if (assignedDispatcherId !== undefined) updateData.assignedDispatcherId = assignedDispatcherId;
      if (notes !== undefined) updateData.notes = notes;
      if (dispatcherNotes !== undefined) updateData.dispatcherNotes = dispatcherNotes;
      if (vehicleTypes !== undefined) updateData.vehicleTypes = vehicleTypes;
      if (commonTireSizes !== undefined) updateData.commonTireSizes = commonTireSizes;

      // Stage-specific status transitions
      if (stage === 'DISPATCHER_REVIEW') {
        updateData.status = 'CALLED';
      } else if (stage === 'ADMIN_APPROVAL') {
        updateData.status = 'CALLED';
      } else if (stage === 'CONVERTED') {
        updateData.status = 'CONVERTED';
        updateData.disposition = 'CONVERTED';
      } else if (stage === 'DISQUALIFIED') {
        updateData.status = 'DEAD';
      }

      const updated = await prisma.lead.update({
        where: { id },
        data: updateData,
        include: {
          uploadedBy: { select: { id: true, fullName: true, role: true } },
          assignedAgent: { select: { id: true, fullName: true, role: true } },
          assignedDispatcher: { select: { id: true, fullName: true, role: true } },
        },
      });

      sseManager.broadcast(`sse:leads:${updated.countryCode}`, 'lead:updated', updated);
      sseManager.broadcast(`sse:leads:${updated.countryCode}`, 'lead:stats_updated', { countryCode: updated.countryCode });

      try {
        const io = getIO();
        io.to(`dispatch:${updated.countryCode}`).emit('lead:updated', updated);
      } catch {}

      return sendSuccess(res, updated, `Lead advanced to stage ${stage}`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Disqualify Lead with structured reason and audit trail
   */
  async disqualifyLead(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const existingCheck = await prisma.lead.findFirst({
        where: { id, ...getTenantFilter(req) },
      });
      if (!existingCheck) return sendError(res, 'Lead not found or access denied', 404);
      const { reason, notes } = req.body;

      if (!reason) {
        return sendError(res, 'Disqualification reason is required', 400);
      }

      const lead = await prisma.lead.findFirst({ where: { id, ...getTenantFilter(req) } });
      if (!lead) return sendError(res, 'Lead not found or access denied', 404);

      const updated = await prisma.lead.update({
        where: { id },
        data: {
          stage: 'DISQUALIFIED',
          status: 'DEAD',
          disqualificationReason: reason,
          disqualifiedAtStage: lead.stage,
          disqualifiedNotes: notes || null,
          assignedAgentId: null, // Clear out of VA cap
        },
        include: {
          uploadedBy: { select: { id: true, fullName: true, role: true } },
          assignedAgent: { select: { id: true, fullName: true, role: true } },
          assignedDispatcher: { select: { id: true, fullName: true, role: true } },
        },
      });

      // Replenish previous VA if lead was with a VA
      if (lead.assignedAgentId) {
        await refillAgentQueueAtomic(lead.assignedAgentId, lead.countryCode, 1);
        await checkAndCompleteBatches(lead.countryCode);
      }

      sseManager.broadcast(`sse:leads:${updated.countryCode}`, 'lead:updated', updated);
      sseManager.broadcast(`sse:leads:${updated.countryCode}`, 'lead:stats_updated', { countryCode: updated.countryCode });

      try {
        const io = getIO();
        io.to(`dispatch:${updated.countryCode}`).emit('lead:updated', updated);
      } catch {}

      return sendSuccess(res, updated, 'Lead disqualified');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Reactivate Disqualified Lead back into VA_OUTREACH pool
   */
  async reactivateLead(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const existingCheck = await prisma.lead.findFirst({
        where: { id, ...getTenantFilter(req) },
      });
      if (!existingCheck) return sendError(res, 'Lead not found or access denied', 404);
      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) return sendError(res, 'Lead not found', 404);

      const updated = await prisma.lead.update({
        where: { id },
        data: {
          stage: 'VA_OUTREACH',
          status: 'NEW',
          disposition: null,
          disqualificationReason: null,
          disqualifiedAtStage: null,
          disqualifiedNotes: null,
          assignedAgentId: null,
        },
        include: {
          uploadedBy: { select: { id: true, fullName: true, role: true } },
          assignedAgent: { select: { id: true, fullName: true, role: true } },
          assignedDispatcher: { select: { id: true, fullName: true, role: true } },
        },
      });

      // If parent batch was marked COMPLETED, reactivate it so the lead can be claimed
      if (updated.batchId) {
        const batch = await prisma.batch.findUnique({ where: { id: updated.batchId } });
        if (batch && batch.status === 'COMPLETED') {
          await prisma.batch.update({
            where: { id: batch.id },
            data: { status: 'ACTIVE' },
          });
          sseManager.broadcast(`sse:leads:${updated.countryCode}`, 'batch:activated', {
            batchId: batch.id,
            batchName: batch.batchName,
          });
        }
      }

      sseManager.broadcast(`sse:leads:${updated.countryCode}`, 'lead:updated', updated);
      sseManager.broadcast(`sse:leads:${updated.countryCode}`, 'lead:stats_updated', { countryCode: updated.countryCode });

      try {
        const io = getIO();
        io.to(`dispatch:${updated.countryCode}`).emit('lead:updated', updated);
      } catch {}

      return sendSuccess(res, updated, 'Lead reactivated back into unassigned outreach pool');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Warm Transfer Lead to Dispatcher Manager (FR-9.6)
   */
  async transferLeadToDm(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const existingCheck = await prisma.lead.findFirst({
        where: { id, ...getTenantFilter(req) },
      });
      if (!existingCheck) return sendError(res, 'Lead not found or access denied', 404);
      const { transferNotes, callId } = req.body;
      const agent = req.user as any;

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) return sendError(res, 'Lead not found', 404);

      const updated = await prisma.lead.update({
        where: { id },
        data: {
          stage: 'DISPATCHER_REVIEW',
          status: 'CALLED',
          assignedAgentId: null, // Clear out of VA cap
          notes: transferNotes ? `${lead.notes ? lead.notes + '\n' : ''}[Transfer to DM from ${agent?.fullName || 'Agent'}]: ${transferNotes}` : lead.notes,
        },
        include: {
          uploadedBy: { select: { id: true, fullName: true, role: true } },
          assignedDispatcher: { select: { id: true, fullName: true, role: true } },
        },
      });

      // Replenish VA
      if (agent?.id) {
        await refillAgentQueueAtomic(agent.id, lead.countryCode, 1);
      }

      sseManager.broadcast(`sse:leads:${lead.countryCode}`, 'lead:updated', updated);

      try {
        const io = getIO();
        const transferPayload = {
          transferType: 'OUTBOUND_LEAD',
          callId: callId || `call-${Date.now()}`,
          leadId: lead.id,
          companyName: lead.companyName,
          contactPerson: lead.contactPerson,
          phone: lead.phone,
          notes: transferNotes || lead.notes,
          transferringAgent: agent?.fullName || 'Call Agent',
          countryCode: lead.countryCode,
          timestamp: new Date().toISOString(),
        };

        sseManager.broadcast(`sse:dispatch:${lead.countryCode}`, 'lead:transferred', transferPayload);
        sseManager.broadcast(`sse:leads:${lead.countryCode}`, 'lead:transferred', transferPayload);

        io.to(`dispatch:${lead.countryCode}`).emit('call:transfer', transferPayload);
        io.to('role:DISPATCHER').emit('call:transfer', transferPayload);
        io.to('role:ADMIN').emit('call:transfer', transferPayload);
        io.to('role:GENERAL_MANAGER').emit('call:transfer', transferPayload);
      } catch {}

      return sendSuccess(res, updated, 'Lead transferred to Dispatcher Manager');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Convert Lead to Fleet Account (FR-9.6 / FR-9.7)
   * 100% data preservation of all 10 Excel columns into Fleet
   */
  async convertToFleet(req: Request, res: Response) {
    try {
      const userRole = (req as any).user?.role;
      if (!['ADMIN', 'GENERAL_MANAGER'].includes(userRole)) {
        return sendError(res, 'Only Administrators and General Managers can convert leads to active Fleets', 403);
      }

      const id = String(req.params.id);
      const { customFleetCode } = req.body;

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) return sendError(res, 'Lead not found', 404);

      const fleetCode = await generateUniqueFleetCode(customFleetCode);

      // Create new Fleet linked to Lead and VA for commission (credited regardless of company source)
      const virtualAssistantId = lead.lastCalledByVaId || lead.assignedAgentId || lead.uploadedById || (req as any).user?.id;

      // Extract extraData from ConvertFleetModal (check both top-level and nested extraData)
      const extra = { ...(req.body || {}), ...(req.body?.extraData || {}) };
      const companyName = extra.companyName || lead.companyName;
      const contactPerson = extra.contactPerson || lead.contactPerson;
      const rawPhone = extra.phone || lead.phone;
      let fleetPhone = rawPhone;
      if (rawPhone) {
        const phoneValidation = validateAndNormalizePhone(rawPhone, lead.countryCode);
        if (phoneValidation.isValid) fleetPhone = phoneValidation.normalized;
      }

      const fleetEmail = (extra.email || lead.email)?.trim()?.toLowerCase() || null;
      const rawPass: string = extra.password?.trim() || `XtremeFleet${Math.floor(1000 + Math.random() * 9000)}!`;

      const result = await prisma.$transaction(async (tx) => {
        let managerUserIdToLink: string | null = null;
        if (fleetEmail) {
          const passwordHash: string = await bcrypt.hash(rawPass, 10);
          const existingUser = await tx.user.findUnique({ where: { email: fleetEmail } });
          if (existingUser && existingUser.role !== 'FLEET_MANAGER') {
            throw new Error(`Email ${fleetEmail} is already registered to an account with role ${existingUser.role}`);
          }
          if (existingUser) {
            if (existingUser.role === 'FLEET_MANAGER') {
              await tx.user.update({
                where: { id: existingUser.id },
                data: { passwordHash },
              });
              managerUserIdToLink = existingUser.id;
            }
          } else {
            const newUser = await tx.user.create({
              data: {
                email: fleetEmail,
                passwordHash,
                fullName: contactPerson || companyName || 'Fleet Manager',
                phone: fleetPhone || null,
                role: 'FLEET_MANAGER',
                countryCode: lead.countryCode,
              },
            });
            managerUserIdToLink = newUser.id;
          }
        }

        const fleet = await tx.fleet.create({
          data: {
            fleetCode,
            name: companyName,
            contactPerson: contactPerson,
            fleetManager: extra.fleetManager || lead.fleetManager || req.body.fleetManager?.trim() || undefined,
            ceoOwnerName: extra.ceoOwnerName || lead.ceoOwnerName || req.body.ceoOwnerName?.trim() || undefined,
            phone: fleetPhone,
            altPhone: extra.altPhone || lead.altPhone || undefined,
            email: fleetEmail,
            poaEmail: extra.poaEmail || lead.poaEmail || req.body.poaEmail?.trim() || undefined,
            billingContactName: extra.billingContactName || req.body.billingContactName || undefined,
            paymentTerms: extra.paymentTerms || req.body.paymentTerms || 'NET_30',
            creditLimitCents: extra.creditLimit ? Math.round(Number(extra.creditLimit) * 100) : (extra.creditLimitCents ? Number(extra.creditLimitCents) : null),
            contractTermYears: extra.contractTermYears ? Number(extra.contractTermYears) : (req.body.contractTermYears ? Number(req.body.contractTermYears) : 3),
            contractStartDate: extra.contractStartDate ? new Date(extra.contractStartDate) : new Date(),
            contractEndDate: extra.contractEndDate ? new Date(extra.contractEndDate) : undefined,
            governingProvince: extra.governingProvince || req.body.governingProvince || undefined,
            customerSignatoryName: extra.customerSignatoryName || req.body.customerSignatoryName || undefined,
            customerSignatoryTitle: extra.customerSignatoryTitle || req.body.customerSignatoryTitle || undefined,
            address: extra.address || lead.address,
            website: extra.website || lead.website || undefined,
            numberOfUnits: extra.numberOfUnits ? Number(extra.numberOfUnits) : (lead.numberOfUnits || (req.body.numberOfUnits ? Number(req.body.numberOfUnits) : undefined)),
            countryCode: lead.countryCode,
            status: 'APPROVED',
            discountPercent: req.body.discountPercent ? Number(req.body.discountPercent) : 0,
            contractSignedAt: new Date(),
            convertedFromLeadId: lead.id,
            virtualAssistantId,
            managerUserId: managerUserIdToLink,
          },
        });

        // Enroll vehicles
        const vehicles = extra.vehicles || req.body.vehicles;
        if (Array.isArray(vehicles) && vehicles.length > 0) {
          for (const v of vehicles) {
            if (!v.licensePlate) continue;
            await tx.vehicle.upsert({
              where: {
                countryCode_licensePlate: {
                  countryCode: lead.countryCode,
                  licensePlate: v.licensePlate.trim().toUpperCase(),
                },
              },
              update: {
                fleetId: fleet.id,
                make: v.make || 'Commercial',
                model: v.model || 'Rig',
                year: v.year ? Number(v.year) : new Date().getFullYear(),
                tireSize: v.tireSize || '11R22.5',
                vin: v.vin || undefined,
              },
              create: {
                fleetId: fleet.id,
                countryCode: lead.countryCode,
                licensePlate: v.licensePlate.trim().toUpperCase(),
                make: v.make || 'Commercial',
                model: v.model || 'Rig',
                year: v.year ? Number(v.year) : new Date().getFullYear(),
                tireSize: v.tireSize || '11R22.5',
                vin: v.vin || undefined,
              },
            });
          }
        }

        // Enroll drivers
        const drivers = extra.drivers || req.body.drivers;
        if (Array.isArray(drivers) && drivers.length > 0) {
          for (const d of drivers) {
            if (!d.fullName || !d.phone) continue;
            const phoneValidation = validateAndNormalizePhone(d.phone, lead.countryCode);
            if (!phoneValidation.isValid) continue;
            await tx.fleetDriver.upsert({
              where: {
                fleetId_phone: {
                  fleetId: fleet.id,
                  phone: phoneValidation.normalized,
                },
              },
              update: {
                fullName: d.fullName.trim(),
                licensePlate: d.licensePlate ? d.licensePlate.trim().toUpperCase() : undefined,
              },
              create: {
                fleetId: fleet.id,
                fullName: d.fullName.trim(),
                phone: phoneValidation.normalized,
                licensePlate: d.licensePlate ? d.licensePlate.trim().toUpperCase() : undefined,
              },
            });
          }
        }

        // Mark lead as CONVERTED
        const updatedLead = await tx.lead.update({
          where: { id },
          data: {
            status: 'CONVERTED',
            disposition: 'CONVERTED',
            stage: 'CONVERTED',
          },
        });

        return { fleet, updatedLead };
      });

      sseManager.broadcast(`sse:leads:${lead.countryCode}`, 'lead:updated', result.updatedLead);
      sseManager.broadcast(`sse:leads:${lead.countryCode}`, 'lead:stats_updated', { countryCode: lead.countryCode });

      return sendSuccess(res, {
        fleet: result.fleet,
        lead: result.updatedLead,
        tempCredentials: fleetEmail && rawPass ? { email: fleetEmail, tempPassword: rawPass } : null,
      }, 'Lead successfully converted to Fleet Account');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Create Trial / Test Service Work Order for Lead
   */
  async createTestServiceJob(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const user = (req as any).user;
      const { driverId, description, scheduledDate, tireSizes, unitNumber, location, priceDollars, latitude, longitude } = req.body;

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) return sendError(res, 'Lead not found', 404);

      const country = lead.countryCode;
      const jobCode = `TRIAL-${country}-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
      const priceCents = Math.round(Number(priceDollars || 0) * 100);

      // Resolve or provision vehicle for this test service
      const vehicle = await prisma.vehicle.create({
        data: {
          countryCode: country,
          year: new Date().getFullYear(),
          make: 'Fleet',
          model: 'Prospect Truck',
          tireSize: tireSizes || '11R22.5',
          unitNumber: unitNumber || 'Trial-01',
        },
      });

      let serviceLatitude = latitude !== undefined && latitude !== null ? Number(latitude) : null;
      let serviceLongitude = longitude !== undefined && longitude !== null ? Number(longitude) : null;

      if ((serviceLatitude === null || serviceLongitude === null || isNaN(serviceLatitude) || isNaN(serviceLongitude)) && (location || lead.address)) {
        const geo = await geocodingService.geocodeAddress(location || lead.address, country);
        if (geo.latitude != null && geo.longitude != null) {
          serviceLatitude = geo.latitude;
          serviceLongitude = geo.longitude;
        }
      }

      const job = await prisma.job.create({
        data: {
          jobCode,
          countryCode: country,
          currency: country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : 'CAD',
          createdById: user.id,
          driverId: driverId || null,
          vehicleId: vehicle.id,
          leadId: lead.id,
          isTestService: true,
          recipientName: lead.contactPerson || lead.companyName,
          recipientPhone: lead.phone,
          serviceAddress: location || lead.address || 'Customer Depot',
          serviceLatitude,
          serviceLongitude,
          problemNotes: description || `Trial/Test Service for Fleet Prospect: ${lead.companyName}. Unit: ${unitNumber || 'N/A'}. Tire: ${tireSizes || 'N/A'}`,
          appointmentDate: scheduledDate ? new Date(scheduledDate) : new Date(),
          status: driverId ? 'ASSIGNED' : 'PENDING',
          paymentStatus: priceCents === 0 ? 'VERIFIED_PAID' : 'UNPAID',
          subtotalCents: priceCents,
          totalCents: priceCents,
          itPlatformFeeCents: country === 'CA' ? 150 : 100,
          repairerFeeCents: 0,
        },
      });

      const updatedLead = await prisma.lead.update({
        where: { id },
        data: {
          stage: 'DISPATCHER_REVIEW',
          status: 'CALLED',
          assignedDispatcherId: user.id,
        },
        include: {
          uploadedBy: { select: { id: true, fullName: true, role: true } },
          assignedAgent: { select: { id: true, fullName: true, role: true } },
          assignedDispatcher: { select: { id: true, fullName: true, role: true } },
          testServices: { select: { id: true, jobCode: true, status: true, appointmentDate: true, serviceAddress: true } },
        },
      });

      sseManager.broadcast(`sse:leads:${country}`, 'lead:updated', updatedLead);
      sseManager.broadcast(`sse:leads:${country}`, 'lead:stats_updated', { countryCode: country });
      sseManager.broadcast(`sse:jobs:${country}`, 'job:created', job);

      try {
        const io = getIO();
        io.to(`dispatch:${country}`).emit('lead:updated', updatedLead);
        io.to(`dispatch:${country}`).emit('job:created', job);
      } catch {}

      return sendSuccess(res, { job, lead: updatedLead }, 'Trial service job created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Distribute Leads (Admin / General Manager Control)
   * Even distribution across VAs respecting 1-lead cap
   */
  async distributeLeads(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!['ADMIN', 'GENERAL_MANAGER'].includes(user?.role)) {
        return sendError(res, 'Only Administrators and General Managers can distribute leads', 403);
      }

      const countryCode = (req.body.countryCode as any) || user?.countryCode || 'CA';
      const targetVaIds: string[] = req.body.targetVaIds || [];
      const BATCH_CAP = VA_LEAD_CAP; // 1-lead focus mode

      let vas: any[] = [];
      if (targetVaIds.length > 0) {
        vas = await prisma.user.findMany({
          where: {
            id: { in: targetVaIds },
            deletedAt: null,
          },
        });
      } else {
        vas = await prisma.user.findMany({
          where: {
            role: 'VIRTUAL_ASSISTANT',
            countryCode: countryCode as any,
            deletedAt: null,
          },
        });
      }

      if (vas.length === 0) {
        return sendError(res, 'No Virtual Assistants found for this region to distribute leads to', 400);
      }

      let totalDistributed = 0;
      const distributionSummary: any[] = [];

      for (const va of vas) {
        const assigned = await refillAgentQueueAtomic(va.id, countryCode, BATCH_CAP);
        totalDistributed += assigned;
        distributionSummary.push({
          vaId: va.id,
          vaName: va.fullName,
          assignedNow: assigned,
          totalActive: assigned,
        });
      }

      sseManager.broadcast(`sse:leads:${countryCode}`, 'leads:distributed', {
        totalDistributed,
        vasCount: vas.length,
      });
      sseManager.broadcast(`sse:leads:${countryCode}`, 'lead:stats_updated', { countryCode });

      try {
        const io = getIO();
        io.to(`dispatch:${countryCode}`).emit('leads:distributed', { totalDistributed });
      } catch {}

      return sendSuccess(res, {
        totalDistributed,
        vasCount: vas.length,
        summary: distributionSummary,
      }, `Successfully distributed leads across ${vas.length} VAs (1-lead focus).`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Upload Leads via CSV / Excel (.xlsx, .xls, .csv)
   * Maps all 10 columns, provisions Batch record with immediate vs scheduled activation
   */
  async uploadLeads(req: Request, res: Response) {
    try {
      if (!req.file) {
        return sendError(res, 'No file uploaded. Please upload a .csv, .xlsx, or .xls file.', 400);
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return sendError(res, 'Spreadsheet contains no sheets', 400);
      }

      let chosenSheetName = req.body.sheetName as string;
      if (!chosenSheetName || !workbook.Sheets[chosenSheetName]) {
        const leadSheetKeywords = /outbound|dial|lead|fleet|trucking|verified|master/i;
        const matchingSheet = workbook.SheetNames.find((name) => leadSheetKeywords.test(name));
        if (matchingSheet && workbook.Sheets[matchingSheet]) {
          chosenSheetName = matchingSheet;
        } else {
          for (const sName of workbook.SheetNames) {
            const testRows = XLSX.utils.sheet_to_json(workbook.Sheets[sName], { header: 1 }) as any[];
            if (testRows && testRows.length > 1) {
              chosenSheetName = sName;
              break;
            }
          }
        }
      }

      if (!chosenSheetName || !workbook.Sheets[chosenSheetName]) {
        chosenSheetName = workbook.SheetNames[0];
      }

      const rawRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[chosenSheetName], { defval: '' });
      if (!rawRows || rawRows.length === 0) {
        return sendError(res, `Sheet "${chosenSheetName}" is empty. Please check your spreadsheet data.`, 400);
      }

      const user = (req as any).user;
      const vaUserId = user?.id;
      const targetCountry = (req.body.countryCode as any) || (req as any).countryCode || 'CA';
      const assignedVaId = req.body.assignedVaId || req.body.assignedAgentId || null;
      const batchName = req.body.batchName as string;
      const activationMode = req.body.activationMode || 'IMMEDIATE'; // IMMEDIATE or SCHEDULED
      const scheduledDate = req.body.scheduledDate ? new Date(req.body.scheduledDate) : new Date();

      const leadsToCreate: any[] = [];

      for (const row of rawRows) {
        const normalized: Record<string, any> = {};
        for (const [key, val] of Object.entries(row)) {
          const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          normalized[cleanKey] = val;
        }

        const companyName = 
          normalized['companyname'] || 
          normalized['company'] || 
          normalized['businessname'] || 
          normalized['accountname'] || 
          normalized['account'] || 
          normalized['prospect'] || 
          '';

        const fleetManager = 
          normalized['fleetmanager'] || 
          normalized['fleetmanagername'] || 
          normalized['fm'] || 
          null;

        const ceoOwnerName = 
          normalized['ceoownername'] || 
          normalized['ceoowner'] || 
          normalized['ownerceo'] || 
          normalized['ceo'] || 
          normalized['owner'] || 
          normalized['ownername'] || 
          normalized['dirname'] || 
          null;

        const contactPerson = 
          normalized['contactperson'] || 
          normalized['contactname'] || 
          normalized['contact'] || 
          normalized['fullname'] || 
          normalized['name'] || 
          fleetManager || 
          ceoOwnerName || 
          'Fleet Manager';

        const rawPhone = 
          normalized['contactnumber'] || 
          normalized['phone'] || 
          normalized['phonenumber'] || 
          normalized['telephone'] || 
          normalized['mobile'] || 
          normalized['number'] || 
          normalized['officialno'] || 
          normalized['officialcontact'] || 
          normalized['cell'] || 
          '';

        const altPhone = 
          normalized['alternativecontactno'] || 
          normalized['altphone'] || 
          normalized['alternatephone'] || 
          normalized['secondaryphone'] || 
          normalized['altno'] || 
          normalized['office'] || 
          null;

        const email = 
          normalized['officialemail'] || 
          normalized['email'] || 
          normalized['emailaddress'] || 
          null;

        const poaEmail = 
          normalized['poaemail'] || 
          normalized['poa'] || 
          normalized['accountdept'] || 
          normalized['billingemail'] || 
          normalized['email1'] || 
          normalized['decisionmakeremail'] || 
          null;

        const address = 
          normalized['companyaddress'] || 
          normalized['address'] || 
          normalized['location'] || 
          normalized['serviceaddress'] || 
          normalized['street'] || 
          null;

        const website = 
          normalized['website'] || 
          normalized['websiteurl'] || 
          normalized['web'] || 
          normalized['url'] || 
          null;

        const rawUnits = 
          normalized['nou'] || 
          normalized['numberofunits'] || 
          normalized['units'] || 
          normalized['fleetunits'] || 
          normalized['fleetsize'] || 
          normalized['noofv'] || 
          normalized['trucksvans'] || 
          normalized['trucks'] || 
          null;

        let parsedUnits: number | null = null;
        if (rawUnits !== null && rawUnits !== undefined && String(rawUnits).trim() !== '') {
          const match = String(rawUnits).match(/\d+/);
          if (match) {
            parsedUnits = parseInt(match[0], 10);
          }
        }

        const notes = 
          normalized['notes'] || 
          normalized['comments'] || 
          normalized['commentsbefore'] || 
          normalized['commentsafter'] || 
          normalized['description'] || 
          null;

        let phone = String(rawPhone || '').trim();
        if (rawPhone) {
          const phoneValidation = validateAndNormalizePhone(rawPhone, targetCountry);
          if (phoneValidation.isValid) {
            phone = phoneValidation.normalized;
          }
        }
        const comp = String(companyName || '').trim();

        if (!phone && !comp) continue;

        const uploaderRole = user?.role;
        const isCompanySourced = uploaderRole === 'ADMIN' || uploaderRole === 'GENERAL_MANAGER' || uploaderRole === 'DISPATCHER';

        leadsToCreate.push({
          companyName: comp || contactPerson || 'Prospect Company',
          contactPerson: String(contactPerson || 'Fleet Manager').trim(),
          fleetManager: fleetManager ? String(fleetManager).trim() : null,
          ceoOwnerName: ceoOwnerName ? String(ceoOwnerName).trim() : null,
          phone: phone || '+14165550100',
          altPhone: altPhone ? String(altPhone).trim() : null,
          email: email ? String(email).trim() : null,
          poaEmail: poaEmail ? String(poaEmail).trim() : null,
          address: address ? String(address).trim() : null,
          website: website ? String(website).trim() : null,
          numberOfUnits: parsedUnits,
          notes: notes ? String(notes).trim() : null,
          countryCode: targetCountry,
          status: 'NEW',
          stage: 'VA_OUTREACH',
          uploadedById: vaUserId || null,
          isCompanySourced,
          assignedAgentId: assignedVaId,
          assignmentMethod: assignedVaId ? 'MANUAL' : null,
        });
      }

      if (leadsToCreate.length === 0) {
        return sendError(res, 'No valid lead rows found in file. Please ensure columns include Company, Contact, and Phone.', 400);
      }

      // Wrap batch + lead creation in atomic transaction (PRD AC-1.2, Error 3)
      const { batch, result } = await prisma.$transaction(async (tx) => {
        let activeBatch: any = null;
        const targetBatchId = req.body.batchId as string;
        if (targetBatchId) {
          activeBatch = await tx.batch.findFirst({
            where: { id: targetBatchId, ...getTenantFilter(req) },
          });
          if (activeBatch) {
            const updateData: any = {
              totalLeads: { increment: leadsToCreate.length },
            };
            if (activationMode === 'IMMEDIATE') {
              updateData.status = 'ACTIVE';
              updateData.scheduledDate = new Date();
            }
            activeBatch = await tx.batch.update({
              where: { id: activeBatch.id },
              data: updateData,
            });
          }
        }

        if (!activeBatch) {
          const isScheduled = activationMode === 'SCHEDULED';
          const batchStatus = isScheduled ? 'SCHEDULED' : 'ACTIVE';
          const finalBatchName = batchName?.trim() || `Batch ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

          activeBatch = await tx.batch.create({
            data: {
              batchName: finalBatchName,
              countryCode: targetCountry as any,
              uploadedById: vaUserId,
              totalLeads: leadsToCreate.length,
              scheduledDate,
              status: batchStatus as any,
            },
          });
        }

        const effectiveCountry = activeBatch.countryCode || targetCountry;
        const leadsWithBatch = leadsToCreate.map((l) => ({
          ...l,
          batchId: activeBatch.id,
          countryCode: effectiveCountry,
        }));

        const createdResult = await tx.lead.createMany({
          data: leadsWithBatch,
          skipDuplicates: true,
        });

        return { batch: activeBatch, result: createdResult };
      });

      const effectiveCountry = batch.countryCode || targetCountry;

      // If active immediately, replenish online VAs to 1-lead cap
      if (batch.status === 'ACTIVE') {
        const activeVas = await prisma.user.findMany({
          where: {
            role: { in: ['VIRTUAL_ASSISTANT', 'CALL_AGENT'] },
            countryCode: effectiveCountry as any,
            deletedAt: null,
          },
        });

        for (const va of activeVas) {
          await refillAgentQueueAtomic(va.id, effectiveCountry, VA_LEAD_CAP);
        }
      } else if (batch.status === 'SCHEDULED' && scheduledDate) {
        // Enqueue scheduled release job with pg-boss
        const boss = getQueue();
        if (boss) {
          const delaySeconds = Math.max(0, Math.floor((new Date(scheduledDate).getTime() - Date.now()) / 1000));
          await boss.send(
            QUEUES.BATCH_SCHEDULED_RELEASE,
            { batchId: batch.id },
            {
              startAfter: delaySeconds,
              singletonKey: batch.id,
            }
          );
          logger.info(`[Queue] Scheduled batch ${batch.id} queued in pg-boss with delay ${delaySeconds}s`);
        }
      }

      sseManager.broadcast(`sse:leads:${targetCountry}`, 'lead:uploaded', {
        batchId: batch.id,
        importedCount: result.count,
        status: batch.status,
      });
      sseManager.broadcast(`sse:leads:${targetCountry}`, 'lead:stats_updated', { countryCode: targetCountry });

      return sendSuccess(res, {
        batchId: batch.id,
        batchName: batch.batchName,
        status: batch.status,
        importedCount: result.count,
        skippedCount: rawRows.length - result.count,
        totalRows: rawRows.length,
        sheetUsed: chosenSheetName,
      }, `Successfully imported ${result.count} leads into batch "${batch.batchName}" (${batch.status})`);
    } catch (err: any) {
      return sendError(res, `Failed to process spreadsheet: ${err.message}`, 400);
    }
  },

  /**
   * Start Outbound Campaign Batch (Admin / GM Control)
   * Activates batch and assigns 1 lead to each active online VA via zero-poll Postgres refill
   */
  async startBatch(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!['ADMIN', 'GENERAL_MANAGER'].includes(user?.role)) {
        return sendError(res, 'Only Administrators and General Managers can start batches', 403);
      }

      const batchId = req.params.id || req.body.batchId;
      let targetBatch = null;
      if (batchId) {
        targetBatch = await prisma.batch.findUnique({ where: { id: batchId } });
        if (!targetBatch) return sendError(res, 'Batch not found', 404);
      }

      const countryCode = (req.body.countryCode as any) || targetBatch?.countryCode || (req as any).countryCode || 'CA';

      if (batchId && targetBatch) {

        const unassignedInBatch = await prisma.lead.count({
          where: {
            batchId,
            assignedAgentId: null,
            status: { in: ['NEW', 'CALLED'] },
            stage: 'VA_OUTREACH',
          },
        });

        if (unassignedInBatch === 0) {
          return sendError(res, 'This batch has 0 unassigned leads remaining', 400);
        }

        const updatedBatch = await prisma.batch.updateMany({
          where: { id: batchId, status: { not: 'COMPLETED' }, ...getTenantFilter(req) },
          data: { status: 'ACTIVE', scheduledDate: new Date() },
        });
        if (updatedBatch.count === 0) {
          return sendError(res, 'Batch has already been completed or claimed by another agent', 409);
        }
      }

      const activeVas = await prisma.user.findMany({
        where: {
          role: { in: ['CALL_AGENT', 'VIRTUAL_ASSISTANT'] },
          countryCode: countryCode as any,
          deletedAt: null,
        },
      });

      if (activeVas.length === 0) {
        return sendError(res, 'No Virtual Assistants found for this region to assign leads to.', 400);
      }

      let totalAssigned = 0;
      for (const va of activeVas) {
        const assigned = await refillAgentQueueAtomic(va.id, countryCode, VA_LEAD_CAP, batchId);
        totalAssigned += assigned;
      }

      sseManager.broadcast(`sse:leads:${countryCode}`, 'campaign:batch_started', {
        batchId: batchId || null,
        totalAssigned,
        activeVasCount: activeVas.length,
      });
      sseManager.broadcast(`sse:leads:${countryCode}`, 'lead:stats_updated', { countryCode });

      try {
        const io = getIO();
        io.to(`dispatch:${countryCode}`).emit('campaign:batch_started', {
          batchId: batchId || null,
          totalAssigned,
          vasCount: activeVas.length,
        });
      } catch {}

      return sendSuccess(res, {
        batchId: batchId || null,
        totalAssigned,
        activeVasCount: activeVas.length,
      }, `Batch activated! Assigned 1 lead each to ${activeVas.length} VAs.`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Close / Complete Campaign Batch Early (Admin / GM Control)
   * Sets batch status to COMPLETED and notifies staff
   */
  async closeBatch(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!['ADMIN', 'GENERAL_MANAGER'].includes(user?.role)) {
        return sendError(res, 'Only Administrators and General Managers can close batches', 403);
      }

      const id = String(req.params.id);
      const batch = await prisma.batch.findUnique({ where: { id } });
      if (!batch) return sendError(res, 'Batch not found', 404);

      const updated = await prisma.batch.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });

      sseManager.broadcast(`sse:leads:${batch.countryCode}`, 'batch:completed', {
        batchId: batch.id,
        batchName: batch.batchName,
      });
      sseManager.broadcast(`sse:leads:${batch.countryCode}`, 'lead:stats_updated', { countryCode: batch.countryCode });

      try {
        const io = getIO();
        io.to(`dispatch:${batch.countryCode}`).emit('batch:completed', {
          batchId: batch.id,
          batchName: batch.batchName,
        });
      } catch {}

      return sendSuccess(res, updated, `Batch "${batch.batchName}" marked as COMPLETED`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Revive Outreach Campaign Batch to next pass (Pass 2, 3, 4+)
   * Increments currentPass, resets qualifying leads, resets batch to ACTIVE, and triggers queue refill.
   */
  async reviveBatch(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const isAdminOrGm = ['ADMIN', 'GENERAL_MANAGER'].includes(user?.role);

      const id = String(req.params.id);
      const {
        includeSoftDisqualified = true,
        includeNoAnswerVoicemail = true,
        includeOverdueCallbacks = false,
        includeWrongNumbers = false,
        adminOverride = false,
        maxPasses,
      } = req.body || {};

      const batch = await prisma.batch.findUnique({
        where: { id },
        include: {
          _count: { select: { leads: true } },
        },
      });
      if (!batch) return sendError(res, 'Batch not found', 404);

      // Check max passes limit (default 4) unless adminOverride is supplied by Admin/GM
      const effectiveMaxPasses = maxPasses ? Number(maxPasses) : batch.maxPasses;
      if (batch.currentPass >= effectiveMaxPasses) {
        if (!adminOverride || !isAdminOrGm) {
          return sendError(
            res,
            `Batch has already reached its maximum allowed passes (${batch.currentPass}/${effectiveMaxPasses}). An Administrator or General Manager must provide an override to revive further.`,
            400
          );
        }
      }

      const nextPass = batch.currentPass + 1;

      // Build criteria for leads to revive/recycle into next pass
      const whereConditions: any[] = [];

      // 1. Unresponsive / Voicemail / Soft Disqualified leads
      if (includeSoftDisqualified) {
        whereConditions.push({
          batchId: id,
          status: 'DEAD',
          disqualificationReason: { in: ['UNRESPONSIVE', 'VOICEMAIL', 'NO_ANSWER'] },
        });
      }

      // 2. Unworked or unreached leads from previous pass
      if (includeNoAnswerVoicemail) {
        whereConditions.push({
          batchId: id,
          status: { in: ['CALLED', 'NEW'] },
          disposition: { in: ['NO_ANSWER', 'VOICEMAIL', 'RNC', null] },
        });
      }

      // 3. Overdue callbacks if opted in
      if (includeOverdueCallbacks) {
        whereConditions.push({
          batchId: id,
          status: 'CALLBACK',
          callbackDate: { lt: new Date() },
        });
      }

      // 4. Wrong numbers if explicitly opted in
      if (includeWrongNumbers) {
        whereConditions.push({
          batchId: id,
          status: 'DEAD',
          disqualificationReason: 'WRONG_NUMBER',
        });
      }

      if (whereConditions.length === 0) {
        whereConditions.push({
          batchId: id,
          status: { notIn: ['CONVERTED'] },
        });
      }

      // Execute in ACID transaction
      const result = await prisma.$transaction(async (tx) => {
        const resetResult = await tx.lead.updateMany({
          where: {
            OR: whereConditions,
          },
          data: {
            status: 'NEW',
            stage: 'VA_OUTREACH',
            disposition: null,
            assignedAgentId: null,
            assignmentMethod: null,
            assignedAt: null,
            disqualifiedAtStage: null,
            disqualificationReason: null,
            disqualifiedNotes: null,
          },
        });

        const updatedBatch = await tx.batch.update({
          where: { id },
          data: {
            status: 'ACTIVE',
            currentPass: nextPass,
            maxPasses: effectiveMaxPasses,
            scheduledDate: new Date(),
          },
        });

        return { updatedBatch, resetCount: resetResult.count };
      });

      // Refill queues for active VAs in this country
      const activeVas = await prisma.user.findMany({
        where: {
          role: { in: ['CALL_AGENT', 'VIRTUAL_ASSISTANT'] },
          countryCode: batch.countryCode,
          deletedAt: null,
        },
      });

      for (const va of activeVas) {
        try {
          await refillAgentQueueAtomic(va.id, batch.countryCode, 1, batch.id);
        } catch {}
      }

      sseManager.broadcast(`sse:leads:${batch.countryCode}`, 'batch:revived', {
        batchId: batch.id,
        batchName: batch.batchName,
        currentPass: nextPass,
        maxPasses: effectiveMaxPasses,
        revivedCount: result.resetCount,
      });
      sseManager.broadcast(`sse:leads:${batch.countryCode}`, 'lead:stats_updated', { countryCode: batch.countryCode });

      try {
        const io = getIO();
        io.to(`dispatch:${batch.countryCode}`).emit('batch:revived', {
          batchId: batch.id,
          batchName: batch.batchName,
          currentPass: nextPass,
          maxPasses: effectiveMaxPasses,
          revivedCount: result.resetCount,
        });
      } catch {}

      return sendSuccess(
        res,
        {
          batch: result.updatedBatch,
          revivedCount: result.resetCount,
          currentPass: nextPass,
          maxPasses: effectiveMaxPasses,
        },
        `Batch "${batch.batchName}" successfully revived to Pass ${nextPass}! ${result.resetCount} leads reset and queued.`
      );
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Get Active Queue for VA / Call Agent with 1-Lead Cap Auto-Replenishment
   */
  async getAgentQueue(req: Request, res: Response) {
    try {
      const agentId = (req as any).user?.id;
      if (!agentId) return sendError(res, 'Unauthorized', 401);

      const batchId = (req.query.batchId as string) || undefined;
      let countryCode = (req.query.countryCode as any) || (req as any).countryCode;

      // If batchId is provided, resolve the batch to adopt its countryCode for the queue context
      if (batchId) {
        const targetBatch = await prisma.batch.findUnique({ where: { id: batchId } });
        if (targetBatch?.countryCode) {
          countryCode = targetBatch.countryCode;
        }
      }

      const MAX_ACTIVE = VA_LEAD_CAP; // 1-lead focus mode

      // 1. Fetch scheduled callbacks due
      const now = new Date();
      const scheduledCallbacks = await prisma.lead.findMany({
        where: {
          stage: 'AGENT_CALLBACK',
          status: 'CALLBACK',
          callbackDate: { lte: now },
          OR: [
            { assignedAgentId: agentId },
            { assignedAgentId: null },
          ],
          ...(countryCode ? { countryCode } : {}),
        },
        orderBy: [{ callbackDate: 'asc' }, { createdAt: 'desc' }],
        take: 5,
        include: {
          uploadedBy: { select: { id: true, fullName: true, role: true } },
          batch: { select: { id: true, batchName: true, countryCode: true } },
        },
      });

      // 2. Fetch currently active leads for this agent
      const activeWhere: any = {
        assignedAgentId: agentId,
        stage: 'VA_OUTREACH',
        status: { in: ['NEW', 'CALLED'] },
        OR: [{ disposition: null }],
        ...(batchId ? { batchId } : {}),
      };

      let activeLeads = await prisma.lead.findMany({
        where: activeWhere,
        orderBy: [{ priority: 'desc' }, { numberOfUnits: 'desc' }, { createdAt: 'asc' }],
        take: MAX_ACTIVE,
        include: {
          uploadedBy: { select: { id: true, fullName: true, role: true } },
          batch: { select: { id: true, batchName: true, countryCode: true } },
        },
      });

      if (activeLeads.length < MAX_ACTIVE) {
        const newlyAssigned = await refillAgentQueueAtomic(agentId, countryCode || 'CA', MAX_ACTIVE, batchId);
        if (newlyAssigned > 0) {
          activeLeads = await prisma.lead.findMany({
            where: activeWhere,
            orderBy: [{ priority: 'desc' }, { numberOfUnits: 'desc' }, { createdAt: 'asc' }],
            take: MAX_ACTIVE,
            include: {
              uploadedBy: { select: { id: true, fullName: true, role: true } },
              batch: { select: { id: true, batchName: true, countryCode: true } },
            },
          });
        }
      }

      const unassignedPoolCount = await prisma.lead.count({
        where: {
          assignedAgentId: null,
          stage: 'VA_OUTREACH',
          status: { in: ['NEW', 'CALLED'] },
          ...(batchId ? { batchId } : countryCode ? { countryCode } : {}),
        },
      });

      return sendSuccess(res, {
        leads: activeLeads.slice(0, MAX_ACTIVE),
        scheduledCallbacks,
        activeCount: Math.min(activeLeads.length, MAX_ACTIVE),
        maxCapacity: MAX_ACTIVE,
        unassignedPoolCount,
      });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * Explicitly Claim Next Lead (1-cap focus queue)
   */
  async claimNextLead(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const agentId = user?.id;
      const countryCode = (req.body?.countryCode as string) || (req.query?.countryCode as string) || user?.countryCode || 'CA';
      const batchId = (req.body?.batchId as string) || (req.query?.batchId as string) || undefined;

      const newlyAssignedCount = await refillAgentQueueAtomic(agentId, countryCode, VA_LEAD_CAP, batchId);
      return sendSuccess(res, { newlyAssignedCount }, 'Queue replenished');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Set Lead Call Disposition & Synchronously Trigger Atomic 1-Cap Replenishment
   */
  async setDisposition(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const {
        disposition,
        notes,
        callbackDate,
        callbackDay,
        callbackTime,
        disqualificationReason,
      } = req.body;
      const user = (req as any).user;
      const agentId = user?.id;

      if (!disposition) {
        return sendError(res, 'Disposition is required', 400);
      }

      // RBAC: Only Admin or GM can set CONVERTED
      if (disposition === 'CONVERTED' && !['ADMIN', 'GENERAL_MANAGER'].includes(user?.role)) {
        return sendError(res, 'Only Administrators or General Managers can convert leads to active Fleets', 403);
      }

      const lead = await prisma.lead.findUnique({
        where: { id },
        include: { batch: true },
      });
      if (!lead) return sendError(res, 'Lead not found', 404);

      let newStatus: any = 'CALLED';
      let newStage: any = 'VA_OUTREACH';
      let parsedCallbackDate: Date | null = null;

      const currentPass = lead.batch?.currentPass || 1;
      const attemptNum = (lead.callAttemptsCount || 0) + 1;
      const agentName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'VA Agent';

      const existingHits = Array.isArray(lead.hitHistory) ? (lead.hitHistory as any[]) : [];
      const newHit: any = {
        pass: currentPass,
        attempt: attemptNum,
        disposition,
        notes: notes || '',
        calledAt: new Date().toISOString(),
        agentId: user?.id,
        agentName,
        callbackDate: null,
      };

      const dateStr = new Date().toLocaleString('en-US', { timeZone: 'America/Toronto', hour12: true });
      const newNoteEntry = `[Hit #${attemptNum} (Pass ${currentPass}) | ${disposition} | ${dateStr} | ${agentName}]: ${notes || 'No notes'}`;

      const updateData: any = {
        disposition: disposition as any,
        hitHistory: [...existingHits, newHit],
        notes: lead.notes ? `${lead.notes}\n\n${newNoteEntry}` : newNoteEntry,
      };

      if (disposition === 'CONVERTED') {
        newStatus = 'CONVERTED';
        newStage = 'CONVERTED';
      } else if (disposition === 'CALLBACK') {
        newStatus = 'CALLBACK';
        newStage = 'AGENT_CALLBACK';

        const tz = req.body.callbackTimezone || resolveLeadTimezone({
          countryCode: lead.countryCode,
          phone: lead.phone,
          address: lead.address,
        });

        if (callbackDate) {
          if (typeof callbackDate === 'string' && callbackDate.includes('-') && callbackTime) {
            const dateStr = callbackDate.includes('T') ? callbackDate.split('T')[0] : callbackDate;
            const timeParts = String(callbackTime).match(/(\d{1,2}):(\d{2})/);
            if (timeParts) {
              let hour = parseInt(timeParts[1], 10);
              const minute = parseInt(timeParts[2], 10);
              if (/pm/i.test(callbackTime) && hour < 12) hour += 12;
              if (/am/i.test(callbackTime) && hour === 12) hour = 0;
              parsedCallbackDate = zonedWallTimeToUtc(dateStr, hour, minute, tz);
            } else {
              parsedCallbackDate = new Date(callbackDate);
            }
          } else {
            parsedCallbackDate = new Date(callbackDate);
          }
        } else {
          parsedCallbackDate = new Date(Date.now() + 24 * 3600 * 1000);
        }

        updateData.callbackDate = parsedCallbackDate;
        updateData.callbackDay = callbackDay || undefined;
        updateData.callbackTime = callbackTime || undefined;
        newHit.callbackDate = parsedCallbackDate ? parsedCallbackDate.toISOString() : null;
        updateData.hitHistory = [...existingHits, newHit];
        // Keep unassigned in Callback Pool until callbackDate arrives (lastCalledByVaId stores sticky VA)
        const isFutureCallback = parsedCallbackDate && parsedCallbackDate.getTime() > Date.now();
        updateData.assignedAgentId = isFutureCallback ? null : (agentId || lead.assignedAgentId || null);
      } else if (disposition === 'INTERESTED' || disposition === 'WARM_TRANSFER') {
        newStatus = 'CALLED';
        newStage = 'DISPATCHER_REVIEW';
        updateData.assignedAgentId = null; // Handed off to Dispatcher
      } else if (disposition === 'RNC') {
        // Immediate 1-strike kill for Ring No Contact
        newStatus = 'DEAD';
        newStage = 'DISQUALIFIED';
        updateData.disqualifiedAtStage = lead.stage || 'VA_OUTREACH';
        updateData.disqualificationReason = 'UNRESPONSIVE';
        updateData.disqualifiedNotes = 'Ring No Contact (Dead line / continuous ringing) - Disqualified on 1st attempt';
        updateData.assignedAgentId = null;
      } else if (['NO_ANSWER', 'VOICEMAIL'].includes(disposition)) {
        const newAttempts = (lead.callAttemptsCount || 0) + 1;
        if (lead.stage === 'AGENT_CALLBACK') {
          // Callback follow-up: up to 5 attempts before disqualification
          if (newAttempts >= 5) {
            newStatus = 'DEAD';
            newStage = 'DISQUALIFIED';
            updateData.disqualifiedAtStage = 'AGENT_CALLBACK';
            updateData.disqualificationReason = 'UNRESPONSIVE';
            updateData.disqualifiedNotes = `Auto-disqualified after 5 failed callback attempts (${disposition})`;
            updateData.assignedAgentId = null;
          } else {
            // Reschedule callback +2 hours
            newStatus = 'CALLBACK';
            newStage = 'AGENT_CALLBACK';
            parsedCallbackDate = new Date(Date.now() + 2 * 3600 * 1000);
            updateData.callbackDate = parsedCallbackDate;
            updateData.assignedAgentId = agentId || lead.assignedAgentId || null;
          }
        } else {
          // Standard cold outreach: up to 3 attempts
          if (newAttempts >= 3) {
            newStatus = 'DEAD';
            newStage = 'DISQUALIFIED';
            updateData.disqualifiedAtStage = 'VA_OUTREACH';
            updateData.disqualificationReason = 'UNRESPONSIVE';
            updateData.disqualifiedNotes = `Auto-disqualified after 3 failed call attempts (${disposition})`;
            updateData.assignedAgentId = null;
          } else {
            newStatus = 'CALLED';
            newStage = 'VA_OUTREACH';
            updateData.assignedAgentId = null; // Recycled back to unassigned pool
          }
        }
      } else if (['NOT_INTERESTED', 'WRONG_NUMBER'].includes(disposition)) {
        newStatus = 'DEAD';
        newStage = 'DISQUALIFIED';
        updateData.disqualifiedAtStage = lead.stage || 'VA_OUTREACH';
        updateData.disqualificationReason = disqualificationReason || (disposition === 'WRONG_NUMBER' ? 'WRONG_NUMBER' : 'NOT_INTERESTED');
        updateData.disqualifiedNotes = notes || null;
        updateData.assignedAgentId = null;
      } else if (disposition === 'DNC' || disposition === 'DO_NOT_CALL' || disposition === 'RNC') {
        newStatus = 'DEAD';
        newStage = 'DISQUALIFIED';
        updateData.disqualifiedAtStage = lead.stage || 'VA_OUTREACH';
        updateData.disqualificationReason = 'NOT_INTERESTED';
        updateData.disqualifiedNotes = notes || 'Global Do Not Call requested';
        updateData.assignedAgentId = null;
        // Global DNC desynchronization fix: block all duplicate phone entries across all batches
        await prisma.lead.updateMany({
          where: { phone: lead.phone },
          data: {
            status: 'DEAD',
            disposition: 'RNC',
            stage: 'DISQUALIFIED',
            assignedAgentId: null,
            disqualificationReason: 'NOT_INTERESTED',
            disqualifiedNotes: notes || 'Global Do Not Call requested',
          },
        });
      }

      updateData.status = newStatus;
      updateData.stage = newStage;

      if (agentId) {
        updateData.lastCalledByVaId = agentId;
        updateData.lastCalledAt = new Date();
        updateData.callAttemptsCount = { increment: 1 };
      }

      const updated = await prisma.lead.update({
        where: { id },
        data: updateData,
        include: {
          uploadedBy: { select: { id: true, fullName: true, role: true } },
          assignedAgent: { select: { id: true, fullName: true, role: true } },
          assignedDispatcher: { select: { id: true, fullName: true, role: true } },
          lastCalledByVa: { select: { id: true, fullName: true, role: true } },
        },
      });

      // Enqueue delayed callback trigger if scheduled in the future
      if (parsedCallbackDate && parsedCallbackDate.getTime() > Date.now()) {
        const boss = getQueue();
        if (boss) {
          try {
            await boss.send(
              QUEUES.CALLBACK_DUE_TRIGGER,
              {
                leadId: updated.id,
                preferredAgentId: agentId || lead.lastCalledByVaId || lead.assignedAgentId || undefined,
              },
              { startAfter: parsedCallbackDate }
            );
          } catch (qErr) {
            logger.warn(`[Disposition] Could not enqueue callback due trigger:`, qErr);
          }
        }
      }

      // Synchronously execute atomic refill for VA (1-lead cap, zero polling)
      if (agentId) {
        await refillAgentQueueAtomic(agentId, updated.countryCode, VA_LEAD_CAP, updated.batchId || undefined);
      }
      await checkAndCompleteBatches(updated.countryCode);

      // Realtime notification via SSE & Socket.io
      sseManager.broadcast(`sse:leads:${updated.countryCode}`, 'lead:updated', updated);
      sseManager.broadcast(`sse:leads:${updated.countryCode}`, 'lead:stats_updated', { countryCode: updated.countryCode });

      try {
        const io = getIO();
        io.to(`dispatch:${updated.countryCode}`).emit('lead:updated', updated);
      } catch {}

      return sendSuccess(res, { lead: updated }, 'Disposition logged successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Assign Batch Leads to Agent (Management Only)
   */
  async assignBatch(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { assignedToId, agentId } = req.body;
      const targetAgentId = assignedToId || agentId;
      if (!targetAgentId) return sendError(res, 'Agent ID (assignedToId) is required', 400);

      const batch = await prisma.batch.findFirst({
        where: { id, ...getTenantFilter(req) },
      });
      if (!batch) return sendError(res, 'Batch not found', 404);

      const updated = await prisma.lead.updateMany({
        where: {
          batchId: id,
          assignedAgentId: null,
          status: { in: ['NEW', 'CALLED'] },
          stage: 'VA_OUTREACH',
        },
        data: {
          assignedAgentId: targetAgentId,
          assignmentMethod: 'MANUAL',
          assignedAt: new Date(),
        },
      });

      return sendSuccess(res, { assignedCount: updated.count }, 'Batch successfully assigned to agent');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Delete Batch and Unlink Leads (Management Only)
   */
  async deleteBatch(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const batch = await prisma.batch.findFirst({
        where: { id, ...getTenantFilter(req) },
      });
      if (!batch) return sendError(res, 'Batch not found', 404);

      await prisma.$transaction(async (tx) => {
        await tx.lead.updateMany({
          where: { batchId: id },
          data: { batchId: null },
        });
        await tx.batch.delete({
          where: { id },
        });
      });

      return sendSuccess(res, { deleted: true }, 'Batch successfully deleted');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },
};

export default leadController;
