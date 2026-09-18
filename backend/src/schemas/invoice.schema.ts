import { z } from 'zod';

export const invoiceItemSchema = z.object({
  itemDetails: z.string().min(1, 'Item details required'),
  unitPriceCents: z.coerce.number().int().nonnegative(),
  quantity: z.coerce.number().int().positive().default(1),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid().optional(),
  fleetId: z.string().uuid().optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).default('CA'),
  currency: z.enum(['CAD', 'USD', 'GBP']).default('CAD'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(['E_TRANSFER', 'POS', 'CASH', 'MOTO', 'STRIPE']).optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one line item is required'),
});

export const generateInvoiceSchema = z.object({
  jobId: z.string().uuid('Valid Job ID is required'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED']),
  paymentMethod: z.enum(['E_TRANSFER', 'POS', 'CASH', 'MOTO', 'STRIPE']).optional(),
  paidAt: z.string().optional(),
});

export const invoiceQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).optional(),
  fleetId: z.string().optional(),
  customerId: z.string().optional(),
});
