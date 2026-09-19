import { z } from 'zod';

export const createFleetSchema = z.object({
  fleetCode: z.string().optional(), // Auto-generated if omitted
  name: z.string().min(1, 'Company legal name is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  phone: z.string().min(7, 'Phone number is required'),
  email: z.string().email().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  countryCode: z.enum(['CA', 'US', 'UK']).default('US'),
  status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED']).default('APPROVED'),
  virtualAssistantId: z.string().uuid().optional(),
});

export const updateFleetSchema = createFleetSchema.partial();

export const fleetQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED']).optional(),
});

export const addFleetDriverSchema = z.object({
  fullName: z.string().min(1, 'Driver name is required'),
  phone: z.string().min(7, 'Driver phone is required'),
  licensePlate: z.string().optional(),
});
