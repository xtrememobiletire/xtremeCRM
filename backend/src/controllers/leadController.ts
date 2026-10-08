import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { prisma } from '../config/database.js';
import {
  sendSuccess,
  sendError,
  sanitizePaginationParams,
  calculateSkip,
  createPaginatedResponse,
} from '../utils/index.js';
import { getIO } from '../config/socket.js';
import { triggerVaReplenish } from '../services/queueService.js';
import { sseManager } from '../services/sseManager.js';

export const leadController = {
  /**
   * Get Real-time Lead Stats & VA Workload for Command Center (Admin / GM)
   */
  async getLeadStats(req: Request, res: Response) {
    try {
      const countryCode = (req.query.countryCode as any) || (req as any).countryCode;
      const whereBase: any = countryCode ? { countryCode } : {};

      const [
        total,
        unassigned,
        inProgress,
        dispatcherReview,
        testService,
        adminApproval,
        converted,
        disqualified,
        vaWorkloads,
      ] = await Promise.all([
        prisma.lead.count({ where: whereBase }),
        prisma.lead.count({
          where: {
            ...whereBase,
            assignedAgentId: null,
            stage: 'VA_OUTREACH',
            status: 'NEW',
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
            stage: 'TEST_SERVICE',
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
            status: 'DISQUALIFIED',
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
                status: { in: ['NEW', 'CALLED'] },
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

      const countryCode = (req.query.countryCode as any) || (req as any).countryCode;
      const status = req.query.status as any;
      const disposition = req.query.disposition as any;
      const search = req.query.search as string;
      const assignedAgentId = req.query.assignedAgentId as string;
      const pool = req.query.pool as string;
      const stage = req.query.stage as any;
      const priority = req.query.priority ? Number(req.query.priority) : undefined;

      const user = (req as any).user;
      const where: any = {};
      if (countryCode) where.countryCode = countryCode;
      if (status) where.status = status;
      if (disposition) where.disposition = disposition;
      if (priority !== undefined) where.priority = priority;

      // Pool filtering logic
      if (pool === 'va') {
        where.stage = 'VA_OUTREACH';
        if (user?.role === 'VIRTUAL_ASSISTANT') {
          where.assignedAgentId = user.id;
        } else if (assignedAgentId) {
          where.assignedAgentId = assignedAgentId;
        }
      } else if (pool === 'callbacks') {
        where.stage = 'AGENT_CALLBACK';
      } else if (pool === 'dispatcher') {
        where.stage = 'DISPATCHER_REVIEW';
      } else if (pool === 'disqualified') {
        where.stage = 'DISQUALIFIED';
      } else if (stage) {
        where.stage = stage;
      } else if (assignedAgentId) {
        where.assignedAgentId = assignedAgentId;
      }

      if (search && search.trim()) {
        const query = search.trim();
        where.OR = [
          { companyName: { contains: query, mode: 'insensitive' } },
          { contactPerson: { contains: query, mode: 'insensitive' } },
          { fleetManager: { contains: query, mode: 'insensitive' } },
          { ceoOwnerName: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { altPhone: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { poaEmail: { contains: query, mode: 'insensitive' } },
        ];
      }

      // Dynamic sorting based on pool
      let orderBy: any[] = [{ createdAt: 'desc' }];
      if (pool === 'callbacks') {
        orderBy = [{ callbackDate: 'asc' }, { createdAt: 'desc' }];
      } else if (pool === 'va') {
        orderBy = [{ priority: 'desc' }, { status: 'asc' }, { createdAt: 'desc' }];
      }

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          skip,
          take: limit,
          orderBy,
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
              select: { id: true, jobCode: true, status: true, appointmentDate: true },
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
      const lead = await prisma.lead.findUnique({
        where: { id },
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
      const {
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
      } = req.body;

      const data: any = {};
      if (status !== undefined) data.status = status;
      if (stage !== undefined) data.stage = stage;
      if (disposition !== undefined) data.disposition = disposition;
      if (notes !== undefined) data.notes = notes;
      if (priority !== undefined) data.priority = Number(priority);
      if (assignedAgentId !== undefined) data.assignedAgentId = assignedAgentId;
      if (assignedDispatcherId !== undefined) data.assignedDispatcherId = assignedDispatcherId;
      if (whatsappFollowUp !== undefined) data.whatsappFollowUp = whatsappFollowUp;
      if (whatsappNotes !== undefined) data.whatsappNotes = whatsappNotes;
      if (vehicleTypes !== undefined) data.vehicleTypes = vehicleTypes;
      if (commonTireSizes !== undefined) data.commonTireSizes = commonTireSizes;

      const updated = await prisma.lead.update({
        where: { id },
        data,
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

      return sendSuccess(res, updated, 'Lead updated');
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
      const { stage, assignedDispatcherId, notes, vehicleTypes, commonTireSizes } = req.body;

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) return sendError(res, 'Lead not found', 404);

      const updateData: any = {
        stage,
        updatedAt: new Date(),
      };

      if (assignedDispatcherId !== undefined) updateData.assignedDispatcherId = assignedDispatcherId;
      if (notes !== undefined) updateData.notes = notes;
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
      const { reason, notes } = req.body;

      if (!reason) {
        return sendError(res, 'Disqualification reason is required', 400);
      }

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) return sendError(res, 'Lead not found', 404);

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
        triggerVaReplenish(lead.assignedAgentId, lead.countryCode).catch(() => {});
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
        triggerVaReplenish(agent.id, lead.countryCode).catch(() => {});
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
      const id = String(req.params.id);
      const { customFleetCode } = req.body;

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) return sendError(res, 'Lead not found', 404);

      const fleetCode = customFleetCode || `XMT-${Math.floor(1000 + Math.random() * 9000)}`;

      // Create new Fleet linked to Lead and VA for commission
      const fleet = await prisma.fleet.create({
        data: {
          fleetCode,
          name: lead.companyName,
          contactPerson: lead.contactPerson,
          fleetManager: lead.fleetManager || req.body.fleetManager?.trim() || undefined,
          ceoOwnerName: lead.ceoOwnerName || req.body.ceoOwnerName?.trim() || undefined,
          phone: lead.phone,
          altPhone: lead.altPhone || undefined,
          email: lead.email,
          poaEmail: lead.poaEmail || req.body.poaEmail?.trim() || undefined,
          address: lead.address,
          website: lead.website || undefined,
          numberOfUnits: lead.numberOfUnits || (req.body.numberOfUnits ? Number(req.body.numberOfUnits) : undefined),
          countryCode: lead.countryCode,
          status: 'APPROVED',
          discountPercent: req.body.discountPercent ? Number(req.body.discountPercent) : 0,
          contractSignedAt: new Date(),
          convertedFromLeadId: lead.id,
          virtualAssistantId: lead.lastCalledByVaId || lead.assignedAgentId || (!lead.isCompanySourced && lead.uploadedById ? lead.uploadedById : undefined),
        },
      });

      // Mark lead as CONVERTED
      const updatedLead = await prisma.lead.update({
        where: { id },
        data: {
          status: 'CONVERTED',
          disposition: 'CONVERTED',
          stage: 'CONVERTED',
        },
      });

      sseManager.broadcast(`sse:leads:${lead.countryCode}`, 'lead:updated', updatedLead);
      sseManager.broadcast(`sse:leads:${lead.countryCode}`, 'lead:stats_updated', { countryCode: lead.countryCode });

      return sendSuccess(res, { fleet, lead: updatedLead }, 'Lead successfully converted to Fleet Account');
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
      const { driverId, description, scheduledDate, tireSizes, unitNumber, location, priceDollars } = req.body;

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
   * Even distribution across VAs respecting 5-lead cap
   */
  async distributeLeads(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!['ADMIN', 'GENERAL_MANAGER'].includes(user?.role)) {
        return sendError(res, 'Only Administrators and General Managers can distribute leads', 403);
      }

      const countryCode = (req.body.countryCode as any) || user?.countryCode || 'CA';
      const targetVaIds: string[] = req.body.targetVaIds || [];
      const BATCH_CAP = 5;

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
        const activeCount = await prisma.lead.count({
          where: {
            assignedAgentId: va.id,
            stage: 'VA_OUTREACH',
            status: { in: ['NEW', 'CALLED'] },
          },
        });

        const slotsNeeded = Math.max(0, BATCH_CAP - activeCount);
        if (slotsNeeded > 0) {
          const unassigned = await prisma.lead.findMany({
            where: {
              assignedAgentId: null,
              stage: 'VA_OUTREACH',
              status: 'NEW',
              countryCode: countryCode as any,
            },
            orderBy: [
              { priority: 'desc' },
              { createdAt: 'asc' },
            ],
            take: slotsNeeded,
          });

          if (unassigned.length > 0) {
            const ids = unassigned.map((l) => l.id);
            await prisma.lead.updateMany({
              where: { id: { in: ids } },
              data: {
                assignedAgentId: va.id,
                assignmentMethod: 'MANUAL',
                assignedById: user.id,
                assignedAt: new Date(),
              },
            });
            totalDistributed += unassigned.length;
          }

          distributionSummary.push({
            vaId: va.id,
            vaName: va.fullName,
            previousCount: activeCount,
            assignedCount: unassigned.length,
            totalActive: activeCount + unassigned.length,
          });
        } else {
          distributionSummary.push({
            vaId: va.id,
            vaName: va.fullName,
            previousCount: activeCount,
            assignedCount: 0,
            totalActive: activeCount,
          });
        }
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
      }, `Successfully distributed ${totalDistributed} leads across ${vas.length} VAs`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Upload Leads via CSV / Excel (.xlsx, .xls, .csv)
   * Maps all 10 sample columns: Company, Address, Website, Fleet Manager, CEO/Owner, Phone, Alt Phone, Email, POA Email, Units
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

      const vaUserId = (req as any).user?.id;
      const targetCountry = (req.body.countryCode as any) || (req as any).countryCode || 'CA';
      const assignedVaId = req.body.assignedVaId || req.body.assignedAgentId || null;

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

        const phone = String(rawPhone || '').trim();
        const comp = String(companyName || '').trim();

        if (!phone && !comp) continue;

        const uploaderRole = (req as any).user?.role;
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

      const result = await prisma.lead.createMany({
        data: leadsToCreate,
      });

      sseManager.broadcast(`sse:leads:${targetCountry}`, 'lead:uploaded', {
        importedCount: result.count,
      });
      sseManager.broadcast(`sse:leads:${targetCountry}`, 'lead:stats_updated', { countryCode: targetCountry });

      return sendSuccess(res, {
        importedCount: result.count,
        totalRows: rawRows.length,
        sheetUsed: chosenSheetName,
      }, `Successfully imported ${result.count} leads from "${chosenSheetName}"`);
    } catch (err: any) {
      return sendError(res, `Failed to process spreadsheet: ${err.message}`, 400);
    }
  },

  /**
   * Start Outbound Campaign Batch (Admin Control - PRD FR-9.2)
   */
  async startBatch(req: Request, res: Response) {
    try {
      const countryCode = (req.body.countryCode as any) || (req as any).countryCode || 'CA';
      const BATCH_CAP = 5;

      const activeAgents = await prisma.user.findMany({
        where: {
          role: { in: ['CALL_AGENT', 'VIRTUAL_ASSISTANT'] },
          countryCode: countryCode as any,
          deletedAt: null,
        },
      });

      if (activeAgents.length === 0) {
        return sendError(res, 'No Call Agents or VAs found for this region to assign leads to.', 400);
      }

      const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;
      let totalAssigned = 0;
      const agentSummary: any[] = [];

      for (const agent of activeAgents) {
        const activeCount = await prisma.lead.count({
          where: {
            assignedAgentId: agent.id,
            status: { in: ['NEW', 'CALLED'] },
            OR: [{ disposition: null }],
          },
        });

        const slotsNeeded = Math.max(0, BATCH_CAP - activeCount);
        if (slotsNeeded > 0) {
          const unassigned = await prisma.lead.findMany({
            where: {
              assignedAgentId: null,
              status: 'NEW',
              countryCode: countryCode as any,
            },
            take: slotsNeeded,
            orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
          });

          if (unassigned.length > 0) {
            const ids = unassigned.map((l) => l.id);
            await prisma.lead.updateMany({
              where: { id: { in: ids } },
              data: {
                assignedAgentId: agent.id,
                batchId,
              },
            });
            totalAssigned += unassigned.length;
          }

          agentSummary.push({
            agentId: agent.id,
            agentName: agent.fullName,
            previousActive: activeCount,
            assignedNow: unassigned.length,
            totalActive: activeCount + unassigned.length,
          });
        } else {
          agentSummary.push({
            agentId: agent.id,
            agentName: agent.fullName,
            previousActive: activeCount,
            assignedNow: 0,
            totalActive: activeCount,
          });
        }
      }

      sseManager.broadcast(`sse:leads:${countryCode}`, 'campaign:batch_started', {
        batchId,
        totalAssigned,
      });
      sseManager.broadcast(`sse:leads:${countryCode}`, 'lead:stats_updated', { countryCode });

      try {
        const io = getIO();
        io.to(`dispatch:${countryCode}`).emit('campaign:batch_started', {
          batchId,
          totalAssigned,
          agentsCount: activeAgents.length,
        });
      } catch {}

      return sendSuccess(res, {
        batchId,
        totalAssigned,
        agentsCount: activeAgents.length,
        agentSummary,
      }, `Campaign batch started! ${totalAssigned} leads assigned across ${activeAgents.length} agents (5-cap).`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Get Active Queue for VA / Call Agent with 5-cap Auto-Replenishment (PRD FR-9.2, FR-9.5)
   */
  async getAgentQueue(req: Request, res: Response) {
    try {
      const agentId = (req as any).user?.id;
      if (!agentId) return sendError(res, 'Unauthorized', 401);

      const countryCode = (req.query.countryCode as any) || (req as any).countryCode;
      const MAX_ACTIVE = 5;

      // 1. Fetch scheduled callbacks due
      const now = new Date();
      const scheduledCallbacks = await prisma.lead.findMany({
        where: {
          stage: 'AGENT_CALLBACK',
          OR: [
            { assignedAgentId: agentId },
            { assignedAgentId: null, callbackDate: { lte: now } },
          ],
          ...(countryCode ? { countryCode } : {}),
        },
        orderBy: [{ callbackDate: 'asc' }, { createdAt: 'asc' }],
        take: 5,
        include: {
          uploadedBy: { select: { id: true, fullName: true, role: true } },
        },
      });

      // 2. Fetch currently active leads for this agent
      const activeLeads = await prisma.lead.findMany({
        where: {
          assignedAgentId: agentId,
          stage: 'VA_OUTREACH',
          status: { in: ['NEW', 'CALLED'] },
          OR: [{ disposition: null }],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        include: {
          uploadedBy: { select: { id: true, fullName: true, role: true } },
        },
      });

      const currentCount = activeLeads.length;
      let newlyAssignedCount = 0;

      const userRole = (req as any).user?.role;
      const isProspectiveAgent = ['VIRTUAL_ASSISTANT', 'CALL_AGENT'].includes(userRole);

      // 3. Auto-replenish up to 5 cap (restricted to prospecting staff to prevent lead theft by Admin/GM)
      if (isProspectiveAgent && currentCount < MAX_ACTIVE) {
        const slotsNeeded = MAX_ACTIVE - currentCount;

        const unassignedLeads = await prisma.lead.findMany({
          where: {
            assignedAgentId: null,
            stage: 'VA_OUTREACH',
            status: 'NEW',
            ...(countryCode ? { countryCode } : {}),
          },
          take: slotsNeeded,
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
          include: {
            uploadedBy: { select: { id: true, fullName: true, role: true } },
          },
        });

        if (unassignedLeads.length > 0) {
          const leadIds = unassignedLeads.map((l) => l.id);
          await prisma.lead.updateMany({
            where: { id: { in: leadIds } },
            data: {
              assignedAgentId: agentId,
              assignmentMethod: 'AUTO_ASSIGN',
              assignedAt: new Date(),
            },
          });

          activeLeads.push(...unassignedLeads);
          newlyAssignedCount = unassignedLeads.length;
        }
      }

      const unassignedPoolCount = await prisma.lead.count({
        where: {
          assignedAgentId: null,
          stage: 'VA_OUTREACH',
          status: 'NEW',
          ...(countryCode ? { countryCode } : {}),
        },
      });

      return sendSuccess(res, {
        leads: activeLeads.slice(0, MAX_ACTIVE),
        scheduledCallbacks,
        activeCount: Math.min(activeLeads.length, MAX_ACTIVE),
        maxCapacity: MAX_ACTIVE,
        newlyAssignedCount,
        unassignedPoolCount,
      });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * Set Lead Call Disposition (FR-9.4) & Trigger pg-boss 5-Cap Replenishment
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
      const agentId = (req as any).user?.id;

      if (!disposition) {
        return sendError(res, 'Disposition is required', 400);
      }

      let newStatus: any = 'CALLED';
      let newStage: any = 'VA_OUTREACH';

      if (disposition === 'CONVERTED') {
        newStatus = 'CONVERTED';
        newStage = 'CONVERTED';
      } else if (disposition === 'CALLBACK') {
        newStatus = 'CALLBACK';
        newStage = 'AGENT_CALLBACK';
      } else if (disposition === 'INTERESTED' || disposition === 'WARM_TRANSFER') {
        newStatus = 'CALLED';
        newStage = 'DISPATCHER_REVIEW';
      } else if (['NOT_INTERESTED', 'WRONG_NUMBER'].includes(disposition)) {
        newStatus = 'DEAD';
        newStage = 'DISQUALIFIED';
      }

      const updateData: any = {
        disposition: disposition as any,
        notes: notes || undefined,
        status: newStatus,
        stage: newStage,
      };

      if (disposition === 'CALLBACK') {
        updateData.callbackDate = callbackDate ? new Date(callbackDate) : new Date(Date.now() + 24 * 3600 * 1000);
        updateData.callbackDay = callbackDay || undefined;
        updateData.callbackTime = callbackTime || undefined;
        updateData.assignedAgentId = null; // Released to callbacks pool
      } else if (newStage === 'DISQUALIFIED') {
        updateData.disqualifiedAtStage = 'VA_OUTREACH';
        updateData.disqualificationReason = disqualificationReason || (disposition === 'WRONG_NUMBER' ? 'WRONG_NUMBER' : 'NOT_INTERESTED');
        updateData.disqualifiedNotes = notes || null;
        updateData.assignedAgentId = null; // Freed from VA queue
      } else if (newStage === 'DISPATCHER_REVIEW') {
        updateData.assignedAgentId = null; // Handed off to Dispatcher
      }

      if (agentId) {
        updateData.lastCalledByVaId = agentId;
        updateData.lastCalledAt = new Date();
        updateData.callAttemptsCount = { increment: 1 };
      }

      const updated = await prisma.lead.update({
        where: { id },
        data: updateData,
        include: {
          uploadedBy: { select: { id: true, fullName: true } },
          assignedAgent: { select: { id: true, fullName: true } },
          assignedDispatcher: { select: { id: true, fullName: true } },
        },
      });

      // Trigger pg-boss auto-replenishment for the VA (-1 active slot -> +1 fresh lead)
      if (agentId) {
        triggerVaReplenish(agentId, updated.countryCode).catch(() => {});
      }

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
};

export default leadController;
