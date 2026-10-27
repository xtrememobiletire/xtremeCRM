import { z } from 'zod';

export const createFleetSchema = z
  .object({
    fleetCode: z.string().optional().or(z.literal('')),
    name: z.string().optional(),
    companyName: z.string().optional(),
    contactPerson: z.string().optional(),
    contactName: z.string().optional(),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    password: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    website: z.string().optional().or(z.literal('')),
    countryCode: z.enum(['CA', 'US', 'UK']).optional().default('CA'),
    country: z.enum(['CA', 'US', 'UK']).optional(),
    status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED']).optional().default('APPROVED'),
    virtualAssistantId: z.string().uuid().optional().or(z.literal('')),
    paymentTerms: z.string().optional(),
    creditLimitCents: z.coerce.number().optional(),
    officeTimings: z.string().optional().or(z.literal('')),
    businessType: z.string().optional().or(z.literal('')),
    assignedDid: z.string().optional().or(z.literal('')),
    managerPhone: z.string().optional().or(z.literal('')),
    ceoOwnerName: z.string().optional().or(z.literal('')),
    fleetManager: z.string().optional().or(z.literal('')),
    managerUserId: z.string().uuid().optional().or(z.literal('')),
    poaEmail: z.string().email('Invalid POA email').optional().or(z.literal('')),
    altPhone: z.string().optional().or(z.literal('')),
    numberOfUnits: z.coerce.number().int().optional(),
    discountPercent: z.coerce.number().optional(),
    billingContactName: z.string().optional().or(z.literal('')),
    contractTermYears: z.coerce.number().int().optional(),
    contractStartDate: z.string().or(z.date()).optional().nullable(),
    contractEndDate: z.string().or(z.date()).optional().nullable(),
    governingProvince: z.string().optional().or(z.literal('')),
    customerSignatoryName: z.string().optional().or(z.literal('')),
    customerSignatoryTitle: z.string().optional().or(z.literal('')),
    providerSignatoryName: z.string().optional().or(z.literal('')),
    providerSignatoryTitle: z.string().optional().or(z.literal('')),
    contractDocumentUrl: z.string().optional().or(z.literal('')),
    vehicles: z.array(z.any()).optional(),
    drivers: z.array(z.any()).optional(),
  })
  .refine((data) => Boolean((data.name && data.name.trim()) || (data.companyName && data.companyName.trim())), {
    message: 'Company name is required',
    path: ['companyName'],
  });

export const updateFleetSchema = z
  .object({
    fleetCode: z.string().optional().or(z.literal('')),
    name: z.string().optional(),
    companyName: z.string().optional(),
    contactPerson: z.string().optional(),
    contactName: z.string().optional(),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    password: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    website: z.string().optional().or(z.literal('')),
    countryCode: z.enum(['CA', 'US', 'UK']).optional(),
    country: z.enum(['CA', 'US', 'UK']).optional(),
    status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED']).optional(),
    virtualAssistantId: z.string().uuid().optional().or(z.literal('')),
    paymentTerms: z.string().optional(),
    creditLimitCents: z.coerce.number().optional(),
    officeTimings: z.string().optional().or(z.literal('')),
    businessType: z.string().optional().or(z.literal('')),
    assignedDid: z.string().optional().or(z.literal('')),
    managerPhone: z.string().optional().or(z.literal('')),
    ceoOwnerName: z.string().optional().or(z.literal('')),
    fleetManager: z.string().optional().or(z.literal('')),
    managerUserId: z.string().uuid().optional().or(z.literal('')),
    poaEmail: z.string().email('Invalid POA email').optional().or(z.literal('')),
    altPhone: z.string().optional().or(z.literal('')),
    numberOfUnits: z.coerce.number().int().optional(),
    discountPercent: z.coerce.number().optional(),
    billingContactName: z.string().optional().or(z.literal('')),
    contractTermYears: z.coerce.number().int().optional(),
    contractStartDate: z.string().or(z.date()).optional().nullable(),
    contractEndDate: z.string().or(z.date()).optional().nullable(),
    governingProvince: z.string().optional().or(z.literal('')),
    customerSignatoryName: z.string().optional().or(z.literal('')),
    customerSignatoryTitle: z.string().optional().or(z.literal('')),
    providerSignatoryName: z.string().optional().or(z.literal('')),
    providerSignatoryTitle: z.string().optional().or(z.literal('')),
    contractDocumentUrl: z.string().optional().or(z.literal('')),
    vehicles: z.array(z.any()).optional(),
    drivers: z.array(z.any()).optional(),
  });

export const fleetQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  countryCode: z.enum(['CA', 'US', 'UK']).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED']).optional(),
});

export const addFleetDriverSchema = z.object({
  fullName: z.string().min(1, 'Driver name is required'),
  phone: z.string().min(7, 'Driver phone is required'),
  licensePlate: z.string().optional(),
});


export const registerFleetSchema = z
  .object({
    name: z.string().optional(),
    companyName: z.string().optional(),
    countryCode: z.enum(['CA', 'US', 'UK']).optional().default('CA'),
    website: z.string().optional().or(z.literal('')),
    contactPerson: z.string().optional(),
    contactName: z.string().optional(),
    phone: z.string().min(1, 'Phone number is required'),
    fleetManager: z.string().optional().or(z.literal('')),
    altPhone: z.string().optional().or(z.literal('')),
    address: z.string().min(1, 'Operating / depot address is required'),
    numberOfUnits: z.coerce.number().int().min(1, 'Number of units must be at least 1'),
    poaEmail: z.string().email('Invalid POA email').optional().or(z.literal('')),
    email: z.string().email('Valid portal login email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    ceoOwnerName: z.string().optional().or(z.literal('')),
    billingContactName: z.string().optional().or(z.literal('')),
    governingProvince: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) => Boolean((data.name && data.name.trim()) || (data.companyName && data.companyName.trim())),
    {
      message: 'Company legal name is required',
      path: ['name'],
    }
  )
  .refine(
    (data) => Boolean((data.contactPerson && data.contactPerson.trim()) || (data.contactName && data.contactName.trim())),
    {
      message: 'Primary contact person is required',
      path: ['contactPerson'],
    }
  );
