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
      const { startDate, endDate } = req.query;

      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) dateFilter.lte = new Date(endDate as string);

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
      const completedJobs = jobs.filter((j) => j.status === 'COMPLETED').length;

      const grossRevenueCents = jobs.reduce((sum, j) => sum + j.totalCents, 0);
      const materialCostCents = jobs.reduce((sum, j) => sum + j.materialCostCents, 0);
      const repairerFeeCents = jobs.reduce((sum, j) => sum + j.repairerFeeCents, 0);
      const otherExpenseCents = jobs.reduce((sum, j) => sum + j.otherExpenseCents, 0);
      const itPlatformFeeCents = jobs.reduce((sum, j) => sum + j.itPlatformFeeCents, 0);

      const totalDirectCostsCents = materialCostCents + repairerFeeCents + otherExpenseCents;
      const netProfitCents = grossRevenueCents - totalDirectCostsCents;
      const netAfterItRoyaltyCents = netProfitCents - itPlatformFeeCents;

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
        },
      };

      return sendSuccess(res, summary);
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
};

export default accountingController;
