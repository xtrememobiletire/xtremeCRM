import { z } from 'zod';

export const createPortalMessageSchema = z.object({
  fleetId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  subject: z.string().min(1, 'Subject is required'),
  content: z.string().min(1, 'Content is required'),
  relatedEntityType: z.enum(['INVOICE', 'JOB', 'FLEET']).optional(),
  relatedEntityId: z.string().optional(),
});

export const portalMessageQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  fleetId: z.string().optional(),
  customerId: z.string().optional(),
  unreadOnly: z.enum(['true', 'false']).optional(),
});

export const createJobMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
});
