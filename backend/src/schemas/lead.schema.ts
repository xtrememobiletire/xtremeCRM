import { z } from 'zod';

export const createBatchSchema = z.object({
  batchName: z.string().optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).optional().default('CA'),
  activationMode: z.enum(['IMMEDIATE', 'SCHEDULED']).optional().default('IMMEDIATE'),
  scheduledDate: z.string().or(z.date()).optional(),
  batchId: z.string().optional(),
  sheetName: z.string().optional(),
  assignedVaId: z.string().optional(),
  assignedAgentId: z.string().optional(),
});

export const uploadSpreadsheetSchema = createBatchSchema;

export const assignBatchSchema = z.object({
  assignedToId: z.string().uuid('Invalid agent UUID').optional().or(z.string().optional()),
  agentId: z.string().optional(),
});

export const updateDispositionSchema = z
  .object({
    disposition: z.enum([
      'INTERESTED',
      'CALLBACK',
      'VOICEMAIL',
      'NO_ANSWER',
      'RNC',
      'NOT_INTERESTED',
      'WRONG_NUMBER',
      'DNC',
      'DO_NOT_CALL',
      'CONVERTED',
      'WARM_TRANSFER',
    ]),
    status: z.string().optional(),
    notes: z.string().optional(),
    callbackDate: z.string().optional(),
    callbackDay: z.string().optional(),
    callbackTime: z.string().optional(),
    callbackTimezone: z.string().optional(),
    disqualificationReason: z.string().optional(),
    callbackData: z.record(z.string(), z.any()).optional(),
  })
  .refine(
    (data) => {
      if (data.disposition === 'CALLBACK') {
        const cbDate = data.callbackDate || (data.callbackData as any)?.callbackDate;
        return Boolean(cbDate && String(cbDate).trim() !== '');
      }
      return true;
    },
    {
      message: 'callbackDate is required when disposition is CALLBACK',
      path: ['callbackDate'],
    }
  );

export const trialServiceSchema = z.object({
  serviceType: z.string().optional(),
  address: z.string().optional(),
  location: z.string().optional(),
  scheduledDate: z.string().or(z.date()).optional(),
  driverId: z.string().optional().nullable(),
  unitNumber: z.string().optional(),
  tireSizes: z.string().optional(),
  description: z.string().optional(),
  priceDollars: z.coerce.number().optional(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
});

export const convertFleetSchema = z.object({
  companyName: z.string().optional(),
  contactPerson: z.string().optional(),
  fleetManager: z.string().optional(),
  ceoOwnerName: z.string().optional(),
  phone: z.string().optional(),
  altPhone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: z.string().optional(),
  paymentTerms: z.string().optional(),
  creditLimit: z.coerce.number().or(z.string()).optional(),
  creditLimitCents: z.coerce.number().optional(),
  poaEmail: z.string().email('Invalid POA email').optional().or(z.literal('')),
  address: z.string().optional(),
  website: z.string().optional(),
  fleetSize: z.coerce.number().optional(),
  numberOfUnits: z.coerce.number().optional(),
  customFleetCode: z.string().optional(),
  discountPercent: z.coerce.number().optional(),
  extraData: z.record(z.string(), z.any()).optional(),
  vehicles: z.array(z.any()).optional(),
  drivers: z.array(z.any()).optional(),
});

export const reviveBatchSchema = z.object({
  targetStatuses: z.array(z.string()).optional(),
  includeSoftDisqualified: z.boolean().optional(),
  includeUnworked: z.boolean().optional(),
  includeNoAnswerVoicemail: z.boolean().optional(),
  includeOverdueCallbacks: z.boolean().optional(),
  includeWrongNumbers: z.boolean().optional(),
  forceRevive: z.boolean().optional(),
  adminOverride: z.boolean().optional(),
  newAssigneeId: z.string().optional(),
  maxPasses: z.coerce.number().optional(),
});

export const createLeadSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  contactPerson: z.string().optional(),
  fleetManager: z.string().optional(),
  ceoOwnerName: z.string().optional(),
  altPhone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  poaEmail: z.string().email('Invalid POA email').optional().or(z.literal('')),
  address: z.string().optional(),
  website: z.string().optional(),
  numberOfUnits: z.coerce.number().optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).optional().default('CA'),
  notes: z.string().optional(),
  assignedAgentId: z.string().optional().nullable(),
  priority: z.coerce.number().optional().default(0),
  callbackDate: z.string().or(z.date()).optional(),
  callbackDay: z.string().optional(),
  callbackTime: z.string().optional(),
});

export const updateLeadSchema = z.object({
  companyName: z.string().optional(),
  contactPerson: z.string().optional().nullable(),
  fleetManager: z.string().optional().nullable(),
  ceoOwnerName: z.string().optional().nullable(),
  phone: z.string().optional(),
  altPhone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')).or(z.null()),
  poaEmail: z.string().email('Invalid POA email').optional().nullable().or(z.literal('')).or(z.null()),
  address: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  numberOfUnits: z.coerce.number().optional().nullable(),
  estimatedFleetSize: z.coerce.number().optional().nullable(),
  status: z.string().optional(),
  stage: z.string().optional(),
  disposition: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  priority: z.coerce.number().optional(),
  assignedAgentId: z.string().optional().nullable(),
  assignedDispatcherId: z.string().optional().nullable(),
  whatsappFollowUp: z.boolean().optional(),
  whatsappNotes: z.string().optional().nullable(),
  vehicleTypes: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  commonTireSizes: z.string().optional().nullable(),
  disqualificationReason: z.string().optional().nullable(),
  disqualifiedNotes: z.string().optional().nullable(),
  disqualifiedAtStage: z.string().optional().nullable(),
});
