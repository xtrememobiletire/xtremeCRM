import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../config/database.js';
import {
  sendSuccess,
  sendError,
  sanitizePaginationParams,
  calculateSkip,
  createPaginatedResponse,
  validateAndNormalizePhone,
  normalizePhoneNumber,
  generateUniqueJobCode,
} from '../utils/index.js';
import { getIO } from '../config/socket.js';
import { geocodingService } from '../services/geocodingService.js';
import { sseManager } from '../services/sseManager.js';
import tzlookup from '@photostructure/tz-lookup';

const stripDriverFinancials = (job: any) => {
  const isAudited = Boolean(job.auditedById || job.expenseStatedById);
  const {
    materialCostCents,
    itPlatformFeeCents,
    expenseStatedById,
    otherExpenseCents,
    expenseNotes,
    expenseStatedAt,
    expenseStatedBy,
    invoice,
    ...rest
  } = job;
  return {
    ...rest,
    isAudited,
    expenseStatedById: isAudited ? (job.expenseStatedById || 'audited') : null,
  };
};

const normalizeUrgency = (u?: string | null): 'URGENT' | 'STANDARD' | 'FUTURE' => {
  if (!u) return 'STANDARD';
  const upper = String(u).toUpperCase();
  if (['CRITICAL', 'HIGH', 'EMERGENCY', 'URGENT'].includes(upper)) return 'URGENT';
  if (['LOW', 'FUTURE', 'SCHEDULED'].includes(upper)) return 'FUTURE';
  return 'STANDARD';
};

const validPaymentMethod = (
  pm?: string | null
): 'E_TRANSFER' | 'POS' | 'CASH' | 'MOTO' | 'STRIPE' | 'INVOICE_NET30' | null => {
  if (!pm) return null;
  const upper = String(pm).toUpperCase();
  if (upper === 'CREDIT_CARD' || upper === 'PHONE') return 'MOTO';
  if (['E_TRANSFER', 'POS', 'CASH', 'MOTO', 'STRIPE', 'INVOICE_NET30'].includes(upper)) {
    return upper as any;
  }
  return null;
};

export async function syncLinkedInvoiceFromJob(tx: any, jobId: string, actorId?: string) {
  try {
    const job = await tx.job.findUnique({
      where: { id: jobId },
      include: { serviceItems: true },
    });
    if (!job || !job.invoiceId) return null;

    const invoice = await tx.invoice.findUnique({
      where: { id: job.invoiceId },
      include: {
        items: true,
        jobs: { select: { id: true, upfrontAmountCents: true, totalCents: true, paymentStatus: true } },
      },
    });

    if (!invoice || invoice.status === 'PAID') return null;

    const isSingleJob = invoice.jobs.length <= 1;
    const depositCents = isSingleJob
      ? (job.upfrontAmountCents || 0)
      : invoice.jobs.reduce((sum: number, j: any) => sum + (j.upfrontAmountCents || 0), 0);

    let additionalPaid = 0;
    if (job.paymentStatus === 'VERIFIED_PAID' && isSingleJob) {
      const netDue = Math.max(0, invoice.totalCents - depositCents - invoice.amountPaidCents);
      additionalPaid = netDue;
      if (additionalPaid > 0) {
        await tx.invoicePayment.create({
          data: {
            invoiceId: invoice.id,
            amountCents: additionalPaid,
            paymentMethod: job.paymentMethod || 'CASH',
            referenceId: `Job ${job.jobCode} on-scene settlement`,
            recordedById: actorId,
          },
        });
      }
    }

    const newAmountPaid = invoice.amountPaidCents + additionalPaid;
    const newBalanceDue = Math.max(0, invoice.totalCents - depositCents - newAmountPaid);
    let newStatus = invoice.status;
    if (newBalanceDue === 0) {
      newStatus = 'PAID';
    } else if (newAmountPaid > 0 || depositCents > 0 || job.paymentStatus === 'PARTIAL') {
      newStatus = 'PARTIAL';
    }

    const updatedInv = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        depositCents,
        amountPaidCents: newAmountPaid,
        balanceDueCents: newBalanceDue,
        status: newStatus,
        ...(newStatus === 'PAID' && !invoice.paidAt ? { paidAt: new Date() } : {}),
      },
      include: {
        items: true,
        customer: true,
        fleet: true,
      },
    });

    return updatedInv;
  } catch (err) {
    console.warn(`[syncLinkedInvoiceFromJob] Failed for job ${jobId}:`, err);
    return null;
  }
}

export const jobController = {
  async getAllJobs(req: Request, res: Response) {
    try {
      const pageParam = req.query.page ? Number(req.query.page) : 1;
      const limitParam = req.query.limit ? Number(req.query.limit) : 20;
      const { page, limit } = sanitizePaginationParams(pageParam, limitParam);
      const skip = calculateSkip(page, limit);

      const countryCode = (req.query.countryCode as any) || req.countryCode;
      const status = req.query.status as any;
      const urgency = req.query.urgency as any;
      const driverId = req.query.driverId as string;
      const fleetId = req.query.fleetId as string;
      const customerId = req.query.customerId as string;
      const search = req.query.search as string;

      const isFleetJob = req.query.isFleetJob;
      const isFleetQuery = isFleetJob === 'true' || isFleetJob === '1';

      const where: any = {};
      if (countryCode && countryCode !== 'ALL') where.countryCode = countryCode;
      if (status === 'ACTIVE') {
        where.status = { notIn: ['COMPLETED', 'CANCELLED', 'UNVERIFIED_PUBLIC'] };
      } else if (status) {
        where.status = status;
      }
      if (urgency) where.urgency = urgency;
      if (driverId) where.driverId = driverId;

      // Strict role isolation: users only see their own work strictly on their respective portals
      const userRole = (req.user as any)?.role;
      const userId = (req.user as any)?.id;
      if (userRole === 'DRIVER') {
        if (status === 'CANCELLED') {
          where.OR = [
            { driverId: userId, status: 'CANCELLED' },
            { lastDeclinedDriverId: userId },
          ];
          delete where.status;
        } else {
          where.OR = [
            { driverId: userId },
            { lastDeclinedDriverId: userId },
          ];
        }
        delete where.countryCode;
      } else if (driverId) {
        if (status === 'CANCELLED') {
          where.OR = [
            { driverId, status: 'CANCELLED' },
            { lastDeclinedDriverId: driverId },
          ];
          delete where.status;
        } else {
          where.OR = [
            { driverId },
            { lastDeclinedDriverId: driverId },
          ];
        }
      } else if (userRole === 'FLEET_MANAGER') {
        const fleet = await prisma.fleet.findFirst({ where: { managerUserId: userId } });
        if (fleet) where.fleetId = fleet.id;
        else where.fleetId = '00000000-0000-0000-0000-000000000000';
      } else if (userRole === 'CUSTOMER_MEMBER') {
        const cust = await prisma.customer.findFirst({ where: { userId } });
        if (cust) where.customerId = cust.id;
        else where.customerId = '00000000-0000-0000-0000-000000000000';
      }

      if (fleetId && userRole !== 'FLEET_MANAGER') where.fleetId = fleetId;
      if (customerId && userRole !== 'CUSTOMER_MEMBER') where.customerId = customerId;
      const source = req.query.source as any;

      if (source) where.source = source;

      const andConditions: any[] = [];
      const jobCategory = req.query.jobCategory as string;

      // 1. Fleet vs Non-Fleet isolation (strict separation between /fleet-jobs and /jobs)
      if (isFleetJob === 'false' || isFleetJob === '0') {
        andConditions.push({
          fleetId: null,
          isTestService: false,
        });
      } else if (isFleetJob === 'true' || isFleetJob === '1') {
        andConditions.push({
          OR: [
            { fleetId: { not: null } },
            { isTestService: true },
          ],
        });
      }

      // 2. Active / Unverified status isolation
      if (status === 'ACTIVE') {
        andConditions.push({ status: { notIn: ['COMPLETED', 'CANCELLED', 'UNVERIFIED_PUBLIC'] } });
      } else if (!status) {
        andConditions.push({ status: { not: 'UNVERIFIED_PUBLIC' } });
      }

      // 3. Job Category refinement
      if (jobCategory === 'MEMBER') {
        andConditions.push({
          OR: [
            { source: 'MEMBER_PORTAL' },
            { customer: { customerType: 'MEMBERSHIP' } },
          ],
        });
      } else if (jobCategory === 'RETAIL') {
        andConditions.push({
          fleetId: null,
          isTestService: false,
          source: { not: 'MEMBER_PORTAL' },
          OR: [
            { customerId: null },
            { customer: { customerType: 'RETAIL' } },
          ],
        });
      } else if (jobCategory === 'FLEET') {
        andConditions.push({
          fleetId: { not: null },
        });
      } else if (jobCategory === 'TRIAL') {
        andConditions.push({
          isTestService: true,
        });
      }

      if (search) {
        andConditions.push({
          OR: [
            { jobCode: { contains: search, mode: 'insensitive' } },
            { serviceAddress: { contains: search, mode: 'insensitive' } },
            { recipientName: { contains: search, mode: 'insensitive' } },
            { recipientPhone: { contains: search } },
            { problemNotes: { contains: search, mode: 'insensitive' } },
          ],
        });
      }

      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const [rawJobs, totalCount] = await Promise.all([
        prisma.job.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            customer: true,
            vehicle: true,
            fleet: true,
            driver: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
            lastDeclinedDriver: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            serviceItems: true,
            lead: {
              select: {
                id: true,
                companyName: true,
                contactPerson: true,
                phone: true,
              },
            },
          },
        }),
        prisma.job.count({ where }),
      ]);

      const isDriver = (req.user as any)?.role === 'DRIVER';
      const jobs = rawJobs.map((j) => {
        const effectiveStatus = (j.dispositionNotes && ['EN_ROUTE', 'ON_SCENE', 'ARRIVED', 'ACCEPTED'].includes(j.dispositionNotes) && (j.status === 'IN_PROGRESS' || j.status === 'ASSIGNED'))
          ? (j.dispositionNotes === 'ARRIVED' ? 'ON_SCENE' : (j.dispositionNotes === 'ACCEPTED' ? 'ASSIGNED' : j.dispositionNotes))
          : j.status;
        const jobWithStatus = { ...j, status: effectiveStatus, rawStatus: j.status };
        if (isDriver) {
          // PRD NFR-4: Driver financial isolation
          return stripDriverFinancials(jobWithStatus);
        }
        return jobWithStatus;
      });

      const paginated = createPaginatedResponse(jobs, page, limit, totalCount);
      return res.status(200).json(paginated);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async getJobById(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const job = await prisma.job.findUnique({
        where: { id },
        include: {
          customer: true,
          vehicle: true,
          fleet: true,
          driver: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          lastDeclinedDriver: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          expenseStatedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          serviceItems: true,
          invoice: true,
        },
      });

      if (!job) return sendError(res, 'Job not found', 404);
      const effectiveStatus = (job.dispositionNotes && ['EN_ROUTE', 'ON_SCENE', 'ARRIVED', 'ACCEPTED'].includes(job.dispositionNotes) && (job.status === 'IN_PROGRESS' || job.status === 'ASSIGNED'))
        ? (job.dispositionNotes === 'ARRIVED' ? 'ON_SCENE' : (job.dispositionNotes === 'ACCEPTED' ? 'ASSIGNED' : job.dispositionNotes))
        : job.status;
      const jobWithStatus = { ...job, status: effectiveStatus, rawStatus: job.status };
      if ((req.user as any)?.role === 'DRIVER') {
        return sendSuccess(res, stripDriverFinancials(jobWithStatus));
      }
      return sendSuccess(res, jobWithStatus);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * Create a job with customer, vehicle, services, and totals in regional cents.
   * May merge duplicate customer profiles by phone, create a vehicle, and attempt
   * customer account provisioning when makeUserAccount is true; provisioning
   * preserves customerType and its failures do not fail job creation.
   * Tax rates are in basis points. Return HTTP 201 with related records and attempt
   * dispatch notifications; invalid phone, missing creator, and caught errors
   * become HTTP 400 responses. Earlier related writes may remain after a failure.
   */
  async createJob(req: Request, res: Response) {
    try {
      const data = req.body;
      const creatorId = (req.user as any)?.id || (await prisma.user.findFirst())?.id;
      if (!creatorId) return sendError(res, 'No user found for job creation', 400);

      const country = data.country || data.countryCode || 'CA';
      const jobCode = await generateUniqueJobCode(country, 'JOB');

      // 1. Auto-resolve or create Customer if nested details provided
      let customerId = data.customerId;
      const authUser = (req as any).user;

      if (!customerId && authUser?.id) {
        let memberCustomer = await prisma.customer.findUnique({
          where: { userId: authUser.id },
        });
        if (!memberCustomer && (authUser.email || authUser.phone)) {
          memberCustomer = await prisma.customer.findFirst({
            where: {
              OR: [
                ...(authUser.email ? [{ email: { equals: String(authUser.email), mode: 'insensitive' as const } }] : []),
                ...(authUser.phone ? [{ phone: String(authUser.phone) }] : []),
              ],
            },
          });
          if (memberCustomer && !memberCustomer.userId) {
            await prisma.customer.update({
              where: { id: memberCustomer.id },
              data: { userId: authUser.id },
            });
          }
        }
        if (!memberCustomer && authUser.role === 'CUSTOMER_MEMBER') {
          const fallbackPhone = authUser.phone || `+14165550${Math.floor(100 + Math.random() * 900)}`;
          memberCustomer = await prisma.customer.create({
            data: {
              userId: authUser.id,
              fullName: authUser.fullName || 'Member Customer',
              email: authUser.email,
              phone: fallbackPhone,
              countryCode: (['CA', 'US', 'UK'].includes(country) ? country : 'CA') as any,
              customerType: 'MEMBERSHIP',
              membershipTier: 'GOLD',
              membershipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
          });
        }
        if (memberCustomer) {
          customerId = memberCustomer.id;
          if (!data.recipientName) data.recipientName = memberCustomer.fullName;
          if (!data.recipientPhone) data.recipientPhone = memberCustomer.phone;
        }
      }

      if (!customerId && data.vehicleId) {
        const existingVeh = await prisma.vehicle.findUnique({
          where: { id: String(data.vehicleId) },
          include: { customer: true },
        });
        if (existingVeh?.customerId) {
          customerId = existingVeh.customerId;
          if (!data.recipientName && existingVeh.customer?.fullName) {
            data.recipientName = existingVeh.customer.fullName;
          }
          if (!data.recipientPhone && existingVeh.customer?.phone) {
            data.recipientPhone = existingVeh.customer.phone;
          }
        }
      }

      const rawPhone = data.customer?.phone || data.customerPhone || data.recipientPhone || data.phone;
      const name = data.customer?.name || data.customer?.fullName || data.customerName || data.recipientName || data.name;
      let normalizedContactPhone = '';

      if (rawPhone) {
        const phoneValidation = validateAndNormalizePhone(String(rawPhone), country);
        if (!phoneValidation.isValid) {
          return sendError(res, phoneValidation.error || 'Invalid customer phone number format', 400);
        }
        normalizedContactPhone = phoneValidation.normalized;
        const national10 = phoneValidation.national;

        if (!customerId) {
          // Smart lookup: Match existing customer by normalized E.164 OR by last 10 national digits
          const matchingCustomers = await prisma.customer.findMany({
            where: {
              countryCode: country as any,
              OR: [
                { phone: normalizedContactPhone },
                { phone: { endsWith: national10 } },
                { phone: national10 },
              ],
            },
            orderBy: { createdAt: 'asc' }, // oldest primary profile
          });

          let cust = matchingCustomers[0] || null;

          if (cust) {
            // Reconcile and merge duplicates transactionally if more than one profile matches this phone
            if (matchingCustomers.length > 1) {
              const duplicateIds = matchingCustomers.slice(1).map((c) => c.id);
              await prisma.$transaction([
                prisma.job.updateMany({
                  where: { customerId: { in: duplicateIds } },
                  data: { customerId: cust.id },
                }),
                prisma.vehicle.updateMany({
                  where: { customerId: { in: duplicateIds } },
                  data: { customerId: cust.id },
                }),
                prisma.invoice.updateMany({
                  where: { customerId: { in: duplicateIds } },
                  data: { customerId: cust.id },
                }),
                prisma.customer.deleteMany({
                  where: { id: { in: duplicateIds } },
                }),
              ]);
            }

            // Keep primary customer normalized to standard E.164
            if (cust.phone !== normalizedContactPhone) {
              cust = await prisma.customer.update({
                where: { id: cust.id },
                data: { phone: normalizedContactPhone },
              });
            }
          } else {
            // Create brand new customer with standardized E.164 phone
            cust = await prisma.customer.create({
              data: {
                fullName: name || 'Valued Customer',
                phone: normalizedContactPhone,
                email: data.customer?.email || data.customerEmail || data.email,
                countryCode: country as any,
              },
            });
          }
          customerId = cust.id;
        }
      }

      // 2. Auto-provision Customer Member Account if requested (PRD FR-1.3)
      if (data.makeUserAccount && customerId) {
        try {
          const cust = await prisma.customer.findUnique({ where: { id: customerId } });
          if (cust && !cust.userId) {
            const userEmail = cust.email || `cx_${cust.phone.replace(/[^0-9]/g, '')}@xtrememobiletire.com`;
            const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
            if (!existingUser) {
              const passwordHash = await bcrypt.hash('XtremeMember2026!', 10);
              const newUser = await prisma.user.create({
                data: {
                  email: userEmail,
                  passwordHash,
                  fullName: cust.fullName,
                  role: 'CUSTOMER_MEMBER',
                  countryCode: country,
                  phone: cust.phone,
                },
              });
              await prisma.customer.update({
                where: { id: cust.id },
                data: { userId: newUser.id },
              });
            }
          }
        } catch (provErr) {
          console.warn('Customer account provisioning skipped:', provErr);
        }
      }

      // 3. Auto-resolve or create Vehicle
      let vehicleId = data.vehicleId;
      if (!vehicleId) {
        const rawMakeModel = (data.vehicle?.makeModel || data.vehicleMakeModel || `${data.vehicle?.make || ''} ${data.vehicle?.model || ''}`).trim();
        let year = Number(data.vehicle?.year);
        let make = data.vehicle?.make;
        let model = data.vehicle?.model;

        if (rawMakeModel && (!make || !model)) {
          const parts = rawMakeModel.split(/\s+/);
          const parsedYear = parseInt(parts[0], 10);
          if (!isNaN(parsedYear) && parsedYear >= 1970 && parsedYear <= 2035) {
            year = parsedYear;
            make = parts[1] || 'Standard';
            model = parts.slice(2).join(' ') || 'Vehicle';
          } else {
            make = parts[0] || 'Standard';
            model = parts.slice(1).join(' ') || 'Vehicle';
          }
        }

        const tireSize = data.vehicle?.tireSize || data.tireSize || '225/65R17';
        const plate = data.vehicle?.licensePlate?.trim();
        let veh = plate
          ? await prisma.vehicle.findFirst({
              where: { licensePlate: plate, countryCode: country },
            })
          : null;
        if (!veh) {
          veh = await prisma.vehicle.create({
            data: {
              customerId: customerId || undefined,
              fleetId: data.fleetId || undefined,
              countryCode: country,
              year: year || new Date().getFullYear(),
              make: make || 'Standard',
              model: model || 'Vehicle',
              licensePlate: plate || undefined,
              unitNumber: data.vehicle?.unitNumber || undefined,
              tireSize: tireSize,
            },
          });
        }
        vehicleId = veh.id;
      }

      // 4. Calculate totals and service items
      let subtotalCents = data.subtotalAmount || data.subtotalCents || data.quotedPriceCents || 0;
      let serviceItemsCreate: any[] = [];

      if (data.serviceItems && data.serviceItems.length > 0) {
        serviceItemsCreate = data.serviceItems.map((item: any) => ({
          serviceName: item.serviceName,
          category: item.category || 'TIRE_SERVICE',
          unitPriceCents: item.unitPriceCents,
          quantity: item.quantity || 1,
          notes: item.notes,
        }));
        subtotalCents = serviceItemsCreate.reduce(
          (sum: number, item: any) => sum + item.unitPriceCents * item.quantity,
          0
        );
      } else if (data.lineItems && data.lineItems.length > 0) {
        serviceItemsCreate = data.lineItems.map((item: any) => ({
          serviceName: item.serviceName,
          category: 'TIRE_SERVICE',
          unitPriceCents: item.price || 5000,
          quantity: item.quantity || 1,
        }));
        subtotalCents = serviceItemsCreate.reduce(
          (sum: number, item: any) => sum + item.unitPriceCents * item.quantity,
          0
        );
      } else if (data.services && data.services.length > 0) {
        const itemPrice = Math.round((data.totalCents || 16000) / data.services.length);
        serviceItemsCreate = data.services.map((name: string) => ({
          serviceName: name,
          category: 'TIRE_SERVICE',
          unitPriceCents: itemPrice,
          quantity: 1,
        }));
        subtotalCents = data.totalCents || 16000;
      }

      let discountCents = 0;
      if (data.discountCents !== undefined && data.discountCents !== null) {
        discountCents = Math.max(0, Math.round(Number(data.discountCents)));
      } else if (data.source === 'MEMBER_PORTAL') {
        discountCents = Math.round(subtotalCents * 0.10);
      } else if (customerId) {
        const cust = await prisma.customer.findUnique({ where: { id: customerId }, select: { customerType: true } });
        if (cust?.customerType === 'MEMBERSHIP') {
          discountCents = Math.round(subtotalCents * 0.10);
        }
      }

      const netSubtotalCents = Math.max(0, subtotalCents - discountCents);
      const taxRateBps = data.taxRateBps ?? (country === 'CA' ? 1300 : country === 'UK' ? 2000 : 800);
      const taxAmountCents = data.taxCents ?? data.taxAmount ?? Math.round((netSubtotalCents * taxRateBps) / 10000);
      const totalCents = data.totalCents ?? data.totalAmount ?? (netSubtotalCents + taxAmountCents);

      // IT platform royalty fee: CA: 150 cents ($1.50 CAD), US: 100 cents ($1.00 USD), UK: 100 pence (£1.00 GBP)
      const itPlatformFeeCents = country === 'CA' ? 150 : 100;
      const serviceAddress = data.serviceAddress || data.locationAddress || 'Roadside Breakdown Location';
      const repairerFeeCents = data.repairerFeeCents !== undefined 
        ? Math.round(Number(data.repairerFeeCents)) 
        : 0;

      let serviceLatitude = data.serviceLatitude !== undefined && data.serviceLatitude !== null ? Number(data.serviceLatitude) : data.latitude ? Number(data.latitude) : null;
      let serviceLongitude = data.serviceLongitude !== undefined && data.serviceLongitude !== null ? Number(data.serviceLongitude) : data.longitude ? Number(data.longitude) : null;
      if (serviceAddress && (serviceLatitude === null || serviceLongitude === null)) {
        const geo = await geocodingService.geocodeAddress(serviceAddress, country);
        if (geo.latitude && geo.longitude) {
          serviceLatitude = geo.latitude;
          serviceLongitude = geo.longitude;
        }
      }

      const upfrontAmountCents = data.upfrontAmountCents !== undefined
        ? Math.round(Number(data.upfrontAmountCents))
        : (data.upfrontAmountDollars !== undefined ? Math.round(Number(data.upfrontAmountDollars) * 100) : 0);

      let initialPaymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID_PENDING_VERIFICATION' | 'VERIFIED_PAID' = 'UNPAID';
      const isTestService = Boolean(data.isTestService);
      if (isTestService && totalCents === 0) {
        initialPaymentStatus = 'VERIFIED_PAID'; // Complimentary $0.00 trial run requires no invoice chase
      } else if (upfrontAmountCents > 0) {
        initialPaymentStatus = upfrontAmountCents >= totalCents ? 'PAID_PENDING_VERIFICATION' : 'PARTIAL';
      }

      const defaultTz = country === 'UK' ? 'Europe/London' : country === 'US' ? 'America/New_York' : 'America/Toronto';
      let serviceTimezone = data.serviceTimezone || defaultTz;
      if (serviceLatitude !== null && serviceLongitude !== null) {
        try {
          serviceTimezone = tzlookup(serviceLatitude, serviceLongitude) || serviceTimezone;
        } catch {}
      }

      let validatedDriverId: string | undefined = undefined;
      if (data.driverId) {
        const drv = await prisma.user.findUnique({ where: { id: data.driverId } });
        if (drv && drv.countryCode === country) {
          validatedDriverId = drv.id;
        }
      }

      const job = await prisma.job.create({
        data: {
          jobCode,
          countryCode: country,
          currency: country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : 'CAD',
          customerId,
          vehicleId,
          fleetId: data.fleetId,
          isTestService,
          createdById: creatorId,
          serviceAddress,
          serviceLatitude,
          serviceLongitude,
          serviceTimezone,
          driverId: validatedDriverId,
          assignedAt: validatedDriverId ? new Date() : undefined,
          recipientName: data.prospectCompanyName
            ? `${data.prospectCompanyName}${data.recipientName ? ` (${data.recipientName})` : ''}`
            : (data.recipientName || data.customer?.name || data.customer?.fullName || data.customerName || name),
          recipientPhone: normalizedContactPhone || (data.recipientPhone ? normalizePhoneNumber(data.recipientPhone, country) : undefined),
          problemNotes: data.problemNotes || data.notes,
          urgency: normalizeUrgency(data.urgency),
          source: data.source || 'DIRECT_CALL',
          disposition: (data.disposition as any) || 'BOOKED',
          appointmentDate: data.appointmentDate 
            ? new Date(data.appointmentDate) 
            : data.arrivalWindowStart 
              ? new Date(data.arrivalWindowStart) 
              : data.estimatedArrivalMinutes
                ? new Date(Date.now() + Number(data.estimatedArrivalMinutes) * 60000)
                : data.scheduledFor 
                  ? new Date(data.scheduledFor) 
                  : undefined,
          arrivalWindowStart: data.arrivalWindowStart 
            ? new Date(data.arrivalWindowStart) 
            : data.estimatedArrivalMinutes
              ? new Date(Date.now() + Number(data.estimatedArrivalMinutes) * 60000)
              : undefined,
          arrivalWindowEnd: data.arrivalWindowEnd 
            ? new Date(data.arrivalWindowEnd) 
            : data.arrivalWindowStart
              ? new Date(new Date(data.arrivalWindowStart).getTime() + 30 * 60000)
              : data.estimatedArrivalMinutes
                ? new Date(Date.now() + (Number(data.estimatedArrivalMinutes) + 30) * 60000)
                : undefined,
          estimatedArrivalAt: data.estimatedArrivalAt 
            ? new Date(data.estimatedArrivalAt) 
            : data.arrivalWindowStart
              ? new Date(data.arrivalWindowStart)
              : data.estimatedArrivalMinutes 
                ? new Date(Date.now() + Number(data.estimatedArrivalMinutes) * 60000) 
                : undefined,
          subtotalCents,
          taxRateBps,
          taxAmountCents,
          totalCents,
          upfrontAmountCents,
          itPlatformFeeCents,
          repairerFeeCents,
          paymentMethod: validPaymentMethod(data.paymentMethod),
          paymentStatus: initialPaymentStatus,
          status: (['LANDING_PAGE_SELF_BOOK', 'WEBSITE', 'MEMBER_PORTAL', 'FLEET_PORTAL'].includes(data.source) || ['CUSTOMER_MEMBER', 'FLEET_MANAGER'].includes((req.user as any)?.role))
            ? 'UNVERIFIED_PUBLIC'
            : validatedDriverId
              ? 'ASSIGNED'
              : 'PENDING',
          serviceItems: {
            create: serviceItemsCreate,
          },
        },
        include: {
          customer: true,
          vehicle: true,
          fleet: true,
          serviceItems: true,
        },
      });

      // Notify dispatch room via socket & SSE
      try {
        const io = getIO();
        io.to(`dispatch:${country}`).emit('job:created', job);
        sseManager.broadcast(`sse:dispatch:${country}`, 'job:created', job);

        if (validatedDriverId) {
          io.to(`driver:${validatedDriverId}`).emit('job:assigned', job);
          sseManager.broadcast(`sse:user:${validatedDriverId}`, 'job:assigned', job);
        }
      } catch {}

      return sendSuccess(res, job, 'Job created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async updateJobStatus(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { status, urgency, paymentMethod, amountCents, cashAmountCents, cashCollected, receiptUrl, upfrontAmountCents, upfrontReceiptUrl, isUpfrontVerified, notes, problemNotes, driverId, serviceItems } = req.body;

      const job = await prisma.job.findUnique({ where: { id }, include: { serviceItems: true } });
      if (!job) return sendError(res, 'Job not found', 404);

      const callerRole = (req.user as any)?.role;
      const callerId = (req.user as any)?.id;
      if (callerRole === 'DRIVER' && job.driverId !== callerId) {
        return sendError(res, 'Forbidden: You are not assigned to this job', 403);
      }

      const isManagement = ['ADMIN', 'GENERAL_MANAGER', 'DISPATCHER', 'DEVELOPER'].includes(callerRole);
      const isModifyingRestrictedFields =
        serviceItems !== undefined ||
        upfrontAmountCents !== undefined ||
        isUpfrontVerified !== undefined ||
        upfrontReceiptUrl !== undefined ||
        driverId !== undefined;

      if (isModifyingRestrictedFields && !isManagement) {
        return sendError(res, 'Forbidden: Insufficient permissions to modify work order items, deposits, or driver assignment', 403);
      }

      let effectiveAmountCents = amountCents !== undefined
        ? Math.round(Number(amountCents))
        : (cashAmountCents !== undefined 
          ? Math.round(Number(cashAmountCents)) 
          : (cashCollected !== undefined ? Math.round(Number(cashCollected) * 100) : 0));

      const isTrialJob = Boolean(job.isTestService);

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (notes !== undefined || problemNotes !== undefined) {
        updateData.problemNotes = notes || problemNotes || '';
      }

      // Handle service items updates (Management editing work order catalog items)
      if (Array.isArray(serviceItems)) {
        const subtotal = serviceItems.reduce((sum: number, it: any) => sum + (Number(it.unitPriceCents) || 0) * (Number(it.quantity) || 1), 0);
        const taxRateBps = (job.taxRateBps !== null && job.taxRateBps !== undefined)
          ? job.taxRateBps
          : (job.countryCode === 'CA' ? 1300 : job.countryCode === 'UK' ? 2000 : 800);
        const tax = Math.round((subtotal * taxRateBps) / 10000);
        const newTotal = subtotal + tax;

        updateData.subtotalCents = subtotal;
        updateData.taxAmountCents = tax;
        updateData.totalCents = newTotal;
      }

      if (req.file) {
        const fileUrl = `/uploads/receipts/${req.file.filename}`;
        if (upfrontAmountCents !== undefined || upfrontReceiptUrl !== undefined) {
          updateData.upfrontReceiptUrl = fileUrl;
        }
      }

      if (upfrontReceiptUrl !== undefined) {
        updateData.upfrontReceiptUrl = upfrontReceiptUrl;
      }

      if (isUpfrontVerified) {
        updateData.upfrontVerifiedAt = new Date();
      }

      if (upfrontAmountCents !== undefined) {
        const parsedUpfront = Math.round(Number(upfrontAmountCents));
        updateData.upfrontAmountCents = parsedUpfront;
        const total = updateData.totalCents !== undefined ? updateData.totalCents : (job.totalCents || 0);
        if (job.status !== 'COMPLETED') {
          if (parsedUpfront >= total && total > 0) {
            updateData.paymentStatus = 'PAID_PENDING_VERIFICATION';
          } else if (parsedUpfront > 0) {
            updateData.paymentStatus = 'PARTIAL';
          } else if (job.paymentStatus === 'PARTIAL' || job.paymentStatus === 'PAID_PENDING_VERIFICATION') {
            updateData.paymentStatus = 'UNPAID';
          }
        }
      }

      if (driverId !== undefined) {
        updateData.driverId = driverId;
        if (driverId) {
          updateData.assignedAt = new Date();
          if (job.status === 'PENDING') {
            updateData.status = 'ASSIGNED';
          }
        }
      }

      if (status) {
        const rawStatus = String(status).toUpperCase();
        const mappedStatus = (rawStatus === 'ON_SCENE' || rawStatus === 'EN_ROUTE' || rawStatus === 'ARRIVED') 
          ? 'IN_PROGRESS' 
          : (rawStatus === 'ACCEPTED' ? 'ASSIGNED' : rawStatus);

        updateData.status = mappedStatus;
        if (['EN_ROUTE', 'ON_SCENE', 'ARRIVED', 'ACCEPTED'].includes(rawStatus)) {
          updateData.dispositionNotes = rawStatus === 'ARRIVED' ? 'ON_SCENE' : rawStatus;
        } else if (rawStatus === 'COMPLETED') {
          updateData.dispositionNotes = rawStatus;
        } else if (rawStatus === 'CANCELLED') {
          if (callerRole === 'DRIVER') {
            // Driver decline unassigns job back to PENDING so dispatcher can reassign
            const decliningDriverId = job.driverId || callerId;
            updateData.status = 'PENDING';
            updateData.driverId = null;
            updateData.lastDeclinedDriverId = decliningDriverId;
            updateData.assignedAt = null;
            updateData.driverEtaMinutes = null;
            updateData.driverEstimatedArrivalAt = null;
            if (req.body.driverDeclineReason) {
              updateData.driverDeclineReason = String(req.body.driverDeclineReason).toUpperCase();
              updateData.dispositionNotes = `DECLINED_${String(req.body.driverDeclineReason).toUpperCase()}`;
            } else {
              updateData.dispositionNotes = 'CANCELLED';
            }
          } else {
            // Admin / Dispatcher cancellation retains true CANCELLED status
            updateData.status = 'CANCELLED';
            updateData.dispositionNotes = 'CANCELLED';
          }
        }
      }
      if (urgency) updateData.urgency = urgency;
      if (status === 'COMPLETED') {
        const chosenMethod = paymentMethod || job.paymentMethod || 'CASH';

        if (!isTrialJob && effectiveAmountCents <= 0 && (!job.totalCents || job.totalCents <= 0)) {
          return sendError(res, 'Payment amount collected on scene is required to complete this job', 400);
        }

        if (!isTrialJob && job.totalCents && job.totalCents > 0) {
          if (effectiveAmountCents < job.totalCents) {
            return sendError(
              res,
              `Collected amount ($${(effectiveAmountCents / 100).toFixed(2)}) cannot be less than required invoice total ($${(job.totalCents / 100).toFixed(2)})`,
              400
            );
          }
          if (effectiveAmountCents > job.totalCents) {
            // If greater than required amount, write to default value
            effectiveAmountCents = job.totalCents;
          }
        }

        // Driver image proof checked client-side; disk storage halted pending Cloudflare R2
        updateData.completedAt = new Date();
        updateData.paymentMethod = chosenMethod;

        if (chosenMethod === 'CASH') {
          updateData.cashCollectedCents = effectiveAmountCents;
        }

        if (effectiveAmountCents > 0) {
          updateData.paymentStatus = 'PAID_PENDING_VERIFICATION';
          if (!job.totalCents || job.totalCents === 0) {
            updateData.totalCents = effectiveAmountCents;
            updateData.subtotalCents = effectiveAmountCents;
          }
        } else if (isTrialJob) {
          updateData.paymentStatus = 'VERIFIED_PAID';
        }
      }

      const txResult = await prisma.$transaction(
        async (tx: any) => {
          if (Array.isArray(serviceItems)) {
            await tx.jobServiceItem.deleteMany({ where: { jobId: id } });
            if (serviceItems.length > 0) {
              await tx.jobServiceItem.createMany({
                data: serviceItems.map((si: any) => ({
                  jobId: id,
                  serviceName: si.serviceName,
                  category: si.category || 'TIRE_SERVICE',
                  unitPriceCents: Number(si.unitPriceCents) || 0,
                  quantity: Number(si.quantity) || 1,
                  notes: si.notes || null,
                })),
              });
            }
          }

          const updatedJob = await tx.job.update({
            where: { id },
            data: updateData,
            include: {
              customer: true,
              vehicle: true,
              driver: true,
              lastDeclinedDriver: {
                select: {
                  id: true,
                  fullName: true,
                  phone: true,
                },
              },
              serviceItems: true,
            },
          });

          const syncedInvoice = await syncLinkedInvoiceFromJob(tx, id, callerId);
          return { updated: updatedJob, syncedInvoice };
        },
        {
          maxWait: 15000,
          timeout: 30000,
        }
      );

      const { updated, syncedInvoice } = txResult;
      if (syncedInvoice) {
        sseManager.broadcast(`sse:dispatch:${syncedInvoice.countryCode}`, 'invoice:updated', syncedInvoice);
      }

      // Auto-advance prospective lead to ADMIN_APPROVAL if complimentary trial job completed
      if (status === 'COMPLETED' && isTrialJob && job.leadId) {
        try {
          const updatedLead = await prisma.lead.update({
            where: { id: job.leadId },
            data: {
              stage: 'ADMIN_APPROVAL',
              status: 'CALLED',
            },
          });
          sseManager.broadcast(`sse:leads:${updatedLead.countryCode}`, 'lead:updated', updatedLead);
          sseManager.broadcast(`sse:leads:${updatedLead.countryCode}`, 'lead:stats_updated', { countryCode: updatedLead.countryCode });
        } catch (leadErr) {
          console.warn('Lead auto-advance to ADMIN_APPROVAL skipped:', leadErr);
        }
      }

      // VA Commission attribution on completed fleet jobs (PRD FR-2.1 / Rule 6.3)
      if (status === 'COMPLETED' && updated.fleetId) {
        try {
          const fleet = await prisma.fleet.findUnique({
            where: { id: updated.fleetId },
            select: { id: true, virtualAssistantId: true },
          });
          if (fleet?.virtualAssistantId) {
            const existingCommission = await prisma.fleetCommissionLedger.findFirst({
              where: { jobId: updated.id },
            });
            if (!existingCommission) {
              await prisma.fleetCommissionLedger.create({
                data: {
                  fleetId: fleet.id,
                  virtualAssistantId: fleet.virtualAssistantId,
                  jobId: updated.id,
                  amountCents: 250, // $2.50 agreed commission
                  notes: `Commission for completed job ${updated.jobCode}`,
                },
              });
            }
          }
        } catch (commErr) {
          console.warn('VA commission ledger skipped:', commErr);
        }
      }

      try {
        const io = getIO();
        const effectiveStatus = (updated.dispositionNotes && ['EN_ROUTE', 'ON_SCENE', 'ARRIVED', 'ACCEPTED'].includes(updated.dispositionNotes) && (updated.status === 'IN_PROGRESS' || updated.status === 'ASSIGNED'))
          ? (updated.dispositionNotes === 'ARRIVED' ? 'ON_SCENE' : (updated.dispositionNotes === 'ACCEPTED' ? 'ASSIGNED' : updated.dispositionNotes))
          : updated.status;

        const statusPayload = {
          id: updated.id,
          jobId: updated.id,
          jobCode: updated.jobCode,
          status: effectiveStatus,
          rawStatus: updated.status,
          technicianStatus: effectiveStatus,
          dispositionNotes: updated.dispositionNotes,
          countryCode: updated.countryCode,
          driverId: updated.driverId,
          driverName: (updated as any).driver?.fullName,
          lastDeclinedDriverId: updated.lastDeclinedDriverId,
          lastDeclinedDriver: (updated as any).lastDeclinedDriver,
          driverDeclineReason: updated.driverDeclineReason,
          urgency: updated.urgency,
          paymentMethod: updated.paymentMethod,
          paymentStatus: updated.paymentStatus,
          totalCents: updated.totalCents,
          upfrontAmountCents: updated.upfrontAmountCents,
          upfrontReceiptUrl: updated.upfrontReceiptUrl,
          problemNotes: updated.problemNotes,
          serviceItems: (updated as any).serviceItems,
          actorId: (req.user as any)?.id,
          updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : new Date().toISOString(),
        };

        // Notify dispatchers and admins
        io.to(`dispatch:${updated.countryCode}`).emit('job:status_updated', statusPayload);
        sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'job:status_updated', statusPayload);

        // Notify driver
        const driverRecipientId = updated.driverId || job.driverId || (req.user as any)?.id;
        if (driverRecipientId) {
          io.to(`driver:${driverRecipientId}`).emit('job:status_updated', statusPayload);
          io.to(`user:${driverRecipientId}`).emit('job:status_updated', statusPayload);
          sseManager.broadcast(`sse:driver:${driverRecipientId}`, 'job:status_updated', statusPayload);
        }

        // Notify ticket creator
        if (updated.createdById) {
          io.to(`user:${updated.createdById}`).emit('job:status_updated', statusPayload);
        }

        // When a job completes, notify Accountant for expense audit handoff (PRD FR-6.1)
        if (updated.status === 'COMPLETED') {
          const completionNotification = {
            type: 'JOB_COMPLETED',
            title: 'Job Completed — Audit Ready',
            jobId: updated.id,
            jobCode: updated.jobCode,
            driverName: (updated as any).driver?.fullName || 'Technician',
            customerName: (updated as any).customer?.fullName || updated.recipientName || 'Customer',
            vehicle: (updated as any).vehicle ? `${(updated as any).vehicle.year} ${(updated as any).vehicle.make} ${(updated as any).vehicle.model}` : 'Vehicle',
            totalCents: updated.totalCents,
            paymentMethod: updated.paymentMethod,
            timestamp: new Date().toISOString(),
            message: `Job #${updated.jobCode} completed by ${(updated as any).driver?.fullName || 'Technician'}. Ready for expense audit & reconciliation.`,
          };

          io.to(`accounting:${updated.countryCode}`).emit('accounting:job_completed', completionNotification);
        }
      } catch {}

      const updatedWithStatus = { ...updated, status: (updated.dispositionNotes && ['EN_ROUTE', 'ON_SCENE', 'ARRIVED', 'ACCEPTED'].includes(updated.dispositionNotes) && (updated.status === 'IN_PROGRESS' || updated.status === 'ASSIGNED')) ? (updated.dispositionNotes === 'ARRIVED' ? 'ON_SCENE' : (updated.dispositionNotes === 'ACCEPTED' ? 'ASSIGNED' : updated.dispositionNotes)) : updated.status, rawStatus: updated.status };

      if ((req.user as any)?.role === 'DRIVER') {
        return sendSuccess(res, stripDriverFinancials(updatedWithStatus), 'Job status updated successfully');
      }
      return sendSuccess(res, updatedWithStatus, 'Job status updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Assign a driver from the job's country and return the job with related records.
   * Driver ETA inputs are in minutes; explicit arrival dates take precedence.
   * Preserve the customer's promised arrival unless absent, then use driver arrival.
   * Attempt assignment notifications. Missing driver/job returns HTTP 404;
   * completed/cancelled jobs, country mismatches, and caught errors return 400.
   */
  async assignDriver(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { 
        driverId, 
        etaMinutes, 
        estimatedArrivalAt: customArrival,
        driverEtaMinutes: rawDriverEtaMinutes,
        driverEstimatedArrivalAt: rawDriverEstimatedArrivalAt,
      } = req.body;

      const [driver, job] = await Promise.all([
        prisma.user.findUnique({ where: { id: driverId } }),
        prisma.job.findUnique({ where: { id } }),
      ]);

      if (!driver) return sendError(res, 'Driver not found', 404);
      if (!job) return sendError(res, 'Job not found', 404);

      if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
        return sendError(res, `Cannot assign driver on a ${job.status.toLowerCase()} work order`, 400);
      }

      // Strict regional silo: region based jobs should only have region based drivers
      if (driver.countryCode !== job.countryCode) {
        return sendError(res, `Cannot assign ${driver.countryCode} driver to ${job.countryCode} job`, 400);
      }

      // Compute technician/driver-specific driving ETA:
      // Keep customer promised SLA (job.estimatedArrivalAt, arrivalWindowStart, arrivalWindowEnd) untouched!
      const effectiveDriverEtaMinutes = rawDriverEtaMinutes ?? etaMinutes;
      const driverEstimatedArrivalAt = rawDriverEstimatedArrivalAt 
        ? new Date(rawDriverEstimatedArrivalAt) 
        : customArrival 
        ? new Date(customArrival) 
        : effectiveDriverEtaMinutes 
        ? new Date(Date.now() + Number(effectiveDriverEtaMinutes) * 60000) 
        : undefined;

      const updated = await prisma.job.update({
        where: { id },
        data: {
          driverId,
          status: 'ASSIGNED',
          assignedAt: new Date(),
          lastDeclinedDriverId: null,
          driverDeclineReason: null,
          driverEstimatedArrivalAt,
          driverEtaMinutes: effectiveDriverEtaMinutes ? Number(effectiveDriverEtaMinutes) : undefined,
          // Preserve customer promised arrival time; only fallback if job had no promised ETA set
          estimatedArrivalAt: job.estimatedArrivalAt ?? driverEstimatedArrivalAt,
          updatedAt: new Date(),
        },
        include: {
          customer: true,
          vehicle: true,
          driver: true,
          serviceItems: true,
        },
      });

      try {
        const io = getIO();
        const stripped = stripDriverFinancials(updated);
        io.to(`driver:${driverId}`).emit('job:assigned', stripped);
        io.to(`user:${driverId}`).emit('notification:job_assigned', {
          type: 'JOB_ASSIGNED',
          title: 'New Dispatch Assigned',
          jobId: updated.id,
          jobCode: updated.jobCode,
          serviceAddress: updated.serviceAddress,
          tireSize: (updated as any).vehicle?.tireSize || 'N/A',
          urgency: updated.urgency,
          message: `You have been dispatched to Job #${updated.jobCode} at ${updated.serviceAddress}`,
          timestamp: new Date().toISOString(),
          job: stripped,
        });
        io.to(`dispatch:${updated.countryCode}`).emit('job:driver_assigned', {
          jobId: updated.id,
          jobCode: updated.jobCode,
          driverId,
          driverName: driver.fullName,
        });
        sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'job:driver_assigned', {
          id: updated.id,
          jobId: updated.id,
          jobCode: updated.jobCode,
          driverId,
          driverName: driver.fullName,
          status: updated.status,
          countryCode: updated.countryCode,
        });
        sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'job:assigned', updated);
        sseManager.broadcast(`sse:driver:${driverId}`, 'job:assigned', stripped);
      } catch {}

      return sendSuccess(res, updated, 'Driver assigned successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async verifyBookingAddress(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const {
        serviceAddress,
        serviceLatitude,
        serviceLongitude,
        serviceTimezone,
        appointmentDate,
        arrivalWindowStart,
        arrivalWindowEnd,
        estimatedArrivalAt,
        estimatedArrivalMinutes,
        driverId,
        recipientName,
        recipientPhone,
        problemNotes,
        urgency,
        paymentMethod,
        vehicleMake,
        vehicleModel,
        vehicleYear,
        vehicleColor,
        unitNumber,
        tireSize,
        licensePlate,
        discountCents: incomingDiscountCents,
        serviceItems: incomingServiceItems,
        requestedByName,
        addressNotes,
        upfrontAmountCents,
        upfrontReceiptUrl,
      } = req.body;

      const job = await prisma.job.findUnique({
        where: { id },
        include: { vehicle: true, serviceItems: true, customer: true, fleet: true },
      });
      if (!job) return sendError(res, 'Job not found', 404);

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (driverId) {
        const drv = await prisma.user.findUnique({ where: { id: String(driverId) } });
        if (drv && drv.countryCode === job.countryCode) {
          updateData.driverId = drv.id;
          updateData.assignedAt = new Date();
          updateData.status = 'ASSIGNED';
        }
      } else if (job.status === 'UNVERIFIED_PUBLIC') {
        updateData.status = 'PENDING';
      }

      if (serviceAddress) updateData.serviceAddress = serviceAddress;
      if (serviceLatitude !== undefined && serviceLatitude !== null) updateData.serviceLatitude = Number(serviceLatitude);
      if (serviceLongitude !== undefined && serviceLongitude !== null) updateData.serviceLongitude = Number(serviceLongitude);

      // Resolve accurate IANA timezone from verified Mapbox coordinates or incoming payload
      if (serviceLatitude !== undefined && serviceLatitude !== null && serviceLongitude !== undefined && serviceLongitude !== null) {
        try {
          updateData.serviceTimezone = tzlookup(Number(serviceLatitude), Number(serviceLongitude)) || serviceTimezone || job.serviceTimezone;
        } catch {
          if (serviceTimezone) updateData.serviceTimezone = serviceTimezone;
        }
      } else if (serviceTimezone) {
        updateData.serviceTimezone = serviceTimezone;
      }

      if (appointmentDate) updateData.appointmentDate = new Date(appointmentDate);
      if (arrivalWindowStart) {
        updateData.arrivalWindowStart = new Date(arrivalWindowStart);
        updateData.estimatedArrivalAt = new Date(arrivalWindowStart);
      } else if (estimatedArrivalAt) {
        updateData.estimatedArrivalAt = new Date(estimatedArrivalAt);
      } else if (estimatedArrivalMinutes) {
        const etaDate = new Date(Date.now() + Number(estimatedArrivalMinutes) * 60000);
        updateData.arrivalWindowStart = etaDate;
        updateData.estimatedArrivalAt = etaDate;
      }

      if (arrivalWindowEnd) {
        updateData.arrivalWindowEnd = new Date(arrivalWindowEnd);
      } else if (updateData.arrivalWindowStart) {
        updateData.arrivalWindowEnd = new Date(updateData.arrivalWindowStart.getTime() + 30 * 60000);
      }

      if (estimatedArrivalMinutes !== undefined && estimatedArrivalMinutes !== null) {
        updateData.estimatedArrivalMinutes = Number(estimatedArrivalMinutes);
      }

      if (recipientName) updateData.recipientName = recipientName;
      if (recipientPhone) {
        const pVal = validateAndNormalizePhone(recipientPhone, job.countryCode);
        updateData.recipientPhone = pVal.isValid ? pVal.normalized : recipientPhone;
      }

      // Preserve & format structured tags inside problemNotes
      if (requestedByName !== undefined || addressNotes !== undefined || problemNotes !== undefined) {
        const rawBase = problemNotes !== undefined ? problemNotes : (job.problemNotes || '');
        const reqName = requestedByName !== undefined ? String(requestedByName).trim() : null;
        const addrNote = addressNotes !== undefined ? String(addressNotes).trim() : null;

        const existingReqMatch = rawBase.match(/\[Requested By:\s*([^\]]+)\]/);
        const existingAddrMatch = rawBase.match(/\[Address Notes:\s*([^\]]+)\]/);
        const finalReqName = reqName !== null ? reqName : (existingReqMatch ? existingReqMatch[1].trim() : '');
        const finalAddrNote = addrNote !== null ? addrNote : (existingAddrMatch ? existingAddrMatch[1].trim() : '');

        const stripped = rawBase
          .replace(/\[Requested By:\s*[^\]]+\]\s*/g, '')
          .replace(/\[Address Notes:\s*[^\]]+\]\s*/g, '')
          .trim();

        const reqTag = finalReqName ? `[Requested By: ${finalReqName}] ` : '';
        const addrTag = finalAddrNote ? `[Address Notes: ${finalAddrNote}] ` : '';
        updateData.problemNotes = `${reqTag}${addrTag}${stripped}`.trim();
      }

      if (urgency) updateData.urgency = normalizeUrgency(urgency);
      if (paymentMethod !== undefined) updateData.paymentMethod = validPaymentMethod(paymentMethod);

      if (upfrontAmountCents !== undefined && upfrontAmountCents !== null) {
        updateData.upfrontAmountCents = Math.round(Number(upfrontAmountCents));
      }
      if (upfrontReceiptUrl !== undefined) {
        updateData.upfrontReceiptUrl = upfrontReceiptUrl ? String(upfrontReceiptUrl).trim() : null;
      }

      // Update or create vehicle specs (Crucial for mobile tire vans to stock the right tire)
      if (vehicleMake || vehicleModel || vehicleYear || vehicleColor !== undefined || tireSize || licensePlate !== undefined || unitNumber !== undefined) {
        const cleanPlate = licensePlate && String(licensePlate).trim() ? String(licensePlate).trim().toUpperCase() : undefined;
        if (job.vehicleId) {
          await prisma.vehicle.update({
            where: { id: job.vehicleId },
            data: {
              ...(vehicleMake ? { make: vehicleMake } : {}),
              ...(vehicleModel ? { model: vehicleModel } : {}),
              ...(vehicleYear ? { year: Number(vehicleYear) } : {}),
              ...(vehicleColor !== undefined ? { color: vehicleColor ? String(vehicleColor).trim() : null } : {}),
              ...(unitNumber !== undefined ? { unitNumber: unitNumber ? String(unitNumber).trim() : null } : {}),
              ...(tireSize ? { tireSize } : {}),
              ...(cleanPlate ? { licensePlate: cleanPlate } : {}),
            },
          });
        } else {
          const newVeh = await prisma.vehicle.create({
            data: {
              countryCode: job.countryCode,
              make: vehicleMake || 'Standard',
              model: vehicleModel || 'Vehicle',
              year: Number(vehicleYear) || new Date().getFullYear(),
              color: vehicleColor ? String(vehicleColor).trim() : null,
              unitNumber: unitNumber ? String(unitNumber).trim() : null,
              tireSize: tireSize || '225/65R17',
              licensePlate: cleanPlate || undefined,
            },
          });
          updateData.vehicleId = newVeh.id;
        }
      }

      // Update service items and recalculate totals if services provided
      if (incomingServiceItems && Array.isArray(incomingServiceItems) && incomingServiceItems.length > 0) {
        await prisma.jobServiceItem.deleteMany({ where: { jobId: id } });
        const itemsToCreate = incomingServiceItems.map((item: any) => ({
          jobId: id,
          serviceName: item.serviceName,
          category: item.category || 'TIRE_SERVICE',
          unitPriceCents: Number(item.unitPriceCents) || 5000,
          quantity: Number(item.quantity) || 1,
          notes: item.notes || null,
        }));
        await prisma.jobServiceItem.createMany({ data: itemsToCreate });
        const subtotal = itemsToCreate.reduce((s: number, i: any) => s + i.unitPriceCents * i.quantity, 0);

        // Contract or VIP discount calculation
        let discountCents = 0;
        if (incomingDiscountCents !== undefined && incomingDiscountCents !== null) {
          discountCents = Math.round(Number(incomingDiscountCents));
        } else if (job.fleet?.discountPercent) {
          discountCents = Math.round(subtotal * (Number(job.fleet.discountPercent) / 100));
        } else if (job.customer?.customerType === 'MEMBERSHIP' || job.source === 'MEMBER_PORTAL') {
          discountCents = Math.round(subtotal * 0.10);
        }
        const netSubtotal = Math.max(0, subtotal - discountCents);
        const taxRateBps = job.countryCode === 'CA' ? 1300 : job.countryCode === 'UK' ? 2000 : 800;
        const taxAmount = Math.round((netSubtotal * taxRateBps) / 10000);

        updateData.subtotalCents = subtotal;
        updateData.taxRateBps = taxRateBps;
        updateData.taxAmountCents = taxAmount;
        updateData.totalCents = netSubtotal + taxAmount;
      }

      const updated = await prisma.job.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          vehicle: true,
          serviceItems: true,
          fleet: true,
          driver: true,
        },
      });

      try {
        const io = getIO();
        io.to(`dispatch:${updated.countryCode}`).emit('job:verified', updated);
        if (driverId) {
          io.to(`dispatch:${updated.countryCode}`).emit('job:assigned', updated);
          io.to(`driver:${driverId}`).emit('job:assigned', updated);
          sseManager.broadcast(`sse:jobs:${driverId}`, 'job:assigned', updated);
        }
        sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'job:verified', updated);
      } catch {}

      return sendSuccess(res, updated, 'Booking address verified successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async stateJobExpenses(req: Request, res: Response) {
    try {
      const userRole = (req.user as any)?.role;
      if (userRole && !['ADMIN', 'GENERAL_MANAGER', 'ACCOUNTANT'].includes(userRole)) {
        return sendError(res, 'Only Administrators and Accountants can state job expenses', 403);
      }
      const id = String(req.params.id);
      const { materialCostCents, repairerFeeCents, otherExpenseCents, expenseNotes } = req.body;
      const accountantId = (req.user as any)?.id;

      const updated = await prisma.job.update({
        where: { id },
        data: {
          materialCostCents: Number(materialCostCents) || 0,
          repairerFeeCents: Number(repairerFeeCents) || 0,
          otherExpenseCents: Number(otherExpenseCents) || 0,
          expenseNotes,
          expenseStatedById: accountantId,
          expenseStatedAt: new Date(),
        },
        include: {
          expenseStatedBy: true,
        },
      });

      try {
        // Broadcast over SSE for zero-refetch UI sync without triggering dispatch alert chimes
        sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'job:status_updated', updated);
        if (updated.driverId) {
          const strippedForDriver = stripDriverFinancials(updated);
          sseManager.broadcast(`sse:driver:${updated.driverId}`, 'job:status_updated', strippedForDriver);
        }
      } catch {}

      return sendSuccess(res, updated, 'Job expenses stated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async deleteJob(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const existing = await prisma.job.findUnique({ where: { id }, select: { countryCode: true, driverId: true } });
      await prisma.jobServiceItem.deleteMany({ where: { jobId: id } });
      await prisma.job.delete({ where: { id } });

      if (existing) {
        try {
          const io = getIO();
          io.to(`dispatch:${existing.countryCode}`).emit('job:deleted', { id });
        } catch {}
        sseManager.broadcast(`sse:dispatch:${existing.countryCode}`, 'job:deleted', { id, countryCode: existing.countryCode });
        if (existing.driverId) {
          sseManager.broadcast(`sse:driver:${existing.driverId}`, 'job:deleted', { id });
        }
      }

      return sendSuccess(res, null, 'Job deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async createPublicBooking(req: Request, res: Response) {
    try {
      const data = req.body;
      const country = data.country || data.countryCode || 'CA';
      const jobCode = await generateUniqueJobCode(country, 'PUB');

      const defaultUser = (await prisma.user.findFirst({ where: { role: 'ADMIN' } })) || (await prisma.user.findFirst());
      if (!defaultUser) return sendError(res, 'System user not configured', 500);

      const vehicleYear = Number(data.vehicle?.year) || new Date().getFullYear();
      const vehicleMake = data.vehicle?.make || 'Standard';
      const vehicleModel = [data.vehicle?.model || 'Vehicle', data.vehicle?.trim].filter(Boolean).join(' ');

      const veh = await prisma.vehicle.create({
        data: {
          countryCode: country,
          year: vehicleYear,
          make: vehicleMake,
          model: vehicleModel,
          tireSize: data.vehicle?.tireSize || 'TBD',
          licensePlate: data.vehicle?.licensePlate || undefined,
        },
      });

      let subtotalCents = 0;
      let serviceItemsCreate: any[] = [];
      if (data.serviceItems?.length) {
        serviceItemsCreate = data.serviceItems.map((item: any) => ({
          serviceName: item.serviceName,
          category: item.category || 'TIRE_SERVICE',
          unitPriceCents: item.unitPriceCents || 5000,
          quantity: item.quantity || 1,
        }));
        subtotalCents = serviceItemsCreate.reduce((s: number, i: any) => s + i.unitPriceCents * i.quantity, 0);
      }

      const taxRateBps = country === 'CA' ? 1300 : country === 'UK' ? 2000 : 800;
      const taxAmountCents = Math.round((subtotalCents * taxRateBps) / 10000);
      const totalCents = subtotalCents + taxAmountCents;
      const itPlatformFeeCents = country === 'CA' ? 150 : 100;
      const serviceAddress = data.serviceAddress || 'Roadside Breakdown Location';
      let serviceLatitude = data.serviceLatitude !== undefined && data.serviceLatitude !== null ? Number(data.serviceLatitude) : null;
      let serviceLongitude = data.serviceLongitude !== undefined && data.serviceLongitude !== null ? Number(data.serviceLongitude) : null;
      if (serviceAddress && (serviceLatitude === null || serviceLongitude === null)) {
        const geo = await geocodingService.geocodeAddress(serviceAddress, country);
        if (geo.latitude && geo.longitude) {
          serviceLatitude = geo.latitude;
          serviceLongitude = geo.longitude;
        }
      }

      const appointmentDate = data.appointmentDate 
        ? new Date(data.appointmentDate) 
        : data.scheduledFor 
          ? new Date(data.scheduledFor) 
          : undefined;

      const arrivalWindowStart = data.arrivalWindowStart
        ? new Date(data.arrivalWindowStart)
        : appointmentDate;

      const arrivalWindowEnd = data.arrivalWindowEnd
        ? new Date(data.arrivalWindowEnd)
        : arrivalWindowStart
          ? new Date(arrivalWindowStart.getTime() + 60 * 60000)
          : undefined;

      const customerEmail = data.customer?.email || data.email || data.customerEmail;
      const customerNotes = [
        data.problemNotes || data.notes,
        data.vehicle?.trim ? `Trim/Submodel: ${data.vehicle.trim}` : null,
        customerEmail ? `Customer Email: ${customerEmail}` : null,
      ].filter(Boolean).join('\n');

      const job = await prisma.job.create({
        data: {
          jobCode,
          countryCode: country,
          currency: country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : 'CAD',
          serviceAddress,
          serviceLatitude,
          serviceLongitude,
          recipientName: data.recipientName || data.customer?.name || data.customerName,
          recipientPhone: data.recipientPhone || data.customer?.phone || data.customerPhone,
          problemNotes: customerNotes,
          urgency: normalizeUrgency(data.urgency),
          source: 'WEBSITE',
          disposition: 'BOOKED',
          createdById: defaultUser.id,
          vehicleId: veh.id,
          subtotalCents,
          taxRateBps,
          taxAmountCents,
          totalCents,
          itPlatformFeeCents,
          appointmentDate,
          arrivalWindowStart,
          arrivalWindowEnd,
          paymentMethod: validPaymentMethod(data.paymentMethod),
          paymentStatus: 'UNPAID',
          status: 'UNVERIFIED_PUBLIC',
          serviceItems: { create: serviceItemsCreate },
        },
        include: { serviceItems: true, vehicle: true },
      });

      try {
        const io = getIO();
        io.to(`dispatch:${country}`).emit('job:triage_new', job);
        sseManager.broadcast(`sse:dispatch:${country}`, 'booking:created', job);
        sseManager.broadcast(`sse:dispatch:${country}`, 'job:created', job);
      } catch {}

      return sendSuccess(res, { id: job.id, jobCode: job.jobCode, status: job.status }, 'Booking received — our team will contact you shortly', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async recordDisposition(req: Request, res: Response) {
    try {
      const { callerPhone, disposition, reason, countryCode } = req.body;
      const agentId = (req.user as any)?.id || (await prisma.user.findFirst())?.id;
      if (!agentId) return sendError(res, 'No agent user found', 400);

      let dispVeh = await prisma.vehicle.findFirst({ where: { licensePlate: 'DISPOSITION' } });
      if (!dispVeh) {
        dispVeh = await prisma.vehicle.create({
          data: {
            licensePlate: 'DISPOSITION',
            make: 'Disposition',
            model: 'Inquiry',
            year: 2026,
            tireSize: 'N/A',
            countryCode: countryCode || 'CA',
          },
        });
      }

      // Store as a job record with disposition vehicle for analytics
      const jobCode = `DSP-${countryCode || 'CA'}-${Math.floor(10000 + Math.random() * 90000)}`;
      const validDispositions = ['BOOKED', 'RELEVANT_NOT_CONVERTED', 'WRONG_NUMBER', 'IRRELEVANT_SERVICE', 'CANCELLED_BY_CUSTOMER'];
      const resolvedDisp = validDispositions.includes(disposition) ? disposition : 'RELEVANT_NOT_CONVERTED';

      const job = await prisma.job.create({
        data: {
          jobCode,
          countryCode: countryCode || 'CA',
          currency: countryCode === 'US' ? 'USD' : countryCode === 'UK' ? 'GBP' : 'CAD',
          recipientPhone: callerPhone || undefined,
          serviceAddress: 'N/A — Disposition Only',
          disposition: resolvedDisp,
          problemNotes: reason || undefined,
          source: 'DIRECT_CALL',
          urgency: 'STANDARD',
          status: 'CANCELLED',
          createdById: agentId,
          vehicleId: dispVeh.id,
          subtotalCents: 0,
          taxRateBps: 0,
          taxAmountCents: 0,
          totalCents: 0,
          itPlatformFeeCents: 0,
        },
      });

      return sendSuccess(res, { id: job.id, disposition }, 'Disposition recorded', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Assign an external contractor and return the job, token, and relative public URL.
   * Reuse an existing token and reset dispatch status to PENDING. Match a driver
   * by phone or name, creating one if needed; geocode an address when coordinates
   * are missing. Fees are in cents (externalDriverFeeCents takes precedence over
   * contractorPayoutFeeCents), and ETA is in minutes. Emit job:updated.
   * Returns HTTP 404 for a missing job and 400 for completed/cancelled jobs or
   * caught errors; contractor writes may remain if a later job update fails.
   */
  async generateExternalDispatch(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
        const {
          externalDriverName,
          externalCompanyName,
          externalDriverPhone,
          externalDriverAddress,
          latitude,
          longitude,
          externalDriverFeeCents,
          contractorPayoutFeeCents,
          driverEtaMinutes,
          driverEstimatedArrivalAt,
          paymentCollectionMode,
        } = req.body || {};

      const job = await prisma.job.findUnique({ where: { id } });
      if (!job) return sendError(res, 'Job not found', 404);

      if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
        return sendError(res, `Cannot dispatch on a ${job.status.toLowerCase()} work order`, 400);
      }

      const contractorName = externalCompanyName || externalDriverName || job.externalCompanyName || 'External Contractor';
      const contractorPhone = externalDriverPhone || job.externalDriverPhone || null;
      const contractorAddress = externalDriverAddress || null;

      // Issue fresh token if contractor changed, job was previously declined, or no token exists
      const isSameContractor = Boolean(
        job.externalDispatchToken &&
        job.externalDispatchStatus !== 'DENIED' &&
        (!job.externalDriverPhone || job.externalDriverPhone === contractorPhone) &&
        (!job.externalCompanyName || job.externalCompanyName === contractorName)
      );
      const token = isSameContractor ? (job.externalDispatchToken as string) : crypto.randomUUID();

      const feeCents = externalDriverFeeCents !== undefined
        ? Number(externalDriverFeeCents)
        : contractorPayoutFeeCents !== undefined
        ? Number(contractorPayoutFeeCents)
        : job.externalDriverFeeCents;

      let contractorLat = latitude !== undefined && latitude !== null ? Number(latitude) : undefined;
      let contractorLng = longitude !== undefined && longitude !== null ? Number(longitude) : undefined;

      if ((contractorLat === undefined || contractorLng === undefined) && contractorAddress) {
        const geo = await geocodingService.geocodeAddress(contractorAddress, job.countryCode || 'CA');
        if (geo.latitude !== null && geo.longitude !== null) {
          contractorLat = geo.latitude;
          contractorLng = geo.longitude;
        }
      }

      // Auto-upsert contractor User record with coordinates so their jobs appear in Drivers.tsx & calculate real ETA
      let contractorUserId: string | null = job.driverId;

      if (contractorPhone || contractorName) {
        let existingUser = await prisma.user.findFirst({
          where: {
            role: 'DRIVER',
            deletedAt: null,
            countryCode: job.countryCode || 'CA',
            assignedVehicle: { startsWith: 'EXTERNAL' },
            ...(contractorPhone
              ? { phone: contractorPhone }
              : { fullName: { equals: contractorName, mode: 'insensitive' } }),
          },
        });

        if (!existingUser) {
          const randSuffix = crypto.randomBytes(4).toString('hex');
          const email = `contractor_${Date.now()}_${randSuffix}@external.xtremetire.com`;
          const dummyHash = await bcrypt.hash(`Ext_${Date.now()}_${randSuffix}`, 10);

          existingUser = await prisma.user.create({
            data: {
              fullName: contractorName,
              email,
              passwordHash: dummyHash,
              role: 'DRIVER',
              countryCode: job.countryCode || 'CA',
              phone: contractorPhone || undefined,
              address: contractorAddress || undefined,
              latitude: contractorLat,
              longitude: contractorLng,
              assignedVehicle: `EXTERNAL: ${contractorName}`,
              isAgentActive: true,
            },
          });
        } else {
          const userUpdate: any = {};
          if (contractorAddress && existingUser.address !== contractorAddress) userUpdate.address = contractorAddress;
          if (contractorLat !== undefined && existingUser.latitude !== contractorLat) userUpdate.latitude = contractorLat;
          if (contractorLng !== undefined && existingUser.longitude !== contractorLng) userUpdate.longitude = contractorLng;
          if (Object.keys(userUpdate).length > 0) {
            existingUser = await prisma.user.update({
              where: { id: existingUser.id },
              data: userUpdate,
            });
          }
        }

        contractorUserId = existingUser.id;
      }

      const externalUpdateData: any = {
        driverId: contractorUserId,
        driverType: 'EXTERNAL',
        externalDispatchToken: token,
        externalDispatchStatus: 'PENDING',
        externalCompanyName: contractorName,
        externalDriverPhone: contractorPhone,
        externalDriverFeeCents: feeCents !== undefined && feeCents !== null ? Number(feeCents) : null,
        driverEtaMinutes: driverEtaMinutes !== undefined && driverEtaMinutes !== null ? Number(driverEtaMinutes) : job.driverEtaMinutes,
        driverEstimatedArrivalAt: driverEstimatedArrivalAt ? new Date(driverEstimatedArrivalAt) : job.driverEstimatedArrivalAt,
        status: 'ASSIGNED',
        driverDeclineReason: null,
        lastDeclinedDriverId: null,
      };

      if (paymentCollectionMode === 'COMPANY') {
        externalUpdateData.paymentMethod = (job.paymentMethod && job.paymentMethod !== 'CASH')
          ? job.paymentMethod
          : 'E_TRANSFER';
      } else if (paymentCollectionMode === 'DRIVER') {
        externalUpdateData.paymentMethod = 'CASH';
      }

      const updated = await prisma.job.update({
        where: { id },
        data: externalUpdateData,
        include: {
          vehicle: true,
          customer: true,
          fleet: true,
          driver: true,
        },
      });

      sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'job:updated', updated);

      return sendSuccess(res, {
        job: updated,
        token,
        externalDispatchToken: token,
        publicUrl: `/dispatch/external/${token}`,
        externalDispatchUrl: `/dispatch/external/${token}`,
      }, 'External driver dispatch link generated');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Clear the external dispatch token, contractor details, assignment, and driver
   * ETA, resetting the job to PENDING with INTERNAL driver type. Return the updated
   * job and emit job:updated and job:status_updated. Missing jobs return HTTP 404;
   * completed jobs and caught errors return 400. Cancelled jobs can be reset.
   */
  async revokeExternalDispatch(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const job = await prisma.job.findUnique({ where: { id } });
      if (!job) return sendError(res, 'Job not found', 404);

      if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
        return sendError(res, `Cannot revoke dispatch link on a ${job.status.toLowerCase()} work order`, 400);
      }

      if (!job.externalDispatchToken) {
        return sendError(res, 'No active external dispatch link to revoke', 400);
      }

      const updated = await prisma.job.update({
        where: { id },
        data: {
          externalDispatchToken: null,
          externalDispatchStatus: null,
          driverType: 'INTERNAL',
          driverId: null,
          status: 'PENDING',
          dispositionNotes: null,
          externalCompanyName: null,
          externalDriverPhone: null,
          externalDriverFeeCents: null,
          driverEtaMinutes: null,
          driverEstimatedArrivalAt: null,
          driverDeclineReason: null,
          lastDeclinedDriverId: null,
        },
        include: {
          vehicle: true,
          customer: true,
          fleet: true,
          driver: true,
        },
      });

      sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'job:updated', updated);
      sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'job:status_updated', updated);

      return sendSuccess(res, updated, 'External dispatch link revoked');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Return a token-selected job without CRM authentication, including recipient
   * contact, vehicle/service details, contractor payout, job total, payment status,
   * and cash collected in cents. Tokens are looked up without a time-based expiry.
   * Returns HTTP 404 when no job matches and 500 for caught errors.
   */
  async getPublicExternalJob(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const job = await prisma.job.findUnique({
        where: { externalDispatchToken: token },
        include: {
          vehicle: true,
          serviceItems: true,
          customer: true,
          fleet: true,
        },
      });

      if (!job) return sendError(res, 'Dispatch link invalid or expired', 404);

      const isFleet = Boolean(job.fleetId || job.fleet);
      const isPaidByCompany = Boolean(
        isFleet ||
        job.paymentStatus === 'PAID_PENDING_VERIFICATION' || 
        job.paymentStatus === 'VERIFIED_PAID' ||
        (job.paymentMethod && job.paymentMethod !== 'CASH' && job.paymentStatus !== 'PARTIAL')
      );

      // Strict Financial & Privacy Sanitization: hide internal pricing, include customer contact & vehicle specs
      const sanitized = {
        id: job.id,
        jobCode: job.jobCode,
        countryCode: job.countryCode,
        currency: job.currency,
        urgency: job.urgency,
        serviceAddress: job.serviceAddress,
        latitude: job.serviceLatitude,
        longitude: job.serviceLongitude,
        status: job.status,
        dispositionNotes: job.dispositionNotes,
        externalDispatchStatus: job.externalDispatchStatus,
        externalCompanyName: job.externalCompanyName,
        externalDriverPhone: job.externalDriverPhone,
        driverEtaMinutes: job.driverEtaMinutes,
        contractorPayoutFeeCents: job.externalDriverFeeCents || job.repairerFeeCents || 0,
        totalCents: job.totalCents || 0,
        upfrontAmountCents: job.upfrontAmountCents || 0,
        paymentStatus: job.paymentStatus || 'UNPAID',
        paymentMethod: job.paymentMethod,
        isFleetJob: isFleet,
        isPaidByCompany,
        fleet: job.fleet ? {
          id: job.fleet.id,
          name: job.fleet.name,
          fleetCode: job.fleet.fleetCode,
          contactPerson: job.fleet.contactPerson,
          phone: job.fleet.phone,
        } : null,
        customer: {
          fullName: job.recipientName || job.customer?.fullName || 'Customer',
          phone: job.recipientPhone || job.customer?.phone || null,
        },
        recipientName: job.recipientName || job.customer?.fullName || 'Customer',
        recipientPhone: job.recipientPhone || job.customer?.phone || null,
        vehicle: job.vehicle ? {
          year: job.vehicle.year,
          make: job.vehicle.make,
          model: job.vehicle.model,
          color: job.vehicle.color,
          licensePlate: job.vehicle.licensePlate,
          unitNumber: job.vehicle.unitNumber || null,
          tireSize: job.vehicle.tireSize || 'TBD',
        } : null,
        serviceItems: job.serviceItems.map((si) => ({
          serviceName: si.serviceName,
          quantity: si.quantity,
          category: si.category,
        })),
        problemNotes: job.problemNotes,
        cashCollectedCents: job.cashCollectedCents || 0,
      };

      return sendSuccess(res, sanitized);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * Apply a public token action and return { status, externalDispatchStatus }.
   * ACCEPT assigns, DECLINE records a reason and clears the driver, EN_ROUTE and
   * ON_SCENE/ARRIVED mark progress, and COMPLETE timestamps completion and optionally
   * stores cashCollectedCents. Emit job:status_updated and job:updated.
   * Returns HTTP 404 for an unmatched token and 400 for completed/cancelled jobs,
   * unknown actions, or caught errors; intermediate action order is not enforced.
   */
  async updatePublicExternalJobStatus(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const { action, cashCollectedCents, reason } = req.body;

      const job = await prisma.job.findUnique({
        where: { externalDispatchToken: token },
      });
      if (!job) return sendError(res, 'Dispatch link invalid or expired', 404);

      if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
        return sendError(res, `Cannot update a ${job.status.toLowerCase()} work order`, 400);
      }

      if (job.externalDispatchStatus === 'DENIED') {
        return sendError(res, 'This dispatch was previously declined', 400);
      }

      let updateData: any = {};

      switch (action) {
        case 'ACCEPT':
          updateData = {
            externalDispatchStatus: 'ACCEPTED',
            status: 'ASSIGNED',
            driverDeclineReason: null,
          };
          break;
        case 'DECLINE':
          updateData = {
            externalDispatchStatus: 'DENIED',
            externalDispatchToken: null,
            driverDeclineReason: reason || 'Declined by contractor',
            lastDeclinedDriverId: job.driverId,
            driverId: null,
            driverType: 'INTERNAL',
            status: 'PENDING',
            assignedAt: null,
            dispositionNotes: null,
          };
          break;
        case 'EN_ROUTE':
          updateData = {
            status: 'IN_PROGRESS',
            externalDispatchStatus: job.externalDispatchStatus || 'ACCEPTED',
            dispositionNotes: 'EN_ROUTE',
          };
          break;
        case 'ON_SCENE':
        case 'ARRIVED':
          updateData = {
            status: 'IN_PROGRESS',
            externalDispatchStatus: job.externalDispatchStatus || 'ACCEPTED',
            dispositionNotes: 'ON_SCENE',
          };
          break;
        case 'COMPLETE': {
          const cash = cashCollectedCents !== undefined ? Number(cashCollectedCents) : (job.cashCollectedCents || 0);
          if (!Number.isFinite(cash) || cash < 0 || cash > job.totalCents) {
            return sendError(
              res,
              `Cash collected must be a non-negative amount not exceeding total of $${(job.totalCents / 100).toFixed(2)}`,
              400
            );
          }
          updateData = {
            status: 'COMPLETED',
            completedAt: new Date(),
            dispositionNotes: 'COMPLETED',
            cashCollectedCents: cash,
            ...(cash > 0 && {
              paymentMethod: 'CASH',
              paymentStatus: 'PAID_PENDING_VERIFICATION',
            }),
          };
          break;
        }
        default:
          return sendError(res, `Unknown action: ${action}`, 400);
      }

      const updated = await prisma.job.update({
        where: { id: job.id },
        data: updateData,
        include: {
          vehicle: true,
          customer: true,
          fleet: true,
          driver: true,
          serviceItems: true,
          lastDeclinedDriver: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
        },
      });

      const effectiveStatus = (updated.dispositionNotes && ['EN_ROUTE', 'ON_SCENE', 'ARRIVED', 'ACCEPTED'].includes(updated.dispositionNotes) && (updated.status === 'IN_PROGRESS' || updated.status === 'ASSIGNED'))
        ? (updated.dispositionNotes === 'ARRIVED' ? 'ON_SCENE' : (updated.dispositionNotes === 'ACCEPTED' ? 'ASSIGNED' : updated.dispositionNotes))
        : updated.status;

      const enrichedJob = {
        ...updated,
        jobId: updated.id,
        jobNumber: updated.jobCode,
        totalAmount: updated.totalCents,
        status: effectiveStatus,
        rawStatus: updated.status,
        technicianStatus: effectiveStatus,
        driverName: updated.externalCompanyName || (updated as any).driver?.fullName || 'External Contractor',
      };

      sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'job:status_updated', enrichedJob);

      try {
        const io = getIO();
        if (action === 'DECLINE' || action === 'COMPLETE') {
          io.to(`dispatch:${updated.countryCode}`).emit('job:status_updated', enrichedJob);
        }
        if (action === 'COMPLETE') {
          io.to(`accounting:${updated.countryCode}`).emit('accounting:job_completed', {
            type: 'JOB_COMPLETED',
            title: 'Job Completed — Audit Ready',
            jobId: updated.id,
            jobCode: updated.jobCode,
            driverName: enrichedJob.driverName,
            totalCents: updated.totalCents,
            paymentMethod: updated.paymentMethod,
            timestamp: new Date().toISOString(),
            message: `Job #${updated.jobCode} completed by ${enrichedJob.driverName}. Ready for expense audit.`,
          });
        }
      } catch {}

      return sendSuccess(res, { status: effectiveStatus, rawStatus: updated.status, externalDispatchStatus: updated.externalDispatchStatus }, 'Dispatch status updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  getNavCounts: async (req: Request, res: Response) => {
    try {
      const countryCode = req.query.countryCode ? String(req.query.countryCode) : (req as any).countryCode;
      const whereBase: any = {};
      if (countryCode && countryCode !== 'ALL') {
        whereBase.countryCode = countryCode;
      }

      const [
        jobsPending,
        jobsInProgress,
        jobsActive,
        jobsCompleted,
        fleetJobsPending,
        fleetJobsInProgress,
        fleetJobsActive,
        fleetJobsCompleted,
        bookingsUnverified,
        bookingsPublicWeb,
        bookingsMember,
        bookingsFleet,
        invoicesCount,
      ] = await Promise.all([
        // 1. Regular Jobs (/jobs)
        prisma.job.count({
          where: {
            ...whereBase,
            fleetId: null,
            isTestService: false,
            status: 'PENDING',
          },
        }),
        prisma.job.count({
          where: {
            ...whereBase,
            fleetId: null,
            isTestService: false,
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
          },
        }),
        prisma.job.count({
          where: {
            ...whereBase,
            fleetId: null,
            isTestService: false,
            status: { notIn: ['COMPLETED', 'CANCELLED', 'UNVERIFIED_PUBLIC'] },
          },
        }),
        prisma.job.count({
          where: {
            ...whereBase,
            fleetId: null,
            isTestService: false,
            status: 'COMPLETED',
          },
        }),

        // 2. Fleet Jobs (/fleet-jobs)
        prisma.job.count({
          where: {
            ...whereBase,
            OR: [{ fleetId: { not: null } }, { isTestService: true }],
            status: 'PENDING',
          },
        }),
        prisma.job.count({
          where: {
            ...whereBase,
            OR: [{ fleetId: { not: null } }, { isTestService: true }],
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
          },
        }),
        prisma.job.count({
          where: {
            ...whereBase,
            OR: [{ fleetId: { not: null } }, { isTestService: true }],
            status: { notIn: ['COMPLETED', 'CANCELLED', 'UNVERIFIED_PUBLIC'] },
          },
        }),
        prisma.job.count({
          where: {
            ...whereBase,
            OR: [{ fleetId: { not: null } }, { isTestService: true }],
            status: 'COMPLETED',
          },
        }),

        // 3. Bookings (/bookings)
        prisma.job.count({
          where: {
            ...whereBase,
            status: 'UNVERIFIED_PUBLIC',
          },
        }),
        prisma.job.count({
          where: {
            ...whereBase,
            status: 'UNVERIFIED_PUBLIC',
            source: { in: ['LANDING_PAGE_SELF_BOOK', 'WEBSITE'] },
          },
        }),
        prisma.job.count({
          where: {
            ...whereBase,
            status: 'UNVERIFIED_PUBLIC',
            source: 'MEMBER_PORTAL',
          },
        }),
        prisma.job.count({
          where: {
            ...whereBase,
            status: 'UNVERIFIED_PUBLIC',
            OR: [{ source: 'FLEET_PORTAL' }, { fleetId: { not: null } }],
          },
        }),

        // 4. Invoices
        prisma.invoice.count({
          where: {
            ...(whereBase.countryCode ? { countryCode: whereBase.countryCode } : {}),
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
          },
        }),
      ]);

      return sendSuccess(res, {
        jobs: jobsPending,
        jobsPending,
        jobsInProgress,
        jobsActive,
        jobsCompleted,
        fleetJobs: fleetJobsPending,
        fleetJobsPending,
        fleetJobsInProgress,
        fleetJobsActive,
        fleetJobsCompleted,
        bookings: bookingsUnverified,
        bookingsUnverified,
        bookingsPublicWeb,
        bookingsMember,
        bookingsFleet,
        invoices: invoicesCount,
      });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};

export default jobController;
