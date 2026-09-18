import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'UNVERIFIED_PUBLIC', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).optional(),
  urgency: z.enum(['URGENT', 'STANDARD', 'FUTURE']).optional(),
  driverId: z.string().optional(),
  fleetId: z.string().optional(),
  customerId: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'scheduledFor']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const CreateJobSchema = z.object({
  customerId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  fleetId: z.string().uuid().optional(),
  serviceAddress: z.string().min(3, { message: 'Service address must be at least 3 characters' }),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  urgency: z.enum(['URGENT', 'STANDARD', 'FUTURE']).default('STANDARD'),
  scheduledFor: z.string().optional(),
  services: z.array(z.string()).optional(),
  serviceItems: z.array(
    z.object({
      serviceName: z.string().min(1),
      category: z.enum(['TIRE_SERVICE', 'ROADSIDE_ASSISTANCE', 'MAINTENANCE']).default('TIRE_SERVICE'),
      unitPriceCents: z.coerce.number().int().nonnegative(),
      quantity: z.coerce.number().int().positive().default(1),
      notes: z.string().optional(),
    })
  ).optional(),
  problemNotes: z.string().optional(),
  quotedPriceCents: z.coerce.number().int().nonnegative().optional(),
  taxCents: z.coerce.number().int().nonnegative().default(0),
  taxRateBps: z.coerce.number().int().nonnegative().optional(),
  totalCents: z.coerce.number().int().nonnegative().optional(),
  currency: z.enum(['CAD', 'USD', 'GBP']).default('CAD'),
  paymentMethod: z.enum(['E_TRANSFER', 'POS', 'CASH', 'MOTO', 'STRIPE']).optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).default('CA'),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;

export const UpdateJobStatusSchema = z.object({
  status: z.enum(['PENDING', 'UNVERIFIED_PUBLIC', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

export type UpdateJobStatusInput = z.infer<typeof UpdateJobStatusSchema>;

export const AssignDriverSchema = z.object({
  driverId: z.string().uuid('Valid Driver UUID is required'),
});

export type AssignDriverInput = z.infer<typeof AssignDriverSchema>;
