import { z } from 'zod';

export const createExpenseSchema = z.object({
  jobId: z.string().min(1),
  category: z.enum(['TIRE_COST', 'DISPOSAL_FEE', 'LABOR', 'FUEL', 'MISC']),
  amountCents: z.number().int().positive(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
});

export const createInvoiceSchema = z.object({
  jobId: z.string().min(1),
  totalCents: z.number().int().positive(),
  taxCents: z.number().int().nonnegative(),
  currency: z.enum(['CAD', 'USD', 'GBP']).default('CAD'),
});
