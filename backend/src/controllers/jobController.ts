import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/database.js';
import {
  sendSuccess,
  sendError,
  sanitizePaginationParams,
  calculateSkip,
  createPaginatedResponse,
} from '../utils/index.js';
import { getIO } from '../config/socket.js';

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
      if (search) {
        where.OR = [
          { jobCode: { contains: search, mode: 'insensitive' } },
          { serviceAddress: { contains: search, mode: 'insensitive' } },
          { recipientName: { contains: search, mode: 'insensitive' } },
          { recipientPhone: { contains: search } },
          { problemNotes: { contains: search, mode: 'insensitive' } },
        ];
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
          messages: {
            take: 20,
            orderBy: { createdAt: 'desc' },
          },
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
      const phone = data.customer?.phone || data.recipientPhone;
      if (!customerId && phone) {
        const cleanPhone = phone.trim();
        let cust = await prisma.customer.findFirst({
          where: { phone: cleanPhone, countryCode: country },
        });
        if (!cust) {
          cust = await prisma.customer.create({
            data: {
              fullName: data.customer?.name || data.recipientName || 'Valued Customer',
              phone: cleanPhone,
              email: data.customer?.email,
              countryCode: country,
            },
          });
        }
        customerId = cust.id;
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
              year: Number(data.vehicle?.year) || new Date().getFullYear(),
              make: data.vehicle?.make || 'Standard',
              model: data.vehicle?.model || 'Vehicle',
              licensePlate: plate || undefined,
              tireSize: data.vehicle?.tireSize || '225/65R17',
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
          recipientName: data.recipientName || data.customer?.name,
          recipientPhone: data.recipientPhone || data.customer?.phone,
          problemNotes: data.problemNotes || data.notes,
          urgency: data.urgency || 'STANDARD',
          source: data.source || 'DIRECT_CALL',
          disposition: (data.disposition as any) || 'BOOKED',
          appointmentDate: data.appointmentDate ? new Date(data.appointmentDate) : data.scheduledFor ? new Date(data.scheduledFor) : undefined,
          subtotalCents,
          taxRateBps,
          taxAmountCents,
          totalCents,
          itPlatformFeeCents,
          paymentMethod: data.paymentMethod,
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

      // Notify dispatch room via socket
      try {
        const io = getIO();
        io.to(`dispatch:${country}`).emit('job:created', job);
      } catch {}

      return sendSuccess(res, job, 'Job created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async updateJobStatus(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { status, urgency, cashAmountCents, cashCollected } = req.body;

      const job = await prisma.job.findUnique({ where: { id } });
      if (!job) return sendError(res, 'Job not found', 404);

      const effectiveCashCents = cashAmountCents !== undefined 
        ? Math.round(Number(cashAmountCents)) 
        : (cashCollected !== undefined ? Math.round(Number(cashCollected) * 100) : 0);

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };
      if (urgency) updateData.urgency = urgency;
      if (status === 'ARRIVED') updateData.arrivedAt = new Date();
      if (status === 'COMPLETED') {
        if (effectiveCashCents <= 0 && (!job.totalCents || job.totalCents <= 0)) {
          return sendError(res, 'Payment amount or cash collected on scene is required to complete this job', 400);
        }
        updateData.completedAt = new Date();
        if (effectiveCashCents > 0) {
          updateData.paymentMethod = 'CASH';
          updateData.paymentStatus = 'PAID_PENDING_VERIFICATION';
          if (!job.totalCents || job.totalCents === 0) {
            updateData.totalCents = effectiveCashCents;
            updateData.subtotalCents = effectiveCashCents;
          }
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

      // Record driver cash collection ledger if cash was collected on scene
      if (status === 'COMPLETED' && effectiveCashCents > 0) {
        try {
          const driverId = updated.driverId || (req.user as any)?.id;
          if (driverId) {
            await prisma.driverCashLedger.create({
              data: {
                driverId,
                amountCents: effectiveCashCents,
                type: 'JOB_COLLECTION',
                jobId: updated.id,
                notes: `Cash collected on scene for Job #${updated.jobCode}`,
              },
            });
          }
        } catch (cashErr) {
          console.warn('Driver cash ledger creation failed:', cashErr);
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
          jobId: updated.id,
          jobCode: updated.jobCode,
          status: updated.status,
          countryCode: updated.countryCode,
          driverId: updated.driverId,
          driverName: (updated as any).driver?.fullName,
          updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : new Date().toISOString(),
        };

        // Notify dispatchers and admins
        io.to(`dispatch:${updated.countryCode}`).emit('job:status_updated', statusPayload);

        // Notify driver
        if (updated.driverId) {
          io.to(`driver:${updated.driverId}`).emit('job:status_updated', statusPayload);
          io.to(`user:${updated.driverId}`).emit('job:status_updated', statusPayload);
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
      const { driverId } = req.body;

      const driver = await prisma.user.findUnique({ where: { id: driverId } });
      if (!driver) return sendError(res, 'Driver not found', 404);

      const updated = await prisma.job.update({
        where: { id },
        data: {
          driverId,
          status: 'ASSIGNED',
          assignedAt: new Date(),
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
      } catch {}

      return sendSuccess(res, updated, 'Driver assigned successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async stateJobExpenses(req: Request, res: Response) {
    try {
      const userRole = (req.user as any)?.role;
      if (userRole && !['ADMIN', 'ACCOUNTANT'].includes(userRole)) {
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

      return sendSuccess(res, updated, 'Job expenses stated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async deleteJob(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await prisma.jobServiceItem.deleteMany({ where: { jobId: id } });
      await prisma.job.delete({ where: { id } });
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

      const job = await prisma.job.create({
        data: {
          jobCode,
          countryCode: country,
          currency: country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : 'CAD',
          serviceAddress: data.serviceAddress || 'Roadside Breakdown Location',
          recipientName: data.recipientName || data.customer?.name,
          recipientPhone: data.recipientPhone || data.customer?.phone,
          problemNotes: data.problemNotes || data.notes,
          urgency: data.urgency || 'STANDARD',
          source: 'LANDING_PAGE_SELF_BOOK',
          disposition: 'BOOKED',
          createdById: defaultUser.id,
          vehicleId: veh.id,
          subtotalCents,
          taxRateBps,
          taxAmountCents,
          totalCents,
          itPlatformFeeCents,
          paymentMethod: data.paymentMethod,
          paymentStatus: 'UNPAID',
          status: 'UNVERIFIED_PUBLIC',
          serviceItems: { create: serviceItemsCreate },
        },
        include: { serviceItems: true },
      });

      try {
        const io = getIO();
        io.to(`dispatch:${country}`).emit('job:triage_new', job);
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
