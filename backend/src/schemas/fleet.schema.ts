import { z } from 'zod';

export const createFleetSchema = z
  .object({
    fleetCode: z.string().optional().or(z.literal('')),
    name: z.string().optional(),
    companyName: z.string().optional(),
    contactPerson: z.string().optional(),
    contactName: z.string().optional(),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    website: z.string().optional().or(z.literal('')),
    countryCode: z.enum(['CA', 'US', 'UK']).optional().default('CA'),
    country: z.enum(['CA', 'US', 'UK']).optional(),
    status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED']).optional().default('APPROVED'),
    virtualAssistantId: z.string().uuid().optional().or(z.literal('')),
    paymentTerms: z.string().optional(),
    creditLimitCents: z.coerce.number().optional(),
  })
  .refine((data) => Boolean((data.name && data.name.trim()) || (data.companyName && data.companyName.trim())), {
    message: 'Company name is required',
    path: ['companyName'],
  });

export const updateFleetSchema = z
  .object({
    fleetCode: z.string().optional().or(z.literal('')),
    name: z.string().optional(),
    companyName: z.string().optional(),
    contactPerson: z.string().optional(),
    contactName: z.string().optional(),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    website: z.string().optional().or(z.literal('')),
    countryCode: z.enum(['CA', 'US', 'UK']).optional(),
    country: z.enum(['CA', 'US', 'UK']).optional(),
    status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED']).optional(),
    virtualAssistantId: z.string().uuid().optional().or(z.literal('')),
    paymentTerms: z.string().optional(),
    creditLimitCents: z.coerce.number().optional(),
  });

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
