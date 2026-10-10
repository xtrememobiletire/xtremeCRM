import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/database.js';
import {
  sendSuccess,
  sendError,
  sanitizePaginationParams,
  calculateSkip,
  createPaginatedResponse,
  validateAndNormalizePhone,
  normalizePhoneNumber,
} from '../utils/index.js';
import { getIO } from '../config/socket.js';
import { geocodingService } from '../services/geocodingService.js';
import { sseManager } from '../services/sseManager.js';

const stripDriverFinancials = (job: any) => {
  const {
    materialCostCents,
    itPlatformFeeCents,
    expenseStatedById,
    otherExpenseCents,
    expenseNotes,
    expenseStatedAt,
    expenseStatedBy,
    invoice,
    ...rest
  } = job;
  return rest;
};

const normalizeUrgency = (u?: string | null): 'URGENT' | 'STANDARD' | 'FUTURE' => {
  if (!u) return 'STANDARD';
  const upper = String(u).toUpperCase();
  if (['CRITICAL', 'HIGH', 'EMERGENCY', 'URGENT'].includes(upper)) return 'URGENT';
  if (['LOW', 'FUTURE', 'SCHEDULED'].includes(upper)) return 'FUTURE';
  return 'STANDARD';
};

const validPaymentMethod = (pm?: string | null): 'E_TRANSFER' | 'POS' | 'CASH' | 'MOTO' | 'STRIPE' | null => {
  if (!pm) return null;
  const upper = String(pm).toUpperCase();
  if (upper === 'CREDIT_CARD' || upper === 'PHONE') return 'MOTO';
  if (['E_TRANSFER', 'POS', 'CASH', 'MOTO', 'STRIPE'].includes(upper)) {
    return upper as any;
  }
  return null;
};

export const jobController = {
  async getAllJobs(req: Request, res: Response) {
    try {
      const pageParam = req.query.page ? Number(req.query.page) : 1;
      const limitParam = req.query.limit ? Number(req.query.limit) : 20;
      const { page, limit } = sanitizePaginationParams(pageParam, limitParam);
      const skip = calculateSkip(page, limit);

      const countryCode = (req.query.countryCode as any) || req.countryCode;
      const status = req.query.status as any;
      const urgency = req.query.urgency as any;
      const driverId = req.query.driverId as string;
      const fleetId = req.query.fleetId as string;
      const customerId = req.query.customerId as string;
      const search = req.query.search as string;

      const where: any = {};
      if (countryCode && countryCode !== 'ALL') where.countryCode = countryCode;
      if (status) where.status = status;
      if (urgency) where.urgency = urgency;
      if (driverId) where.driverId = driverId;

      // Strict role isolation: users only see their own work strictly on their respective portals
      const userRole = (req.user as any)?.role;
      const userId = (req.user as any)?.id;
      if (userRole === 'DRIVER') {
        where.driverId = userId;
        delete where.countryCode;
      } else if (userRole === 'FLEET_MANAGER') {
        const fleet = await prisma.fleet.findFirst({ where: { managerUserId: userId } });
        if (fleet) where.fleetId = fleet.id;
        else where.fleetId = '00000000-0000-0000-0000-000000000000';
      } else if (userRole === 'CUSTOMER_MEMBER') {
        const cust = await prisma.customer.findFirst({ where: { userId } });
        if (cust) where.customerId = cust.id;
        else where.customerId = '00000000-0000-0000-0000-000000000000';
      }

      if (fleetId && userRole !== 'FLEET_MANAGER') where.fleetId = fleetId;
      if (customerId && userRole !== 'CUSTOMER_MEMBER') where.customerId = customerId;
      const isFleetJob = req.query.isFleetJob;
      const source = req.query.source as any;

      if (source) where.source = source;

      const andConditions: any[] = [];
      if (isFleetJob === 'true' || isFleetJob === '1') {
        andConditions.push({
          OR: [
            { fleetId: { not: null } },
            { isTestService: true },
          ],
        });
      } else if (isFleetJob === 'false' || isFleetJob === '0') {
        andConditions.push({
          fleetId: null,
          isTestService: false,
          ...(status ? {} : { status: { not: 'UNVERIFIED_PUBLIC' } }),
        });
      }

      if (search) {
        andConditions.push({
          OR: [
            { jobCode: { contains: search, mode: 'insensitive' } },
            { serviceAddress: { contains: search, mode: 'insensitive' } },
            { recipientName: { contains: search, mode: 'insensitive' } },
            { recipientPhone: { contains: search } },
            { problemNotes: { contains: search, mode: 'insensitive' } },
          ],
        });
      }

      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const [rawJobs, totalCount] = await Promise.all([
        prisma.job.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            customer: true,
            vehicle: true,
            fleet: true,
            driver: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            serviceItems: true,
            lead: {
              select: {
                id: true,
                companyName: true,
                contactPerson: true,
                phone: true,
              },
            },
          },
        }),
        prisma.job.count({ where }),
      ]);

      const isDriver = (req.user as any)?.role === 'DRIVER';
      const jobs = rawJobs.map((j) => {
        if (isDriver) {
          // PRD NFR-4: Driver financial isolation
          return stripDriverFinancials(j);
        }
        return j;
      });

      const paginated = createPaginatedResponse(jobs, page, limit, totalCount);
      return res.status(200).json(paginated);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async getJobById(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const job = await prisma.job.findUnique({
        where: { id },
        include: {
          customer: true,
          vehicle: true,
          fleet: true,
          driver: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          expenseStatedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          serviceItems: true,
          invoice: true,
        },
      });

      if (!job) return sendError(res, 'Job not found', 404);
      if ((req.user as any)?.role === 'DRIVER') {
        return sendSuccess(res, stripDriverFinancials(job));
      }
      return sendSuccess(res, job);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async createJob(req: Request, res: Response) {
    try {
      const data = req.body;
      const creatorId = (req.user as any)?.id || (await prisma.user.findFirst())?.id;
      if (!creatorId) return sendError(res, 'No user found for job creation', 400);

      const country = data.country || data.countryCode || 'CA';
      const jobCode = `JOB-${country}-${Math.floor(10000 + Math.random() * 90000)}`;

      // 1. Auto-resolve or create Customer if nested details provided
      let customerId = data.customerId;
      const rawPhone = data.customer?.phone || data.customerPhone || data.recipientPhone || data.phone;
      const name = data.customer?.name || data.customer?.fullName || data.customerName || data.recipientName || data.name;
      let normalizedContactPhone = '';

      if (rawPhone) {
        const phoneValidation = validateAndNormalizePhone(String(rawPhone), country);
        if (!phoneValidation.isValid) {
          return sendError(res, phoneValidation.error || 'Invalid customer phone number format', 400);
        }
        normalizedContactPhone = phoneValidation.normalized;
        const national10 = phoneValidation.national;

        if (!customerId) {
          // Smart lookup: Match existing customer by normalized E.164 OR by last 10 national digits
          const matchingCustomers = await prisma.customer.findMany({
            where: {
              countryCode: country as any,
              OR: [
                { phone: normalizedContactPhone },
                { phone: { endsWith: national10 } },
                { phone: national10 },
              ],
            },
            orderBy: { createdAt: 'asc' }, // oldest primary profile
          });

          let cust = matchingCustomers[0] || null;

          if (cust) {
            // Reconcile and merge duplicates if more than one profile matches this phone
            if (matchingCustomers.length > 1) {
              const duplicateIds = matchingCustomers.slice(1).map((c) => c.id);
              await prisma.job.updateMany({
                where: { customerId: { in: duplicateIds } },
                data: { customerId: cust.id },
              });
              await prisma.vehicle.updateMany({
                where: { customerId: { in: duplicateIds } },
                data: { customerId: cust.id },
              });
              await prisma.invoice.updateMany({
                where: { customerId: { in: duplicateIds } },
                data: { customerId: cust.id },
              });
              await prisma.customer.deleteMany({
                where: { id: { in: duplicateIds } },
              });
            }

            // Keep primary customer normalized to standard E.164
            if (cust.phone !== normalizedContactPhone) {
              cust = await prisma.customer.update({
                where: { id: cust.id },
                data: { phone: normalizedContactPhone },
              });
            }
          } else {
            // Create brand new customer with standardized E.164 phone
            cust = await prisma.customer.create({
              data: {
                fullName: name || 'Valued Customer',
                phone: normalizedContactPhone,
                email: data.customer?.email || data.email,
                countryCode: country as any,
              },
            });
          }
          customerId = cust.id;
        }
      }

      // 2. Auto-provision Customer Member Account if requested (PRD FR-1.3)
      if (data.makeUserAccount && customerId) {
        try {
          const cust = await prisma.customer.findUnique({ where: { id: customerId } });
          if (cust && !cust.userId) {
            const userEmail = cust.email || `cx_${cust.phone.replace(/[^0-9]/g, '')}@xtrememobiletire.com`;
            const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
            if (!existingUser) {
              const passwordHash = await bcrypt.hash('XtremeMember2026!', 10);
              const newUser = await prisma.user.create({
                data: {
                  email: userEmail,
                  passwordHash,
                  fullName: cust.fullName,
                  role: 'CUSTOMER_MEMBER',
                  countryCode: country,
                  phone: cust.phone,
                },
              });
              await prisma.customer.update({
                where: { id: cust.id },
                data: { userId: newUser.id, customerType: 'MEMBERSHIP' },
              });
            }
          }
        } catch (provErr) {
          console.warn('Customer account provisioning skipped:', provErr);
        }
      }

      // 3. Auto-resolve or create Vehicle
      let vehicleId = data.vehicleId;
      if (!vehicleId) {
        const rawMakeModel = (data.vehicle?.makeModel || data.vehicleMakeModel || `${data.vehicle?.make || ''} ${data.vehicle?.model || ''}`).trim();
        let year = Number(data.vehicle?.year);
        let make = data.vehicle?.make;
        let model = data.vehicle?.model;

        if (rawMakeModel && (!make || !model)) {
          const parts = rawMakeModel.split(/\s+/);
          const parsedYear = parseInt(parts[0], 10);
          if (!isNaN(parsedYear) && parsedYear >= 1970 && parsedYear <= 2035) {
            year = parsedYear;
            make = parts[1] || 'Standard';
            model = parts.slice(2).join(' ') || 'Vehicle';
          } else {
            make = parts[0] || 'Standard';
            model = parts.slice(1).join(' ') || 'Vehicle';
          }
        }

        const tireSize = data.vehicle?.tireSize || data.tireSize || '225/65R17';
        const plate = data.vehicle?.licensePlate?.trim();
        let veh = plate
          ? await prisma.vehicle.findFirst({
              where: { licensePlate: plate, countryCode: country },
            })
          : null;
        if (!veh) {
          veh = await prisma.vehicle.create({
            data: {
              customerId: customerId || undefined,
              fleetId: data.fleetId || undefined,
              countryCode: country,
              year: year || new Date().getFullYear(),
              make: make || 'Standard',
              model: model || 'Vehicle',
              licensePlate: plate || undefined,
              tireSize: tireSize,
            },
          });
        }
        vehicleId = veh.id;
      }

      // 4. Calculate totals and service items
      let subtotalCents = data.subtotalAmount || data.subtotalCents || data.quotedPriceCents || 0;
      let serviceItemsCreate: any[] = [];

      if (data.serviceItems && data.serviceItems.length > 0) {
        serviceItemsCreate = data.serviceItems.map((item: any) => ({
          serviceName: item.serviceName,
          category: item.category || 'TIRE_SERVICE',
          unitPriceCents: item.unitPriceCents,
          quantity: item.quantity || 1,
          notes: item.notes,
        }));
        subtotalCents = serviceItemsCreate.reduce(
          (sum: number, item: any) => sum + item.unitPriceCents * item.quantity,
          0
        );
      } else if (data.lineItems && data.lineItems.length > 0) {
        serviceItemsCreate = data.lineItems.map((item: any) => ({
          serviceName: item.serviceName,
          category: 'TIRE_SERVICE',
          unitPriceCents: item.price || 5000,
          quantity: item.quantity || 1,
        }));
        subtotalCents = serviceItemsCreate.reduce(
          (sum: number, item: any) => sum + item.unitPriceCents * item.quantity,
          0
        );
      } else if (data.services && data.services.length > 0) {
        const itemPrice = Math.round((data.totalCents || 16000) / data.services.length);
        serviceItemsCreate = data.services.map((name: string) => ({
          serviceName: name,
          category: 'TIRE_SERVICE',
          unitPriceCents: itemPrice,
          quantity: 1,
        }));
        subtotalCents = data.totalCents || 16000;
      }

      const taxRateBps = data.taxRateBps ?? (country === 'CA' ? 1300 : country === 'UK' ? 2000 : 800);
      const taxAmountCents = data.taxCents ?? data.taxAmount ?? Math.round((subtotalCents * taxRateBps) / 10000);
      const totalCents = data.totalCents ?? data.totalAmount ?? (subtotalCents + taxAmountCents);

      // IT platform royalty fee: CA: 150 cents ($1.50 CAD), US: 100 cents ($1.00 USD), UK: 100 pence (£1.00 GBP)
      const itPlatformFeeCents = country === 'CA' ? 150 : 100;
      const serviceAddress = data.serviceAddress || data.locationAddress || 'Roadside Breakdown Location';
      const repairerFeeCents = data.repairerFeeCents !== undefined 
        ? Math.round(Number(data.repairerFeeCents)) 
        : 0;

      let serviceLatitude = data.serviceLatitude !== undefined && data.serviceLatitude !== null ? Number(data.serviceLatitude) : data.latitude ? Number(data.latitude) : null;
      let serviceLongitude = data.serviceLongitude !== undefined && data.serviceLongitude !== null ? Number(data.serviceLongitude) : data.longitude ? Number(data.longitude) : null;
      if (serviceAddress && (serviceLatitude === null || serviceLongitude === null)) {
        const geo = await geocodingService.geocodeAddress(serviceAddress, country);
        if (geo.latitude && geo.longitude) {
          serviceLatitude = geo.latitude;
          serviceLongitude = geo.longitude;
        }
      }

      const job = await prisma.job.create({
        data: {
          jobCode,
          countryCode: country,
          currency: country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : 'CAD',
          customerId,
          vehicleId,
          fleetId: data.fleetId,
          createdById: creatorId,
          serviceAddress,
          serviceLatitude,
          serviceLongitude,
          recipientName: data.recipientName || data.customer?.name || data.customer?.fullName || data.customerName || name,
          recipientPhone: normalizedContactPhone || (data.recipientPhone ? normalizePhoneNumber(data.recipientPhone, country) : undefined),
          problemNotes: data.problemNotes || data.notes,
          urgency: normalizeUrgency(data.urgency),
          source: data.source || 'DIRECT_CALL',
          disposition: (data.disposition as any) || 'BOOKED',
          appointmentDate: data.appointmentDate 
            ? new Date(data.appointmentDate) 
            : data.arrivalWindowStart 
              ? new Date(data.arrivalWindowStart) 
              : data.scheduledFor 
                ? new Date(data.scheduledFor) 
                : undefined,
          arrivalWindowStart: data.arrivalWindowStart ? new Date(data.arrivalWindowStart) : undefined,
          arrivalWindowEnd: data.arrivalWindowEnd ? new Date(data.arrivalWindowEnd) : undefined,
          estimatedArrivalAt: data.estimatedArrivalAt 
            ? new Date(data.estimatedArrivalAt) 
            : data.estimatedArrivalMinutes 
              ? new Date(Date.now() + Number(data.estimatedArrivalMinutes) * 60000) 
              : undefined,
          subtotalCents,
          taxRateBps,
          taxAmountCents,
          totalCents,
          itPlatformFeeCents,
          repairerFeeCents,
          paymentMethod: validPaymentMethod(data.paymentMethod),
          paymentStatus: 'UNPAID',
          status: data.source === 'LANDING_PAGE_SELF_BOOK' ? 'UNVERIFIED_PUBLIC' : 'PENDING',
          serviceItems: {
            create: serviceItemsCreate,
          },
        },
        include: {
          customer: true,
          vehicle: true,
          fleet: true,
          serviceItems: true,
        },
      });

      // Notify dispatch room via socket & SSE
      try {
        const io = getIO();
        io.to(`dispatch:${country}`).emit('job:created', job);
        sseManager.broadcast(`sse:dispatch:${country}`, 'job:created', job);
      } catch {}

      return sendSuccess(res, job, 'Job created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async updateJobStatus(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { status, urgency, paymentMethod, amountCents, cashAmountCents, cashCollected, receiptUrl } = req.body;

      const job = await prisma.job.findUnique({ where: { id } });
      if (!job) return sendError(res, 'Job not found', 404);

      let effectiveAmountCents = amountCents !== undefined
        ? Math.round(Number(amountCents))
        : (cashAmountCents !== undefined 
          ? Math.round(Number(cashAmountCents)) 
          : (cashCollected !== undefined ? Math.round(Number(cashCollected) * 100) : 0));

      const isTrialJob = Boolean(job.isTestService);

      const mappedStatus = (status === 'ON_SCENE' || status === 'EN_ROUTE') ? 'IN_PROGRESS' : status;
      const updateData: any = {
        status: mappedStatus,
        updatedAt: new Date(),
      };
      if (urgency) updateData.urgency = urgency;
      if (status === 'COMPLETED') {
        const chosenMethod = paymentMethod || job.paymentMethod || 'CASH';

        if (!isTrialJob && effectiveAmountCents <= 0 && (!job.totalCents || job.totalCents <= 0)) {
          return sendError(res, 'Payment amount collected on scene is required to complete this job', 400);
        }

        if (!isTrialJob && job.totalCents && job.totalCents > 0) {
          if (effectiveAmountCents < job.totalCents) {
            return sendError(
              res,
              `Collected amount ($${(effectiveAmountCents / 100).toFixed(2)}) cannot be less than required invoice total ($${(job.totalCents / 100).toFixed(2)})`,
              400
            );
          }
          if (effectiveAmountCents > job.totalCents) {
            // If greater than required amount, write to default value
            effectiveAmountCents = job.totalCents;
          }
        }

        const uploadedReceiptUrl = req.file ? `/uploads/receipts/${req.file.filename}` : receiptUrl;
        if ((chosenMethod === 'POS' || chosenMethod === 'E_TRANSFER') && !uploadedReceiptUrl && !job.receiptUrl) {
          return sendError(res, `Payment receipt proof photo is strictly mandatory when completing with ${chosenMethod.replace('_', ' ')}`, 400);
        }

        updateData.completedAt = new Date();
        updateData.paymentMethod = chosenMethod;
        if (uploadedReceiptUrl) {
          updateData.receiptUrl = uploadedReceiptUrl;
        }

        if (chosenMethod === 'CASH') {
          updateData.cashCollectedCents = effectiveAmountCents;
        }

        if (effectiveAmountCents > 0) {
          updateData.paymentStatus = 'PAID_PENDING_VERIFICATION';
          if (!job.totalCents || job.totalCents === 0) {
            updateData.totalCents = effectiveAmountCents;
            updateData.subtotalCents = effectiveAmountCents;
          }
        } else if (isTrialJob) {
          updateData.paymentStatus = 'VERIFIED_PAID';
        }
      }

      const updated = await prisma.job.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          vehicle: true,
          driver: true,
          serviceItems: true,
        },
      });

      // Auto-advance prospective lead to ADMIN_APPROVAL if complimentary trial job completed
      if (status === 'COMPLETED' && isTrialJob && job.leadId) {
        try {
          const updatedLead = await prisma.lead.update({
            where: { id: job.leadId },
            data: {
              stage: 'ADMIN_APPROVAL',
              status: 'CALLED',
            },
          });
          sseManager.broadcast(`sse:leads:${updatedLead.countryCode}`, 'lead:updated', updatedLead);
          sseManager.broadcast(`sse:leads:${updatedLead.countryCode}`, 'lead:stats_updated', { countryCode: updatedLead.countryCode });
        } catch (leadErr) {
          console.warn('Lead auto-advance to ADMIN_APPROVAL skipped:', leadErr);
        }
      }

      // VA Commission attribution on completed fleet jobs (PRD FR-2.1 / Rule 6.3)
      if (status === 'COMPLETED' && updated.fleetId) {
        try {
          const fleet = await prisma.fleet.findUnique({
            where: { id: updated.fleetId },
            select: { id: true, virtualAssistantId: true },
          });
          if (fleet?.virtualAssistantId) {
            const existingCommission = await prisma.fleetCommissionLedger.findFirst({
              where: { jobId: updated.id },
            });
            if (!existingCommission) {
              await prisma.fleetCommissionLedger.create({
                data: {
                  fleetId: fleet.id,
                  virtualAssistantId: fleet.virtualAssistantId,
                  jobId: updated.id,
                  amountCents: 250, // $2.50 agreed commission
                  notes: `Commission for completed job ${updated.jobCode}`,
                },
              });
            }
          }
        } catch (commErr) {
          console.warn('VA commission ledger skipped:', commErr);
        }
      }

      try {
        const io = getIO();
        const statusPayload = {
          id: updated.id,
          jobId: updated.id,
          jobCode: updated.jobCode,
          status: updated.status,
          countryCode: updated.countryCode,
          driverId: updated.driverId,
          driverName: (updated as any).driver?.fullName,
          urgency: updated.urgency,
          paymentMethod: updated.paymentMethod,
          paymentStatus: updated.paymentStatus,
          totalCents: updated.totalCents,
          updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : new Date().toISOString(),
        };

        // Notify dispatchers and admins
        io.to(`dispatch:${updated.countryCode}`).emit('job:status_updated', statusPayload);
        sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'job:status_updated', statusPayload);

        // Notify driver
        if (updated.driverId) {
          io.to(`driver:${updated.driverId}`).emit('job:status_updated', statusPayload);
          io.to(`user:${updated.driverId}`).emit('job:status_updated', statusPayload);
          sseManager.broadcast(`sse:driver:${updated.driverId}`, 'job:status_updated', statusPayload);
        }

        // Notify ticket creator
        if (updated.createdById) {
          io.to(`user:${updated.createdById}`).emit('job:status_updated', statusPayload);
        }

        // When a job completes, notify Accountant & Dispatch for expense audit handoff (PRD FR-6.1)
        if (updated.status === 'COMPLETED') {
          const completionNotification = {
            type: 'JOB_COMPLETED',
            title: 'Job Completed — Audit Ready',
            jobId: updated.id,
            jobCode: updated.jobCode,
            driverName: (updated as any).driver?.fullName || 'Technician',
            customerName: (updated as any).customer?.fullName || updated.recipientName || 'Customer',
            vehicle: (updated as any).vehicle ? `${(updated as any).vehicle.year} ${(updated as any).vehicle.make} ${(updated as any).vehicle.model}` : 'Vehicle',
            totalCents: updated.totalCents,
            paymentMethod: updated.paymentMethod,
            timestamp: new Date().toISOString(),
            message: `Job #${updated.jobCode} completed by ${(updated as any).driver?.fullName || 'Technician'}. Ready for expense audit & reconciliation.`,
          };

          io.to(`accounting:${updated.countryCode}`).emit('accounting:job_completed', completionNotification);
          io.to(`dispatch:${updated.countryCode}`).emit('notification:toast', completionNotification);
        }
      } catch {}

      if ((req.user as any)?.role === 'DRIVER') {
        return sendSuccess(res, stripDriverFinancials(updated), 'Job status updated successfully');
      }

      return sendSuccess(res, updated, 'Job status updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async assignDriver(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { 
        driverId, 
        etaMinutes, 
        estimatedArrivalAt: customArrival,
        driverEtaMinutes: rawDriverEtaMinutes,
        driverEstimatedArrivalAt: rawDriverEstimatedArrivalAt,
      } = req.body;

      const [driver, job] = await Promise.all([
        prisma.user.findUnique({ where: { id: driverId } }),
        prisma.job.findUnique({ where: { id } }),
      ]);

      if (!driver) return sendError(res, 'Driver not found', 404);
      if (!job) return sendError(res, 'Job not found', 404);

      // Strict regional silo: region based jobs should only have region based drivers
      if (driver.countryCode !== job.countryCode) {
        return sendError(res, `Cannot assign ${driver.countryCode} driver to ${job.countryCode} job`, 400);
      }

      // Compute technician/driver-specific driving ETA:
      // Keep customer promised SLA (job.estimatedArrivalAt, arrivalWindowStart, arrivalWindowEnd) untouched!
      const effectiveDriverEtaMinutes = rawDriverEtaMinutes ?? etaMinutes;
      const driverEstimatedArrivalAt = rawDriverEstimatedArrivalAt 
        ? new Date(rawDriverEstimatedArrivalAt) 
        : customArrival 
        ? new Date(customArrival) 
        : effectiveDriverEtaMinutes 
        ? new Date(Date.now() + Number(effectiveDriverEtaMinutes) * 60000) 
        : undefined;

      const updated = await prisma.job.update({
        where: { id },
        data: {
          driverId,
          status: 'ASSIGNED',
          assignedAt: new Date(),
          driverEstimatedArrivalAt,
          driverEtaMinutes: effectiveDriverEtaMinutes ? Number(effectiveDriverEtaMinutes) : undefined,
          // Preserve customer promised arrival time; only fallback if job had no promised ETA set
          estimatedArrivalAt: job.estimatedArrivalAt ?? driverEstimatedArrivalAt,
          updatedAt: new Date(),
        },
        include: {
          customer: true,
          vehicle: true,
          driver: true,
          serviceItems: true,
        },
      });

      try {
        const io = getIO();
        const stripped = stripDriverFinancials(updated);
        io.to(`driver:${driverId}`).emit('job:assigned', stripped);
        io.to(`user:${driverId}`).emit('notification:job_assigned', {
          type: 'JOB_ASSIGNED',
          title: 'New Dispatch Assigned',
          jobId: updated.id,
          jobCode: updated.jobCode,
          serviceAddress: updated.serviceAddress,
          tireSize: (updated as any).vehicle?.tireSize || 'N/A',
          urgency: updated.urgency,
          message: `You have been dispatched to Job #${updated.jobCode} at ${updated.serviceAddress}`,
          timestamp: new Date().toISOString(),
          job: stripped,
        });
        io.to(`dispatch:${updated.countryCode}`).emit('job:driver_assigned', {
          jobId: updated.id,
          jobCode: updated.jobCode,
          driverId,
          driverName: driver.fullName,
        });
        sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'job:driver_assigned', {
          id: updated.id,
          jobId: updated.id,
          jobCode: updated.jobCode,
          driverId,
          driverName: driver.fullName,
          status: updated.status,
          countryCode: updated.countryCode,
        });
        sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'job:assigned', updated);
        sseManager.broadcast(`sse:driver:${driverId}`, 'job:assigned', stripped);
      } catch {}

      return sendSuccess(res, updated, 'Driver assigned successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async verifyBookingAddress(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const {
        serviceAddress,
        serviceLatitude,
        serviceLongitude,
        recipientName,
        recipientPhone,
        problemNotes,
        urgency,
        paymentMethod,
        vehicleMake,
        vehicleModel,
        vehicleYear,
        tireSize,
        licensePlate,
        serviceItems: incomingServiceItems,
      } = req.body;

      const job = await prisma.job.findUnique({
        where: { id },
        include: { vehicle: true, serviceItems: true },
      });
      if (!job) return sendError(res, 'Job not found', 404);

      const updateData: any = {
        updatedAt: new Date(),
      };
      if (job.status === 'UNVERIFIED_PUBLIC') {
        updateData.status = 'PENDING';
      }
      if (serviceAddress) updateData.serviceAddress = serviceAddress;
      if (serviceLatitude !== undefined && serviceLatitude !== null) updateData.serviceLatitude = Number(serviceLatitude);
      if (serviceLongitude !== undefined && serviceLongitude !== null) updateData.serviceLongitude = Number(serviceLongitude);
      if (recipientName) updateData.recipientName = recipientName;
      if (recipientPhone) {
        const pVal = validateAndNormalizePhone(recipientPhone, job.countryCode);
        updateData.recipientPhone = pVal.isValid ? pVal.normalized : recipientPhone;
      }
      if (problemNotes) updateData.problemNotes = problemNotes;
      if (urgency) updateData.urgency = normalizeUrgency(urgency);
      if (paymentMethod !== undefined) updateData.paymentMethod = validPaymentMethod(paymentMethod);

      // Update or create vehicle specs (Crucial for mobile tire vans to stock the right tire)
      if (vehicleMake || vehicleModel || vehicleYear || tireSize || licensePlate) {
        if (job.vehicleId) {
          await prisma.vehicle.update({
            where: { id: job.vehicleId },
            data: {
              ...(vehicleMake ? { make: vehicleMake } : {}),
              ...(vehicleModel ? { model: vehicleModel } : {}),
              ...(vehicleYear ? { year: Number(vehicleYear) } : {}),
              ...(tireSize ? { tireSize } : {}),
              ...(licensePlate ? { licensePlate } : {}),
            },
          });
        } else {
          const newVeh = await prisma.vehicle.create({
            data: {
              countryCode: job.countryCode,
              make: vehicleMake || 'Standard',
              model: vehicleModel || 'Vehicle',
              year: Number(vehicleYear) || new Date().getFullYear(),
              tireSize: tireSize || '225/65R17',
              licensePlate: licensePlate || undefined,
            },
          });
          updateData.vehicleId = newVeh.id;
        }
      }

      // Update service items and recalculate totals if services provided
      if (incomingServiceItems && Array.isArray(incomingServiceItems) && incomingServiceItems.length > 0) {
        await prisma.jobServiceItem.deleteMany({ where: { jobId: id } });
        const itemsToCreate = incomingServiceItems.map((item: any) => ({
          jobId: id,
          serviceName: item.serviceName,
          category: item.category || 'TIRE_SERVICE',
          unitPriceCents: Number(item.unitPriceCents) || 5000,
          quantity: Number(item.quantity) || 1,
        }));
        await prisma.jobServiceItem.createMany({ data: itemsToCreate });
        const subtotal = itemsToCreate.reduce((s: number, i: any) => s + i.unitPriceCents * i.quantity, 0);
        const taxRateBps = job.countryCode === 'CA' ? 1300 : job.countryCode === 'UK' ? 2000 : 800;
        const taxAmount = Math.round((subtotal * taxRateBps) / 10000);
        updateData.subtotalCents = subtotal;
        updateData.taxRateBps = taxRateBps;
        updateData.taxAmountCents = taxAmount;
        updateData.totalCents = subtotal + taxAmount;
      }

      const updated = await prisma.job.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          vehicle: true,
          serviceItems: true,
        },
      });

      try {
        const io = getIO();
        io.to(`dispatch:${updated.countryCode}`).emit('job:verified', updated);
        sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'job:verified', updated);
      } catch {}

      return sendSuccess(res, updated, 'Booking address verified successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async stateJobExpenses(req: Request, res: Response) {
    try {
      const userRole = (req.user as any)?.role;
      if (userRole && !['ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT'].includes(userRole)) {
        return sendError(res, 'Only Administrators and Accountants can state job expenses', 403);
      }
      const id = String(req.params.id);
      const { materialCostCents, repairerFeeCents, otherExpenseCents, expenseNotes } = req.body;
      const accountantId = (req.user as any)?.id;

      const updated = await prisma.job.update({
        where: { id },
        data: {
          materialCostCents: Number(materialCostCents) || 0,
          repairerFeeCents: Number(repairerFeeCents) || 0,
          otherExpenseCents: Number(otherExpenseCents) || 0,
          expenseNotes,
          expenseStatedById: accountantId,
          expenseStatedAt: new Date(),
        },
        include: {
          expenseStatedBy: true,
        },
      });

      try {
        const io = getIO();
        io.to(`dispatch:${updated.countryCode}`).emit('job:status_updated', updated);
        sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'job:status_updated', updated);
        if (updated.driverId) {
          const strippedForDriver = stripDriverFinancials(updated);
          io.to(`driver:${updated.driverId}`).emit('job:status_updated', strippedForDriver);
          io.to(`user:${updated.driverId}`).emit('job:status_updated', strippedForDriver);
          sseManager.broadcast(`sse:driver:${updated.driverId}`, 'job:status_updated', strippedForDriver);
        }
      } catch {}

      return sendSuccess(res, updated, 'Job expenses stated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async deleteJob(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const existing = await prisma.job.findUnique({ where: { id }, select: { countryCode: true, driverId: true } });
      await prisma.jobServiceItem.deleteMany({ where: { jobId: id } });
      await prisma.job.delete({ where: { id } });

      if (existing) {
        try {
          const io = getIO();
          io.to(`dispatch:${existing.countryCode}`).emit('job:deleted', { id });
        } catch {}
        sseManager.broadcast(`sse:dispatch:${existing.countryCode}`, 'job:deleted', { id, countryCode: existing.countryCode });
        if (existing.driverId) {
          sseManager.broadcast(`sse:driver:${existing.driverId}`, 'job:deleted', { id });
        }
      }

      return sendSuccess(res, null, 'Job deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async createPublicBooking(req: Request, res: Response) {
    try {
      const data = req.body;
      const country = data.country || data.countryCode || 'CA';
      const jobCode = `PUB-${country}-${Math.floor(10000 + Math.random() * 90000)}`;

      const defaultUser = (await prisma.user.findFirst({ where: { role: 'ADMIN' } })) || (await prisma.user.findFirst());
      if (!defaultUser) return sendError(res, 'System user not configured', 500);

      const veh = await prisma.vehicle.create({
        data: {
          countryCode: country,
          year: Number(data.vehicle?.year) || new Date().getFullYear(),
          make: data.vehicle?.make || 'Standard',
          model: data.vehicle?.model || 'Vehicle',
          tireSize: data.vehicle?.tireSize || '225/65R17',
          licensePlate: data.vehicle?.licensePlate || undefined,
        },
      });

      let subtotalCents = 0;
      let serviceItemsCreate: any[] = [];
      if (data.serviceItems?.length) {
        serviceItemsCreate = data.serviceItems.map((item: any) => ({
          serviceName: item.serviceName,
          category: item.category || 'TIRE_SERVICE',
          unitPriceCents: item.unitPriceCents || 5000,
          quantity: item.quantity || 1,
        }));
        subtotalCents = serviceItemsCreate.reduce((s: number, i: any) => s + i.unitPriceCents * i.quantity, 0);
      }

      const taxRateBps = country === 'CA' ? 1300 : country === 'UK' ? 2000 : 800;
      const taxAmountCents = Math.round((subtotalCents * taxRateBps) / 10000);
      const totalCents = subtotalCents + taxAmountCents;
      const itPlatformFeeCents = country === 'CA' ? 150 : 100;
      const serviceAddress = data.serviceAddress || 'Roadside Breakdown Location';
      let serviceLatitude = data.serviceLatitude !== undefined && data.serviceLatitude !== null ? Number(data.serviceLatitude) : null;
      let serviceLongitude = data.serviceLongitude !== undefined && data.serviceLongitude !== null ? Number(data.serviceLongitude) : null;
      if (serviceAddress && (serviceLatitude === null || serviceLongitude === null)) {
        const geo = await geocodingService.geocodeAddress(serviceAddress, country);
        if (geo.latitude && geo.longitude) {
          serviceLatitude = geo.latitude;
          serviceLongitude = geo.longitude;
        }
      }

      const job = await prisma.job.create({
        data: {
          jobCode,
          countryCode: country,
          currency: country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : 'CAD',
          serviceAddress,
          serviceLatitude,
          serviceLongitude,
          recipientName: data.recipientName || data.customer?.name,
          recipientPhone: data.recipientPhone || data.customer?.phone,
          problemNotes: data.problemNotes || data.notes,
          urgency: normalizeUrgency(data.urgency),
          source: data.source || 'WEBSITE',
          disposition: 'BOOKED',
          createdById: defaultUser.id,
          vehicleId: veh.id,
          subtotalCents,
          taxRateBps,
          taxAmountCents,
          totalCents,
          itPlatformFeeCents,
          paymentMethod: validPaymentMethod(data.paymentMethod),
          paymentStatus: 'UNPAID',
          status: 'UNVERIFIED_PUBLIC',
          serviceItems: { create: serviceItemsCreate },
        },
        include: { serviceItems: true },
      });

      try {
        const io = getIO();
        io.to(`dispatch:${country}`).emit('job:triage_new', job);
        sseManager.broadcast(`sse:dispatch:${country}`, 'booking:created', job);
        sseManager.broadcast(`sse:dispatch:${country}`, 'job:created', job);
      } catch {}

      return sendSuccess(res, { id: job.id, jobCode: job.jobCode, status: job.status }, 'Booking received — our team will contact you shortly', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async recordDisposition(req: Request, res: Response) {
    try {
      const { callerPhone, disposition, reason, countryCode } = req.body;
      const agentId = (req.user as any)?.id || (await prisma.user.findFirst())?.id;
      if (!agentId) return sendError(res, 'No agent user found', 400);

      let dispVeh = await prisma.vehicle.findFirst({ where: { licensePlate: 'DISPOSITION' } });
      if (!dispVeh) {
        dispVeh = await prisma.vehicle.create({
          data: {
            licensePlate: 'DISPOSITION',
            make: 'Disposition',
            model: 'Inquiry',
            year: 2026,
            tireSize: 'N/A',
            countryCode: countryCode || 'CA',
          },
        });
      }

      // Store as a job record with disposition vehicle for analytics
      const jobCode = `DSP-${countryCode || 'CA'}-${Math.floor(10000 + Math.random() * 90000)}`;
      const validDispositions = ['BOOKED', 'RELEVANT_NOT_CONVERTED', 'WRONG_NUMBER', 'IRRELEVANT_SERVICE', 'CANCELLED_BY_CUSTOMER'];
      const resolvedDisp = validDispositions.includes(disposition) ? disposition : 'RELEVANT_NOT_CONVERTED';

      const job = await prisma.job.create({
        data: {
          jobCode,
          countryCode: countryCode || 'CA',
          currency: countryCode === 'US' ? 'USD' : countryCode === 'UK' ? 'GBP' : 'CAD',
          recipientPhone: callerPhone || undefined,
          serviceAddress: 'N/A — Disposition Only',
          disposition: resolvedDisp,
          problemNotes: reason || undefined,
          source: 'DIRECT_CALL',
          urgency: 'STANDARD',
          status: 'CANCELLED',
          createdById: agentId,
          vehicleId: dispVeh.id,
          subtotalCents: 0,
          taxRateBps: 0,
          taxAmountCents: 0,
          totalCents: 0,
          itPlatformFeeCents: 0,
        },
      });

      return sendSuccess(res, { id: job.id, disposition }, 'Disposition recorded', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },
};

export default jobController;
