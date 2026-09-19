import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  role: z
    .enum([
      'ADMIN',
      'CALL_AGENT',
      'DISPATCHER',
      'DRIVER',
      'ACCOUNTANT',
      'VIRTUAL_ASSISTANT',
      'FLEET_MANAGER',
      'CUSTOMER_MEMBER',
    ])
    .default('CALL_AGENT'),
  countryCode: z.enum(['CA', 'US', 'UK']).default('CA'),
});
