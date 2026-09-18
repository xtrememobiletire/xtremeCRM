import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const regionSchema = z.enum(['CA', 'US', 'UK']);
