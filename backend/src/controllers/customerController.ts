import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import {
  sendSuccess,
  sendError,
  sanitizePaginationParams,
  calculateSkip,
  createPaginatedResponse,
  validateAndNormalizePhone,
} from '../utils/index.js';
import { geocodingService } from '../services/geocodingService.js';

export const customerController = {
  async getCustomers(req: Request, res: Response) {
    try {
      const pageParam = req.query.page ? Number(req.query.page) : 1;
      const limitParam = req.query.limit ? Number(req.query.limit) : 20;
      const { page, limit } = sanitizePaginationParams(pageParam, limitParam);
      const skip = calculateSkip(page, limit);

      const countryCode = (req.query.countryCode as any) || req.countryCode;
      const customerType = req.query.customerType as any;
      const search = req.query.search as string;

      const where: any = {};
      if (countryCode) where.countryCode = countryCode;
      if (customerType) where.customerType = customerType;
      if (search) {
        where.OR = [
          { fullName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [customers, totalCount] = await Promise.all([
        prisma.customer.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            vehicles: {
              orderBy: { createdAt: 'desc' },
            },
            jobs: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                jobCode: true,
                totalCents: true,
                status: true,
                serviceAddress: true,
                urgency: true,
                createdAt: true,
                vehicle: {
                  select: {
                    year: true,
                    make: true,
                    model: true,
                    licensePlate: true,
                    tireSize: true,
                  },
                },
              },
            },
          },
        }),
        prisma.customer.count({ where }),
      ]);

      const enriched = customers.map((c) => {
        const totalSpendCents = (c.jobs || []).reduce((sum, j) => sum + (j.totalCents || 0), 0);
        return {
          ...c,
          totalSpendCents,
          jobsCount: c.jobs?.length || 0,
        };
      });

      const paginated = createPaginatedResponse(enriched, page, limit, totalCount);
      return res.status(200).json(paginated);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async lookupCustomer(req: Request, res: Response) {
    try {
      const phone = ((req.query.phone || req.query.q || '') as string).trim();
      const countryCode = (req.query.countryCode as any) || req.countryCode || 'CA';

      if (!phone) {
        return sendError(res, 'Phone parameter is required for lookup', 400);
      }

      const cleanDigits = phone.replace(/[^0-9]/g, '');
      const national10 = cleanDigits.slice(-10);
      const phoneValidation = validateAndNormalizePhone(phone, countryCode);
      const normalizedPhone = phoneValidation.isValid ? phoneValidation.normalized : '';

      // 1. Check Customer
      const customer = await prisma.customer.findFirst({
        where: {
          countryCode,
          OR: [
            ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
            { phone: { contains: national10 } },
            { phone: { endsWith: national10 } },
          ],
        },
        include: {
          vehicles: {
            orderBy: { createdAt: 'desc' },
          },
          jobs: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: {
              vehicle: true,
            },
          },
        },
      });

      // 2. Check FleetDriver
      const fleetDriver = await prisma.fleetDriver.findFirst({
        where: {
          OR: [
            ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
            { phone: { contains: national10 } },
            { phone: { endsWith: national10 } },
          ],
        },
        include: {
          fleet: {
            include: {
              vehicles: true,
            },
          },
        },
      });

      // 3. Check Fleet direct
      const fleetDirect = await prisma.fleet.findFirst({
        where: {
          countryCode,
          OR: [
            ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
            { phone: { contains: national10 } },
            { phone: { endsWith: national10 } },
          ],
        },
        include: {
          vehicles: true,
        },
      });

      const matchedFleet = fleetDriver?.fleet || fleetDirect || null;

      return sendSuccess(res, {
        found: Boolean(customer || matchedFleet),
        isReturning: Boolean(customer || matchedFleet),
        customer: customer || null,
        fleet: matchedFleet,
        driver: fleetDriver ? { name: fleetDriver.fullName, phone: fleetDriver.phone, plate: fleetDriver.licensePlate } : null,
      });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async searchCustomer(req: Request, res: Response) {
    try {
      const query = ((req.query.q || req.query.phone || '') as string).trim();
      const countryCode = (req.query.countryCode as any) || req.countryCode || 'CA';

      const customers = await prisma.customer.findMany({
        where: {
          countryCode,
          ...(query
            ? {
                OR: [
                  { phone: { contains: query } },
                  { fullName: { contains: query, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        take: 10,
        include: {
          vehicles: true,
          jobs: {
            take: 3,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return sendSuccess(res, customers);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async getCustomerById(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          vehicles: {
            orderBy: { createdAt: 'desc' },
          },
          jobs: {
            orderBy: { createdAt: 'desc' },
            include: {
              vehicle: true,
              serviceItems: true,
            },
          },
          invoices: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!customer) return sendError(res, 'Customer not found', 404);
      const totalSpendCents = (customer.jobs || []).reduce((sum, j) => sum + (j.totalCents || 0), 0);
      return sendSuccess(res, {
        ...customer,
        totalSpendCents,
        jobsCount: customer.jobs?.length || 0,
      });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async createCustomer(req: Request, res: Response) {
    try {
      const { fullName, phone, altPhone, email, address, countryCode, customerType, membershipTier } = req.body;
      const resolvedName = (fullName || req.body.name || '').trim();
      const rawPhone = (phone || '').trim();
      const effectiveCountry = countryCode || (req as any).countryCode || 'CA';

      if (!resolvedName || !rawPhone) {
        return sendError(res, 'Full name and phone number are required', 400);
      }

      const phoneValidation = validateAndNormalizePhone(rawPhone, effectiveCountry);
      if (!phoneValidation.isValid) {
        return sendError(res, phoneValidation.error || 'Invalid phone number format', 400);
      }
      const cleanPhone = phoneValidation.normalized;
      const national10 = phoneValidation.national;

      // Check unique [countryCode, phone] or national digits match
      const existing = await prisma.customer.findFirst({
        where: {
          countryCode: effectiveCountry,
          OR: [
            { phone: cleanPhone },
            { phone: { endsWith: national10 } },
            { phone: national10 },
          ],
        },
      });
      if (existing) {
        return sendError(res, 'Customer with this phone already exists in this country', 409);
      }

      let latitude = req.body.latitude !== undefined && req.body.latitude !== null ? Number(req.body.latitude) : null;
      let longitude = req.body.longitude !== undefined && req.body.longitude !== null ? Number(req.body.longitude) : null;
      if (address && (latitude === null || longitude === null)) {
        const geo = await geocodingService.geocodeAddress(address, effectiveCountry);
        if (geo.latitude && geo.longitude) {
          latitude = geo.latitude;
          longitude = geo.longitude;
        }
      }

      const customer = await prisma.customer.create({
        data: {
          fullName: resolvedName,
          phone: cleanPhone,
          altPhone: altPhone?.trim() || null,
          email: email?.trim() || null,
          address: address?.trim() || null,
          latitude,
          longitude,
          countryCode: effectiveCountry,
          customerType: customerType || 'RETAIL',
          membershipTier: membershipTier || null,
        },
        include: {
          vehicles: true,
        },
      });

      return sendSuccess(res, customer, 'Customer created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async updateCustomer(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const {
        fullName,
        name,
        phone,
        altPhone,
        email,
        address,
        countryCode,
        customerType,
        membershipTier,
        membershipExpiresAt,
      } = req.body;

      const data: any = {};
      if (fullName || name) data.fullName = (fullName || name).trim();
      if (phone) {
        const existingCust = await prisma.customer.findUnique({ where: { id }, select: { countryCode: true } });
        if (!existingCust) return sendError(res, 'Customer not found', 404);
        const targetCountry = countryCode || existingCust.countryCode || 'CA';
        const phoneValidation = validateAndNormalizePhone(phone, targetCountry);
        if (!phoneValidation.isValid) {
          return sendError(res, phoneValidation.error || 'Invalid phone number format', 400);
        }
        data.phone = phoneValidation.normalized;

        const collision = await prisma.customer.findFirst({
          where: {
            id: { not: id },
            countryCode: targetCountry as any,
            OR: [
              { phone: data.phone },
              { phone: { endsWith: phoneValidation.national } },
            ],
          },
        });
        if (collision) {
          return sendError(res, 'Another customer with this phone number already exists', 409);
        }
      }
      if (altPhone !== undefined) data.altPhone = altPhone?.trim() || null;
      if (email !== undefined) data.email = email?.trim() || null;
      if (countryCode) data.countryCode = countryCode;
      if (customerType) data.customerType = customerType;
      if (membershipTier !== undefined) data.membershipTier = membershipTier;
      if (membershipExpiresAt !== undefined) data.membershipExpiresAt = membershipExpiresAt;

      if (address !== undefined) {
        data.address = address?.trim() || null;
        if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
          data.latitude = req.body.latitude ? Number(req.body.latitude) : null;
          data.longitude = req.body.longitude ? Number(req.body.longitude) : null;
        } else if (data.address) {
          const geo = await geocodingService.geocodeAddress(data.address, countryCode || (req as any).countryCode);
          if (geo.latitude && geo.longitude) {
            data.latitude = geo.latitude;
            data.longitude = geo.longitude;
          }
        } else {
          data.latitude = null;
          data.longitude = null;
        }
      }

      const updated = await prisma.customer.update({
        where: { id },
        data,
        include: {
          vehicles: true,
        },
      });

      return sendSuccess(res, updated, 'Customer updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async deleteCustomer(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await prisma.customer.delete({ where: { id } });
      return sendSuccess(res, null, 'Customer deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },
};

export default customerController;
