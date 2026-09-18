import { Request, Response } from 'express';
import { invoiceService } from '../services/invoiceService.js';
import { prisma } from '../config/database.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const accountingController = {
  async stateJobExpenses(req: Request, res: Response) {
    try {
      const { jobId, materialCostCents, repairerFeeCents, otherExpenseCents, expenseNotes } = req.body;
      const accountantId = (req.user as any)?.id;

      const job = await prisma.job.update({
        where: { id: jobId },
        data: {
          materialCostCents: materialCostCents || 0,
          repairerFeeCents: repairerFeeCents || 0,
          otherExpenseCents: otherExpenseCents || 0,
          expenseNotes,
          expenseStatedById: accountantId,
          expenseStatedAt: new Date(),
        },
      });

      sendSuccess(res, job, 'Job expenses stated successfully');
    } catch (err: any) {
      sendError(res, err.message, 400);
    }
  },

  async getInvoices(req: Request, res: Response) {
    try {
      const countryCode = (req.countryCode as any) || 'CA';
      const invoices = await prisma.invoice.findMany({
        where: { countryCode },
        orderBy: { createdAt: 'desc' },
        include: { items: true, customer: true, fleet: true },
      });
      sendSuccess(res, invoices);
    } catch (err: any) {
      sendError(res, err.message);
    }
  },

  async generateInvoice(req: Request, res: Response) {
    try {
      const createdById = (req.user as any)?.id;
      const invoice = await invoiceService.generateInvoice(req.body.jobId, createdById);
      sendSuccess(res, invoice, 'Invoice generated', 201);
    } catch (err: any) {
      sendError(res, err.message, 400);
    }
  },
};

export default accountingController;
