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
      if (countryCode) where.countryCode = countryCode;
      if (status) where.status = status;
      if (urgency) where.urgency = urgency;
      if (driverId) where.driverId = driverId;
      if (fleetId) where.fleetId = fleetId;
      if (customerId) where.customerId = customerId;
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

      const [jobs, totalCount] = await Promise.all([
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

      const country = data.countryCode || 'CA';
      const jobCode = `JOB-${country}-${Math.floor(10000 + Math.random() * 90000)}`;

      // Calculate totals if serviceItems provided
      let subtotalCents = data.quotedPriceCents || 0;
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
      const taxAmountCents = data.taxCents ?? Math.round((subtotalCents * taxRateBps) / 10000);
      const totalCents = data.totalCents ?? (subtotalCents + taxAmountCents);

      // IT platform royalty fee: CA: 150 cents ($1.50 CAD), US: 100 cents ($1.00 USD), UK: 100 pence (£1.00 GBP)
      const itPlatformFeeCents = country === 'CA' ? 150 : 100;

      const job = await prisma.job.create({
        data: {
          jobCode,
          countryCode: country,
          currency: country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : 'CAD',
          customerId: data.customerId,
          vehicleId: data.vehicleId,
          fleetId: data.fleetId,
          createdById: creatorId,
          serviceAddress: data.serviceAddress,
          recipientName: data.recipientName,
          recipientPhone: data.recipientPhone,
          problemNotes: data.problemNotes,
          urgency: data.urgency || 'STANDARD',
          appointmentDate: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
          subtotalCents,
          taxRateBps,
          taxAmountCents,
          totalCents,
          itPlatformFeeCents,
          paymentMethod: data.paymentMethod,
          paymentStatus: 'UNPAID',
          status: 'PENDING',
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
      const { status } = req.body;

      const job = await prisma.job.findUnique({ where: { id } });
      if (!job) return sendError(res, 'Job not found', 404);

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };
      if (status === 'ARRIVED') updateData.arrivedAt = new Date();
      if (status === 'COMPLETED') updateData.completedAt = new Date();

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

      try {
        const io = getIO();
        io.to(`dispatch:${updated.countryCode}`).emit('job:status_updated', {
          jobId: updated.id,
          status: updated.status,
        });
      } catch {}

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
        io.to(`driver:${driverId}`).emit('job:assigned', updated);
        io.to(`dispatch:${updated.countryCode}`).emit('job:driver_assigned', {
          jobId: updated.id,
          driverId,
        });
      } catch {}

      return sendSuccess(res, updated, 'Driver assigned successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async stateJobExpenses(req: Request, res: Response) {
    try {
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
};

export default jobController;
