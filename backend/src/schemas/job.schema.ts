import { z } from 'zod';

export const createJobSchema = z.object({
  customerId: z.string().optional(),
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  fleetId: z.string().optional(),
  serviceAddress: z.string().min(3, 'Service address is required'),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  problemNotes: z.string().optional(),
  urgency: z.enum(['URGENT', 'STANDARD', 'FUTURE']).default('STANDARD'),
  countryCode: z.enum(['CA', 'US', 'UK']).default('CA'),
  subtotalCents: z.number().int().nonnegative().default(0),
  taxAmountCents: z.number().int().nonnegative().default(0),
  totalCents: z.number().int().nonnegative().default(0),
});

export const updateJobStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'UNVERIFIED_PUBLIC',
    'ASSIGNED',
    'EN_ROUTE',
    'ARRIVED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
  ]),
  driverId: z.string().optional(),
  problemNotes: z.string().optional(),
});
