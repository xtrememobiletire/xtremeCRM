import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('20').transform(Number),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).optional(),
  urgency: z.enum(['URGENT', 'STANDARD', 'FUTURE']).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'scheduledFor']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const CreateJobSchema = z.object({
  customerId: z.string().optional(),
  vehicleId: z.string().optional(),
  serviceAddress: z.string().min(3, { message: 'Service address must be at least 3 characters' }),
  serviceLatitude: z.number().optional(),
  serviceLongitude: z.number().optional(),
  urgency: z.enum(['URGENT', 'STANDARD', 'FUTURE']).default('STANDARD'),
  scheduledFor: z.string().optional(),
  services: z.array(z.string()).min(1, { message: 'At least one service must be selected' }),
  problemNotes: z.string().optional(),
  quotedPriceCents: z.number().int().nonnegative().optional(),
  taxCents: z.number().int().nonnegative().default(0),
  totalCents: z.number().int().nonnegative(),
  currency: z.enum(['CAD', 'USD', 'GBP']).default('CAD'),
  paymentMethod: z.enum(['E_TRANSFER', 'POS', 'CASH', 'MOTO', 'STRIPE']).optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).default('CA'),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;

export const UpdateJobStatusSchema = z.object({
  status: z.enum(['PENDING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

export type UpdateJobStatusInput = z.infer<typeof UpdateJobStatusSchema>;

export const AssignDriverSchema = z.object({
  driverId: z.string().min(1, { message: 'Driver ID is required' }),
});

export type AssignDriverInput = z.infer<typeof AssignDriverSchema>;
