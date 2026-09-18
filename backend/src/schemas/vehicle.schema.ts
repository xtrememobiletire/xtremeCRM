import { z } from 'zod';

export const createVehicleSchema = z.object({
  customerId: z.string().uuid().optional(),
  fleetId: z.string().uuid().optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).default('CA'),
  year: z.coerce.number().int().min(1900).max(2100),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  licensePlate: z.string().optional(),
  vin: z.string().optional(),
  tireSize: z.string().min(1, 'Tire size is required'),
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
