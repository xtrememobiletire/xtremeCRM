import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import {
  sendSuccess,
  sendError,
  sanitizePaginationParams,
  calculateSkip,
  createPaginatedResponse,
  formatCurrency,
} from '../utils/index.js';

export const accountingController = {
  /**
   * Regional P&L Accounting Summary (FR-6.1)
   * Strict regional currency isolation without blending
   */
  async getAccountingSummary(req: Request, res: Response) {
    try {
      const countryCode = (req.query.countryCode as any) || req.countryCode || 'CA';
      const { startDate, endDate, timeframe } = req.query;

      const dateFilter: any = {};
      const now = new Date();

      if (timeframe === 'yesterday') {
        const start = new Date(now);
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        dateFilter.gte = start;
        dateFilter.lte = end;
      } else if (timeframe === 'last_3_days') {
        const start = new Date(now);
        start.setDate(now.getDate() - 3);
        start.setHours(0, 0, 0, 0);
        dateFilter.gte = start;
      } else if (timeframe === 'last_7_days' || timeframe === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        dateFilter.gte = start;
      } else if (timeframe === 'monthly' || timeframe === 'month_to_date') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter.gte = start;
      } else {
        if (startDate) dateFilter.gte = new Date(startDate as string);
        if (endDate) dateFilter.lte = new Date(endDate as string);
      }

      const where: any = {
        countryCode,
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      };

      const jobs = await prisma.job.findMany({
        where,
        select: {
          id: true,
          status: true,
          totalCents: true,
          subtotalCents: true,
          materialCostCents: true,
          repairerFeeCents: true,
          otherExpenseCents: true,
          itPlatformFeeCents: true,
          currency: true,
        },
      });

      const totalJobs = jobs.length;
      const completedJobsList = jobs.filter((j) => j.status === 'COMPLETED');
      const completedJobs = completedJobsList.length;

      // PRD FR-6.3: Revenue and expenses are strictly computed on completed roadside fulfillment
      const grossRevenueCents = completedJobsList.reduce((sum, j) => sum + j.totalCents, 0);
      const materialCostCents = completedJobsList.reduce((sum, j) => sum + j.materialCostCents, 0);
      const repairerFeeCents = completedJobsList.reduce((sum, j) => sum + j.repairerFeeCents, 0);
      const otherExpenseCents = completedJobsList.reduce((sum, j) => sum + j.otherExpenseCents, 0);
      const itPlatformFeeCents = completedJobsList.reduce((sum, j) => sum + j.itPlatformFeeCents, 0);

      const totalDirectCostsCents = materialCostCents + repairerFeeCents + otherExpenseCents;
      const netProfitCents = grossRevenueCents - totalDirectCostsCents;
      const netAfterItRoyaltyCents = netProfitCents - itPlatformFeeCents;
      const averageMarginPercent = grossRevenueCents > 0
        ? (netProfitCents / grossRevenueCents) * 100
        : 0;

      const currency = countryCode === 'US' ? 'USD' : countryCode === 'UK' ? 'GBP' : 'CAD';

      const summary = {
        countryCode,
        currency,
        metrics: {
          totalJobs,
          completedJobs,
          grossRevenueCents,
          materialCostCents,
          repairerFeeCents,
          otherExpenseCents,
          totalDirectCostsCents,
          itPlatformFeeCents,
          netProfitCents,
          netAfterItRoyaltyCents,
          averageMarginPercent: Math.round(averageMarginPercent * 10) / 10,
        },
        formatted: {
          grossRevenue: formatCurrency(grossRevenueCents, currency),
          materialCosts: formatCurrency(materialCostCents, currency),
          repairerFees: formatCurrency(repairerFeeCents, currency),
          otherExpenses: formatCurrency(otherExpenseCents, currency),
          totalDirectCosts: formatCurrency(totalDirectCostsCents, currency),
          itRoyalty: formatCurrency(itPlatformFeeCents, currency),
          netProfit: formatCurrency(netProfitCents, currency),
          netAfterItRoyalty: formatCurrency(netAfterItRoyaltyCents, currency),
          averageMargin: `${(Math.round(averageMarginPercent * 10) / 10).toFixed(1)}%`,
        },
      };

      return sendSuccess(res, summary);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * Detailed Job Costing & Financial Reconciliation Ledger (FR-6.1, FR-6.3, FR-6.4, FR-6.7)
   */
  async getReconciliationJobs(req: Request, res: Response) {
    try {
      const countryCode = (req.query.countryCode as any) || req.countryCode || 'CA';
      const { startDate, endDate, timeframe, search } = req.query;
      const pageParam = req.query.page ? Number(req.query.page) : 1;
      const limitParam = req.query.limit ? Number(req.query.limit) : 50;
      const { page, limit } = sanitizePaginationParams(pageParam, limitParam);
      const skip = calculateSkip(page, limit);

      const dateFilter: any = {};
      const now = new Date();

      if (timeframe === 'yesterday') {
        const start = new Date(now);
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        dateFilter.gte = start;
        dateFilter.lte = end;
      } else if (timeframe === 'last_3_days' || timeframe === '3days') {
        const start = new Date(now);
        start.setDate(now.getDate() - 3);
        start.setHours(0, 0, 0, 0);
        dateFilter.gte = start;
      } else if (timeframe === 'last_7_days' || timeframe === '7days' || timeframe === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        dateFilter.gte = start;
      } else if (timeframe === 'monthly' || timeframe === 'month' || timeframe === 'month_to_date') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter.gte = start;
      } else {
        if (startDate) dateFilter.gte = new Date(startDate as string);
        if (endDate) dateFilter.lte = new Date(endDate as string);
      }

      const where: any = {
        countryCode,
        status: 'COMPLETED',
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      };

      if (search) {
        where.OR = [
          { jobCode: { contains: String(search), mode: 'insensitive' } },
          { serviceAddress: { contains: String(search), mode: 'insensitive' } },
          { customer: { fullName: { contains: String(search), mode: 'insensitive' } } },
          { fleet: { name: { contains: String(search), mode: 'insensitive' } } },
        ];
      }

      const [jobs, totalCount] = await Promise.all([
        prisma.job.findMany({
          where,
          skip,
          take: limit,
          orderBy: { completedAt: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
              },
            },
            vehicle: {
              select: {
                id: true,
                year: true,
                make: true,
                model: true,
                licensePlate: true,
                tireSize: true,
              },
            },
            fleet: {
              select: {
                id: true,
                name: true,
              },
            },
            serviceItems: {
              select: {
                id: true,
                serviceName: true,
                unitPriceCents: true,
                quantity: true,
              },
            },
            expenseStatedBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        }),
        prisma.job.count({ where }),
      ]);

      const records = jobs.map((j) => {
        const customerName = j.fleet?.name || j.customer?.fullName || 'Roadside Customer';
        const revenueCents = j.totalCents;
        const materialCostCents = j.materialCostCents || 0;
        const repairerFeeCents = j.repairerFeeCents || 0;
        const otherExpenseCents = j.otherExpenseCents || 0;
        const totalCostCents = materialCostCents + repairerFeeCents + otherExpenseCents;
        const netProfitCents = revenueCents - totalCostCents;
        const itPlatformFeeCents = j.itPlatformFeeCents || (j.countryCode === 'CA' ? 150 : 100);
        const netAfterItRoyaltyCents = netProfitCents - itPlatformFeeCents;
        const marginPercent = revenueCents > 0 ? (netProfitCents / revenueCents) * 100 : 0;

        return {
          id: j.id,
          jobNumber: j.jobCode,
          customerName,
          customer: j.customer,
          vehicle: j.vehicle,
          serviceAddress: j.serviceAddress,
          serviceItems: j.serviceItems,
          date: j.completedAt?.toISOString() || j.createdAt.toISOString(),
          revenueCents,
          costCents: totalCostCents,
          materialCostCents,
          repairerFeeCents,
          otherExpenseCents,
          expenseNotes: j.expenseNotes,
          itPlatformFeeCents,
          profitCents: netProfitCents,
          netAfterItRoyaltyCents,
          marginPercent: Math.round(marginPercent * 10) / 10,
          paymentStatus: j.paymentStatus,
          paymentMethod: j.paymentMethod,
          expenseStatedBy: j.expenseStatedBy,
          expenseStatedAt: j.expenseStatedAt,
        };
      });

      return res.status(200).json({
        success: true,
        data: records,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit) || 1,
        },
      });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * Accountant states job actual expenses (FR-6.1)
   */
  async stateJobExpenses(req: Request, res: Response) {
    try {
      const { jobId, materialCostCents, repairerFeeCents, otherExpenseCents, expenseNotes } = req.body;
      const accountantId = (req.user as any)?.id;

      const job = await prisma.job.update({
        where: { id: jobId },
        data: {
          materialCostCents: Number(materialCostCents) || 0,
          repairerFeeCents: Number(repairerFeeCents) || 0,
          otherExpenseCents: Number(otherExpenseCents) || 0,
          expenseNotes,
          expenseStatedById: accountantId,
          expenseStatedAt: new Date(),
        },
        include: {
          expenseStatedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      return sendSuccess(res, job, 'Job expenses stated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Driver Cash Audit Ledger (FR-4.6)
   */
  async getCashLedger(req: Request, res: Response) {
    try {
      const pageParam = req.query.page ? Number(req.query.page) : 1;
      const limitParam = req.query.limit ? Number(req.query.limit) : 20;
      const { page, limit } = sanitizePaginationParams(pageParam, limitParam);
      const skip = calculateSkip(page, limit);

      const driverId = req.query.driverId as string;
      const type = req.query.type as any;

      const where: any = {};
      if (driverId) where.driverId = driverId;
      if (type) where.type = type;

      const [entries, totalCount] = await Promise.all([
        prisma.driverCashLedger.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            driver: { select: { id: true, fullName: true, phone: true } },
            verifiedBy: { select: { id: true, fullName: true, email: true } },
            job: { select: { id: true, jobCode: true, serviceAddress: true } },
          },
        }),
        prisma.driverCashLedger.count({ where }),
      ]);

      const paginated = createPaginatedResponse(entries, page, limit, totalCount);
      return res.status(200).json(paginated);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async createCashTransaction(req: Request, res: Response) {
    try {
      const { driverId, amountCents, type, jobId, notes } = req.body;

      const entry = await prisma.driverCashLedger.create({
        data: {
          driverId,
          amountCents: Number(amountCents),
          type,
          jobId,
          notes,
        },
        include: {
          driver: { select: { id: true, fullName: true } },
          job: { select: { id: true, jobCode: true } },
        },
      });

      return sendSuccess(res, entry, 'Cash transaction recorded', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async verifyCashTransaction(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const accountantId = (req.user as any)?.id;

      const user = await prisma.user.findUnique({ where: { id: accountantId } });
      if (!user?.canApprovePayouts && user?.role !== 'ADMIN') {
        return sendError(res, 'Junior accountants cannot approve payouts. Senior accountant or Admin required.', 403);
      }

      const entry = await prisma.driverCashLedger.update({
        where: { id },
        data: {
          verifiedById: accountantId,
        },
        include: {
          verifiedBy: { select: { id: true, fullName: true } },
        },
      });

      return sendSuccess(res, entry, 'Cash transaction verified');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },
  async uploadReceipt(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const file = req.file;
      if (!file) return sendError(res, 'No receipt file uploaded', 400);

      const receiptUrl = `/uploads/receipts/${file.filename}`;
      const updated = await prisma.job.update({
        where: { id },
        data: { receiptUrl },
        select: { id: true, jobCode: true, receiptUrl: true },
      });

      return sendSuccess(res, updated, 'Receipt uploaded successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async uploadMaterialReceipt(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const file = req.file;
      if (!file) return sendError(res, 'No material receipt file uploaded', 400);

      const materialReceiptUrl = `/uploads/receipts/${file.filename}`;
      const updated = await prisma.job.update({
        where: { id },
        data: { materialReceiptUrl },
        select: { id: true, jobCode: true, materialReceiptUrl: true },
      });

      return sendSuccess(res, updated, 'Material receipt uploaded successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },
};

export default accountingController;
