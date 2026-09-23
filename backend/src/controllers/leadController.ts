import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import {
  sendSuccess,
  sendError,
  sanitizePaginationParams,
  calculateSkip,
  createPaginatedResponse,
} from '../utils/index.js';
import { getIO } from '../config/socket.js';

export const leadController = {
  /**
   * List Outbound Leads with filtering and pagination
   */
  async getLeads(req: Request, res: Response) {
    try {
      const pageParam = req.query.page ? Number(req.query.page) : 1;
      const limitParam = req.query.limit ? Number(req.query.limit) : 25;
      const { page, limit } = sanitizePaginationParams(pageParam, limitParam);
      const skip = calculateSkip(page, limit);

      const countryCode = (req.query.countryCode as any) || req.countryCode;
      const status = req.query.status as any;
      const disposition = req.query.disposition as any;
      const search = req.query.search as string;
      const assignedAgentId = req.query.assignedAgentId as string;

      const where: any = {};
      if (countryCode) where.countryCode = countryCode;
      if (status) where.status = status;
      if (disposition) where.disposition = disposition;
      if (assignedAgentId) where.assignedAgentId = assignedAgentId;

      if (search && search.trim()) {
        const query = search.trim();
        where.OR = [
          { companyName: { contains: query, mode: 'insensitive' } },
          { contactPerson: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ];
      }

      // If user is a Call Agent, and not Admin/Dispatcher, can filter to assigned or all outbound
      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { status: 'asc' }, // NEW / CALLED first
            { createdAt: 'desc' },
          ],
          include: {
            uploadedByVa: {
              select: { id: true, fullName: true, role: true },
            },
            assignedAgent: {
              select: { id: true, fullName: true, role: true },
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
          uploadedByVa: {
            select: { id: true, fullName: true, role: true },
          },
          assignedAgent: {
            select: { id: true, fullName: true, role: true },
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
   * Create a new Lead (pushed by VA or Agent)
   */
  async createLead(req: Request, res: Response) {
    try {
      const {
        companyName,
        contactPerson,
        phone,
        altPhone,
        email,
        address,
        website,
        numberOfUnits,
        countryCode = 'CA',
        notes,
        assignedAgentId,
      } = req.body;

      if (!companyName || !contactPerson || !phone) {
        return sendError(res, 'Company name, contact person, and phone number are required', 400);
      }

      const user = req.user as any;
      const uploadedByVaId = user?.id;

      // Duplicate check (PRD FR-9.1)
      const existing = await prisma.lead.findFirst({
        where: {
          phone: phone.trim(),
          countryCode: countryCode as any,
        },
      });

      const lead = await prisma.lead.create({
        data: {
          companyName: companyName.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          altPhone: altPhone?.trim() || null,
          email: email?.trim() || null,
          address: address?.trim() || null,
          website: website?.trim() || null,
          numberOfUnits: numberOfUnits ? Number(numberOfUnits) : null,
          countryCode: countryCode as any,
          notes: notes?.trim() || null,
          uploadedByVaId,
          assignedAgentId: assignedAgentId || null,
          status: 'NEW',
        },
        include: {
          uploadedByVa: {
            select: { id: true, fullName: true, role: true },
          },
        },
      });

      // Emit event to update live outbound queue
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
   * Update lead status, disposition, notes, or WhatsApp followup
   */
  async updateLead(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const {
        status,
        disposition,
        notes,
        whatsappFollowUp,
        whatsappNotes,
        assignedAgentId,
      } = req.body;

      const data: any = {};
      if (status !== undefined) data.status = status;
      if (disposition !== undefined) data.disposition = disposition;
      if (notes !== undefined) data.notes = notes;
      if (whatsappFollowUp !== undefined) data.whatsappFollowUp = whatsappFollowUp;
      if (whatsappNotes !== undefined) data.whatsappNotes = whatsappNotes;
      if (assignedAgentId !== undefined) data.assignedAgentId = assignedAgentId;

      const updated = await prisma.lead.update({
        where: { id },
        data,
        include: {
          uploadedByVa: {
            select: { id: true, fullName: true, role: true },
          },
          assignedAgent: {
            select: { id: true, fullName: true, role: true },
          },
        },
      });

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
          transferredToDm: true,
          transferredToDmAt: new Date(),
          status: 'CALLED',
          notes: transferNotes ? `${lead.notes ? lead.notes + '\n' : ''}[Transfer Note from ${agent?.fullName || 'Agent'}]: ${transferNotes}` : lead.notes,
        },
        include: {
          uploadedByVa: {
            select: { id: true, fullName: true, role: true },
          },
        },
      });

      // Emit warm transfer event to Dispatcher Manager / Admin
      try {
        const io = getIO();
        const transferPayload = {
          transferType: 'OUTBOUND_LEAD',
          callId: callId || `call-${Date.now()}`,
          leadId: lead.id,
          companyName: lead.companyName,
          contactPerson: lead.contactPerson,
          phone: lead.phone,
          numberOfUnits: lead.numberOfUnits,
          notes: transferNotes || lead.notes,
          transferringAgent: agent?.fullName || 'Call Agent',
          countryCode: lead.countryCode,
          timestamp: new Date().toISOString(),
        };

        io.to(`dispatch:${lead.countryCode}`).emit('call:transfer', transferPayload);
        io.to('role:DISPATCHER').emit('call:transfer', transferPayload);
        io.to('role:ADMIN').emit('call:transfer', transferPayload);
      } catch {}

      return sendSuccess(res, updated, 'Lead transferred to Dispatcher Manager');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Convert Lead to Fleet Account (FR-9.6 / FR-9.7)
   */
  async convertToFleet(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { customFleetCode } = req.body;

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) return sendError(res, 'Lead not found', 404);

      const fleetCode = customFleetCode || `XMT-${Math.floor(1000 + Math.random() * 9000)}`;

      // Create new Fleet linked to VA for commission
      const fleet = await prisma.fleet.create({
        data: {
          fleetCode,
          name: lead.companyName,
          contactPerson: lead.contactPerson,
          phone: lead.phone,
          email: lead.email,
          address: lead.address,
          website: lead.website,
          countryCode: lead.countryCode,
          status: 'APPROVED',
          contractSignedAt: new Date(),
          virtualAssistantId: lead.uploadedByVaId || undefined,
        },
      });

      // Mark lead as CONVERTED
      const updatedLead = await prisma.lead.update({
        where: { id },
        data: {
          status: 'CONVERTED',
          disposition: 'CONVERTED',
          convertedFleetId: fleet.id,
          whatsappFollowUp: true,
        },
      });

      return sendSuccess(res, { fleet, lead: updatedLead }, 'Lead successfully converted to Fleet Account');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },
};

export default leadController;
