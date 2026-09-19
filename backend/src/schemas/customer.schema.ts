import { z } from 'zod';

export const createCustomerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(7, 'Valid phone number is required'),
  altPhone: z.string().optional(),
  email: z.string().email().optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).default('CA'),
  customerType: z.enum(['RETAIL', 'MEMBERSHIP']).default('RETAIL'),
  membershipTier: z.enum(['STANDARD', 'GOLD', 'PLATINUM']).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).optional(),
  customerType: z.enum(['RETAIL', 'MEMBERSHIP']).optional(),
});
