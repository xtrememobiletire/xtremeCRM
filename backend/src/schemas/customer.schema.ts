import { z } from 'zod';

export const createCustomerSchema = z
  .object({
    fullName: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().min(7, 'Valid phone number is required'),
    altPhone: z.string().optional().or(z.literal('')),
    email: z.string().email('Invalid email format').optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
    countryCode: z.enum(['CA', 'US', 'UK']).optional().default('CA'),
    customerType: z.enum(['RETAIL', 'MEMBERSHIP']).optional().default('RETAIL'),
    membershipTier: z.enum(['STANDARD', 'GOLD', 'PLATINUM']).optional(),
  })
  .refine((data) => Boolean(data.fullName?.trim() || data.name?.trim()), {
    message: 'Full name is required',
    path: ['fullName'],
  });

export const updateCustomerSchema = z
  .object({
    fullName: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().min(7).optional(),
    altPhone: z.string().optional().or(z.literal('')),
    email: z.string().email().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
    countryCode: z.enum(['CA', 'US', 'UK']).optional(),
    customerType: z.enum(['RETAIL', 'MEMBERSHIP']).optional(),
    membershipTier: z.enum(['STANDARD', 'GOLD', 'PLATINUM']).optional(),
  });

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).optional(),
  customerType: z.enum(['RETAIL', 'MEMBERSHIP']).optional(),
});
