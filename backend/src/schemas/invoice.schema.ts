import { z } from 'zod';

export const invoiceItemSchema = z.object({
  itemDetails: z.string().min(1, 'Item details required'),
  unitPriceCents: z.coerce.number().int().nonnegative(),
  quantity: z.coerce.number().int().positive().default(1),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid().optional(),
  fleetId: z.string().uuid().optional(),
  invoiceType: z.enum(['JOB', 'FLEET', 'MEMBER', 'CUSTOMER', 'CUSTOM']).optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).default('CA'),
  currency: z.enum(['CAD', 'USD', 'GBP']).default('CAD'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(['E_TRANSFER', 'POS', 'CASH', 'MOTO', 'STRIPE']).optional(),
  taxRatePercent: z.coerce.number().min(0).max(100).optional(),
  isTaxExempt: z.boolean().optional().default(false),
  depositCents: z.coerce.number().int().nonnegative().optional().default(0),
  discountCents: z.coerce.number().int().nonnegative().optional().default(0),
  items: z.array(invoiceItemSchema).min(1, 'At least one line item is required'),
});

export const generateInvoiceSchema = z.object({
  jobId: z.string().uuid('Valid Job ID is required').optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  taxRatePercent: z.coerce.number().min(0).max(100).optional(),
  isTaxExempt: z.boolean().optional().default(false),
  creditDeposit: z.boolean().optional().default(true),
  isWeeklyBatch: z.boolean().optional().default(false),
  paymentTerms: z.string().optional(),
  discountCents: z.coerce.number().int().nonnegative().optional().default(0),
  lineItems: z.array(z.object({
    itemDetails: z.string().optional(),
    description: z.string().optional(),
    unitPriceCents: z.coerce.number().int().nonnegative(),
    quantity: z.coerce.number().int().positive().default(1),
  })).optional(),
});

export const generateFleetConsolidatedSchema = z.object({
  fleetId: z.string().uuid('Valid Fleet ID is required'),
  jobIds: z.array(z.string().uuid()).min(1, 'At least one job ID is required'),
  dueDate: z.string().optional(),
  taxRatePercent: z.coerce.number().min(0).max(100).optional(),
  isTaxExempt: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

export const recordPaymentSchema = z.object({
  amountCents: z.coerce.number().int().positive('Payment amount must be greater than zero'),
  paymentMethod: z.enum(['E_TRANSFER', 'POS', 'CASH', 'MOTO', 'STRIPE']).default('E_TRANSFER'),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

export const recordFleetLumpSumPaymentSchema = z.object({
  fleetId: z.string().uuid('Valid Fleet ID is required'),
  amountCents: z.coerce.number().int().positive('Payment amount must be greater than zero'),
  paymentMethod: z.enum(['E_TRANSFER', 'POS', 'CASH', 'MOTO', 'STRIPE']).default('E_TRANSFER'),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']),
  paymentMethod: z.enum(['E_TRANSFER', 'POS', 'CASH', 'MOTO', 'STRIPE']).optional(),
  paidAt: z.string().optional(),
});

export const invoiceQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).optional(),
  invoiceType: z.enum(['JOB', 'FLEET', 'MEMBER', 'CUSTOMER', 'CUSTOM']).optional(),
  fleetId: z.string().optional(),
  customerId: z.string().optional(),
});
