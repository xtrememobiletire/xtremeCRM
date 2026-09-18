import { z } from 'zod';

/**
 * =====================================
 * JOB VALIDATION SCHEMAS
 * =====================================
 * Single source of truth for Job validation
 * Used by both Express routes and TypeScript types
 */

// Pagination Query Schema (Reusable for all endpoints)
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

// Create Job Schema
export const CreateJobSchema = z.object({
  customerId: z.string().uuid({ message: 'Invalid customer ID' }),
  vehicleId: z.string().uuid({ message: 'Invalid vehicle ID' }),
  serviceAddress: z.string().min(10, { message: 'Service address must be at least 10 characters' }),
  serviceLatitude: z.number().optional(),
  serviceLongitude: z.number().optional(),
  urgency: z.enum(['URGENT', 'STANDARD', 'FUTURE']),
  scheduledFor: z.string().datetime().optional(),
  services: z.array(z.string()).min(1, { message: 'At least one service must be selected' }),
  problemNotes: z.string().max(500).optional(),
  quotedPriceCents: z.number().int().nonnegative(),
  taxCents: z.number().int().nonnegative().default(0),
  totalCents: z.number().int().nonnegative(),
  currency: z.enum(['CAD', 'USD', 'GBP']),
  paymentMethod: z.enum(['E_TRANSFER', 'POS', 'CASH', 'MOTO']).optional(),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;

// Update Job Status Schema
export const UpdateJobStatusSchema = z.object({
  status: z.enum(['PENDING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

export type UpdateJobStatusInput = z.infer<typeof UpdateJobStatusSchema>;

// Assign Driver Schema
export const AssignDriverSchema = z.object({
  driverId: z.string().uuid({ message: 'Invalid driver ID' }),
});

export type AssignDriverInput = z.infer<typeof AssignDriverSchema>;
