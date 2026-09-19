import { z } from 'zod';

export const stateJobExpensesSchema = z.object({
  jobId: z.string().uuid('Valid Job ID is required'),
  materialCostCents: z.coerce.number().int().nonnegative().default(0),
  repairerFeeCents: z.coerce.number().int().nonnegative().default(0),
  otherExpenseCents: z.coerce.number().int().nonnegative().default(0),
  expenseNotes: z.string().optional(),
});

export const createCashLedgerSchema = z.object({
  driverId: z.string().uuid('Valid Driver ID is required'),
  amountCents: z.coerce.number().int(),
  type: z.enum(['JOB_COLLECTION', 'DISPATCHER_DEPOSIT', 'PAYOUT_DEDUCTION', 'ADJUSTMENT']),
  jobId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const cashLedgerQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  driverId: z.string().optional(),
  type: z.enum(['JOB_COLLECTION', 'DISPATCHER_DEPOSIT', 'PAYOUT_DEDUCTION', 'ADJUSTMENT']).optional(),
});

export const accountingSummaryQuerySchema = z.object({
  countryCode: z.enum(['CA', 'US', 'UK']).default('CA'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
