import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'UNVERIFIED_PUBLIC', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).optional(),
  urgency: z.preprocess(
    (val) => (val === 'NORMAL' ? 'STANDARD' : val === 'EMERGENCY' ? 'URGENT' : val),
    z.enum(['URGENT', 'STANDARD', 'FUTURE'])
  ).optional(),
  driverId: z.string().optional(),
  fleetId: z.string().optional(),
  customerId: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'scheduledFor']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const CreateJobSchema = z.object({
  customerId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  fleetId: z.string().uuid().optional(),
  serviceAddress: z.string().optional(),
  locationAddress: z.string().optional(),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  urgency: z.preprocess(
    (val) => (val === 'NORMAL' ? 'STANDARD' : val === 'EMERGENCY' ? 'URGENT' : val),
    z.enum(['URGENT', 'STANDARD', 'FUTURE']).default('STANDARD')
  ),
  source: z.enum(['DIRECT_CALL', 'WHATSAPP', 'WEBSITE', 'LANDING_PAGE_SELF_BOOK', 'FLEET_PORTAL', 'MEMBER_PORTAL']).optional().default('DIRECT_CALL'),
  scheduledFor: z.string().optional(),
  appointmentDate: z.string().optional(),
  services: z.array(z.string()).optional(),
  lineItems: z.array(
    z.object({
      serviceName: z.string().min(1),
      price: z.coerce.number().optional(),
      quantity: z.coerce.number().optional().default(1),
    })
  ).optional(),
  serviceItems: z.array(
    z.object({
      serviceName: z.string().min(1),
      category: z.enum(['TIRE_SERVICE', 'ROADSIDE_ASSISTANCE', 'MAINTENANCE']).default('TIRE_SERVICE'),
      unitPriceCents: z.coerce.number().int().nonnegative(),
      quantity: z.coerce.number().int().positive().default(1),
      notes: z.string().optional(),
    })
  ).optional(),
  customer: z.object({
    name: z.string().optional(),
    fullName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  vehicle: z.object({
    make: z.string().optional(),
    model: z.string().optional(),
    year: z.coerce.number().optional(),
    tireSize: z.string().optional(),
    licensePlate: z.string().optional(),
  }).optional(),
  problemNotes: z.string().optional(),
  notes: z.string().optional(),
  quotedPriceCents: z.coerce.number().int().nonnegative().optional(),
  subtotalAmount: z.coerce.number().optional(),
  subtotalCents: z.coerce.number().optional(),
  taxCents: z.coerce.number().int().nonnegative().optional(),
  taxAmount: z.coerce.number().optional(),
  taxRateBps: z.coerce.number().int().nonnegative().optional(),
  totalCents: z.coerce.number().int().nonnegative().optional(),
  totalAmount: z.coerce.number().optional(),
  currency: z.enum(['CAD', 'USD', 'GBP']).default('CAD'),
  paymentMethod: z.preprocess(
    (val) => (val === 'CREDIT_CARD' ? 'MOTO' : val),
    z.enum(['E_TRANSFER', 'POS', 'CASH', 'MOTO', 'STRIPE']).optional()
  ),
  countryCode: z.enum(['CA', 'US', 'UK']).default('CA'),
  country: z.enum(['CA', 'US', 'UK']).optional(),
  disposition: z.string().optional(),
  makeUserAccount: z.boolean().optional(),
}).refine((data) => data.serviceAddress || data.locationAddress, {
  message: 'Service breakdown address is required',
  path: ['serviceAddress'],
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;

export const UpdateJobStatusSchema = z.object({
  status: z.enum(['PENDING', 'UNVERIFIED_PUBLIC', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

export type UpdateJobStatusInput = z.infer<typeof UpdateJobStatusSchema>;

export const AssignDriverSchema = z.object({
  driverId: z.string().uuid('Valid Driver UUID is required'),
});

export type AssignDriverInput = z.infer<typeof AssignDriverSchema>;
