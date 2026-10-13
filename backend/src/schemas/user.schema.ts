import { z } from 'zod';

const userRoleEnum = z.enum([
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
]);

const countryCodeEnum = z.enum(['CA', 'US', 'UK']);

export const baseUserSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  role: userRoleEnum,
  countryCode: countryCodeEnum,
  phone: z.string().optional(),
  isAgentActive: z.boolean().optional(),
  address: z.string().optional(),
  assignedVehicle: z.string().optional(),
  workingDays: z.string().optional(),
  workingHours: z.string().optional(),
  approvedByName: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const createUserSchema = baseUserSchema.extend({
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: userRoleEnum.default('CALL_AGENT'),
  countryCode: countryCodeEnum.default('CA'),
  isAgentActive: z.boolean().optional().default(false),
}).superRefine((data, ctx) => {
  const isExternalContractor = data.assignedVehicle === 'EXTERNAL_CONTRACTOR' || data.assignedVehicle?.startsWith('EXTERNAL');
  if (!isExternalContractor) {
    if (!data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email is required',
        path: ['email'],
      });
    }
    if (!data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password must be at least 6 characters',
        path: ['password'],
      });
    }
  }
});

export const updateUserSchema = baseUserSchema.extend({
  email: z.string().email('Invalid email address').optional(),
}).partial();

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
