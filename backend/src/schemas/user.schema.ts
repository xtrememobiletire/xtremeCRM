import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  role: z.enum([
    'ADMIN',
    'CALL_AGENT',
    'DISPATCHER',
    'DRIVER',
    'ACCOUNTANT',
    'VIRTUAL_ASSISTANT',
    'FLEET_MANAGER',
    'CUSTOMER_MEMBER',
  ]).default('CALL_AGENT'),
  countryCode: z.enum(['CA', 'US', 'UK']).default('CA'),
  phone: z.string().optional(),
  isAgentActive: z.boolean().optional().default(false),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });

export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  role: z.enum([
    'ADMIN',
    'CALL_AGENT',
    'DISPATCHER',
    'DRIVER',
    'ACCOUNTANT',
    'VIRTUAL_ASSISTANT',
    'FLEET_MANAGER',
    'CUSTOMER_MEMBER',
  ]).optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).optional(),
});
