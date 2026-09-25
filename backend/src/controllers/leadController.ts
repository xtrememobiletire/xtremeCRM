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
        callbackDate,
        callbackDay,
        callbackTime,
      } = req.body;

      const resolvedContact = contactPerson || fleetManager || ceoOwnerName || 'Fleet Manager';
      if (!companyName || !phone) {
        return sendError(res, 'Company name and phone number are required', 400);
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

      const parsedCallbackDate = callbackDate ? new Date(callbackDate) : null;
      const status = parsedCallbackDate ? 'CALLBACK' : 'NEW';

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
          uploadedByVaId,
          assignedAgentId: assignedAgentId || null,
          status,
          callbackDate: parsedCallbackDate,
          callbackDay: callbackDay || null,
          callbackTime: callbackTime || null,
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
          fleetManager: lead.fleetManager || undefined,
          ceoOwnerName: lead.ceoOwnerName || undefined,
          phone: lead.phone,
          email: lead.email,
          poaEmail: lead.poaEmail || undefined,
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

  /**
   * Upload Leads via CSV / Excel (.xlsx, .xls, .csv)
   * Processed by VA, saved to Postgres in unassigned pool (assignedAgentId: null)
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

      // 1. Intelligent Sheet Selection: Check specified sheet, or search for lead/outbound sheet
      let chosenSheetName = req.body.sheetName as string;
      if (!chosenSheetName || !workbook.Sheets[chosenSheetName]) {
        const leadSheetKeywords = /outbound|dial|lead|fleet|trucking|verified|master/i;
        const matchingSheet = workbook.SheetNames.find((name) => leadSheetKeywords.test(name));
        if (matchingSheet && workbook.Sheets[matchingSheet]) {
          chosenSheetName = matchingSheet;
        } else {
          // Find first sheet that has rows
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
          uploadedByVaId: vaUserId || null,
          assignedAgentId: null, // Unassigned for campaign batch assignment
        });
      }

      if (leadsToCreate.length === 0) {
        return sendError(res, 'No valid lead rows found in file. Please ensure columns include Company, Contact, and Phone.', 400);
      }

      const result = await prisma.lead.createMany({
        data: leadsToCreate,
      });

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
   * Assigns 5 leads to each currently active OUTBOUND agent in FIFO order
   */
  async startBatch(req: Request, res: Response) {
    try {
      const countryCode = (req.body.countryCode as any) || (req as any).countryCode || 'CA';
      const BATCH_CAP = 5;

      // 1. Find all available Call Agents
      const activeAgents = await prisma.user.findMany({
        where: {
          role: 'CALL_AGENT',
          countryCode: countryCode as any,
          deletedAt: null,
        },
      });

      if (activeAgents.length === 0) {
        return sendError(res, 'No Call Agents found for this region to assign leads to.', 400);
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
            orderBy: { createdAt: 'asc' },
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

      // Notify agents via Socket.io
      try {
        const io = getIO();
        io.to(`dispatch:${countryCode}`).emit('campaign:batch_started', {
          batchId,
          totalAssigned,
          agentsCount: activeAgents.length,
        });
        io.to('role:CALL_AGENT').emit('campaign:batch_started', { batchId });
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
   * Get Active Queue for Call Agent with 5-cap Auto-Replenishment (PRD FR-9.2, FR-9.5)
   * Scheduled callbacks appear first, followed by active leads up to 5 total
   */
  async getAgentQueue(req: Request, res: Response) {
    try {
      const agentId = (req as any).user?.id;
      if (!agentId) return sendError(res, 'Unauthorized', 401);

      const countryCode = (req.query.countryCode as any) || (req as any).countryCode;
      const MAX_ACTIVE = 5;

      // 1. Fetch scheduled callbacks due (available to any active agent when due)
      const now = new Date();
      const scheduledCallbacks = await prisma.lead.findMany({
        where: {
          status: 'CALLBACK',
          OR: [
            { assignedAgentId: agentId },
            { assignedAgentId: null, callbackDate: { lte: now } },
          ],
          ...(countryCode ? { countryCode } : {}),
        },
        orderBy: [{ callbackDate: 'asc' }, { createdAt: 'asc' }],
        take: 5,
        include: {
          uploadedByVa: {
            select: { id: true, fullName: true, role: true },
          },
        },
      });

      // 2. Fetch currently active leads for this agent (NEW or CALLED with no terminal outcome)
      const activeLeads = await prisma.lead.findMany({
        where: {
          assignedAgentId: agentId,
          status: { in: ['NEW', 'CALLED'] },
          OR: [
            { disposition: null },
          ],
        },
        orderBy: { createdAt: 'asc' },
        include: {
          uploadedByVa: {
            select: { id: true, fullName: true, role: true },
          },
        },
      });

      const currentCount = activeLeads.length;
      let newlyAssignedCount = 0;

      // 3. If under capacity (< 5), pull unassigned leads from pool in FIFO order (FR-9.2)
      if (currentCount < MAX_ACTIVE) {
        const slotsNeeded = MAX_ACTIVE - currentCount;

        const unassignedLeads = await prisma.lead.findMany({
          where: {
            assignedAgentId: null,
            status: 'NEW',
            ...(countryCode ? { countryCode } : {}),
          },
          take: slotsNeeded,
          orderBy: { createdAt: 'asc' },
          include: {
            uploadedByVa: {
              select: { id: true, fullName: true, role: true },
            },
          },
        });

        if (unassignedLeads.length > 0) {
          const leadIds = unassignedLeads.map((l) => l.id);
          await prisma.lead.updateMany({
            where: { id: { in: leadIds } },
            data: { assignedAgentId: agentId },
          });

          activeLeads.push(...unassignedLeads);
          newlyAssignedCount = unassignedLeads.length;
        }
      }

      // 4. Count remaining unassigned leads in the pool
      const unassignedPoolCount = await prisma.lead.count({
        where: {
          assignedAgentId: null,
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
   * Set Lead Call Disposition (FR-9.4) & Inline 5-Cap Auto-Replenishment (FR-9.2)
   */
  async setDisposition(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { disposition, notes, callbackDate, callbackDay, callbackTime } = req.body;
      const agentId = (req as any).user?.id;

      if (!disposition) {
        return sendError(res, 'Disposition is required', 400);
      }

      let newStatus: any = 'CALLED';
      if (disposition === 'CONVERTED') {
        newStatus = 'CONVERTED';
      } else if (disposition === 'CALLBACK') {
        newStatus = 'CALLBACK';
      } else if (['NOT_INTERESTED', 'WRONG_NUMBER'].includes(disposition)) {
        newStatus = 'DEAD';
      }

      const updateData: any = {
        disposition: disposition as any,
        notes: notes || undefined,
        status: newStatus,
      };

      if (disposition === 'CALLBACK') {
        updateData.callbackDate = callbackDate ? new Date(callbackDate) : new Date(Date.now() + 24 * 3600 * 1000);
        updateData.callbackDay = callbackDay || undefined;
        updateData.callbackTime = callbackTime || undefined;
        // Enters available callbacks pool for when due
        updateData.assignedAgentId = null;
      }

      const updated = await prisma.lead.update({
        where: { id },
        data: updateData,
        include: {
          uploadedByVa: {
            select: { id: true, fullName: true },
          },
          assignedAgent: {
            select: { id: true, fullName: true },
          },
        },
      });

      // Inline Auto-Replenishment: Keep agent at 5 active leads (FR-9.2)
      let nextLeadAssigned: any = null;
      if (agentId) {
        const MAX_ACTIVE = 5;
        const currentActiveCount = await prisma.lead.count({
          where: {
            assignedAgentId: agentId,
            status: { in: ['NEW', 'CALLED'] },
            OR: [{ disposition: null }],
          },
        });

        if (currentActiveCount < MAX_ACTIVE) {
          const freshLead = await prisma.lead.findFirst({
            where: {
              assignedAgentId: null,
              status: 'NEW',
              countryCode: updated.countryCode,
            },
            orderBy: { createdAt: 'asc' },
          });

          if (freshLead) {
            nextLeadAssigned = await prisma.lead.update({
              where: { id: freshLead.id },
              data: { assignedAgentId: agentId },
            });
          }
        }
      }

      // Notify live queue
      try {
        const io = getIO();
        io.to(`dispatch:${updated.countryCode}`).emit('lead:updated', updated);
      } catch {}

      return sendSuccess(res, {
        lead: updated,
        replenishedLead: nextLeadAssigned,
      }, 'Disposition logged successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },
};

export default leadController;
