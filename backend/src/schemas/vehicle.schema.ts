import { z } from 'zod';

export const createVehicleSchema = z.object({
  customerId: z.string().uuid().optional().or(z.literal('')),
  fleetId: z.string().uuid().optional().or(z.literal('')),
  countryCode: z.enum(['CA', 'US', 'UK']).optional().default('CA'),
  year: z.coerce.number().int().min(1900).max(2100),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  color: z.string().optional().or(z.literal('')),
  unitNumber: z.string().optional().or(z.literal('')),
  unitType: z.string().optional().or(z.literal('')),
  licensePlate: z.string().optional().or(z.literal('')),
  vin: z.string().optional().or(z.literal('')),
  tireSize: z.string().optional().default('TBD'),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const vehicleQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  customerId: z.string().optional(),
  fleetId: z.string().optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).optional(),
});
