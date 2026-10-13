import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  role: z.enum([
    'ADMIN',
    'GENERAL_MANAGER',
    'DEVELOPER',
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
  address: z.string().optional(),
  assignedVehicle: z.string().optional(),
  workingDays: z.string().optional(),
  workingHours: z.string().optional(),
  approvedByName: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });

export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  role: z.enum([
    'ADMIN',
    'GENERAL_MANAGER',
    'DEVELOPER',
    'CALL_AGENT',
    'DISPATCHER',
    'DRIVER',
    'ACCOUNTANT',
    'VIRTUAL_ASSISTANT',
    'FLEET_MANAGER',
    'CUSTOMER_MEMBER',
  ]).optional(),
  countryCode: z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z.enum(['CA', 'US', 'UK', 'ALL']).optional()
  ),
});
