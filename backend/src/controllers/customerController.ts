import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import {
  sendSuccess,
  sendError,
  sanitizePaginationParams,
  calculateSkip,
  createPaginatedResponse,
} from '../utils/index.js';

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
            vehicles: true,
          },
        }),
        prisma.customer.count({ where }),
      ]);

      const paginated = createPaginatedResponse(customers, page, limit, totalCount);
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

      // 1. Check Customer
      const customer = await prisma.customer.findFirst({
        where: {
          countryCode,
          phone: { contains: cleanDigits.slice(-10) },
        },
        include: {
          vehicles: true,
          jobs: {
            take: 3,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // 2. Check FleetDriver
      const fleetDriver = await prisma.fleetDriver.findFirst({
        where: {
          phone: { contains: cleanDigits.slice(-10) },
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
          phone: { contains: cleanDigits.slice(-10) },
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
          vehicles: true,
          jobs: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          invoices: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!customer) return sendError(res, 'Customer not found', 404);
      return sendSuccess(res, customer);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async createCustomer(req: Request, res: Response) {
    try {
      const { fullName, phone, altPhone, email, countryCode, customerType, membershipTier } = req.body;
      const resolvedName = (fullName || req.body.name || '').trim();
      const cleanPhone = (phone || '').trim();
      const effectiveCountry = countryCode || (req as any).countryCode || 'CA';

      if (!resolvedName || !cleanPhone) {
        return sendError(res, 'Full name and phone number are required', 400);
      }

      // Check unique [countryCode, phone]
      const existing = await prisma.customer.findUnique({
        where: {
          countryCode_phone: {
            countryCode: effectiveCountry,
            phone: cleanPhone,
          },
        },
      });
      if (existing) {
        return sendError(res, 'Customer with this phone already exists in this country', 409);
      }

      const customer = await prisma.customer.create({
        data: {
          fullName: resolvedName,
          phone: cleanPhone,
          altPhone: altPhone?.trim() || null,
          email: email?.trim() || null,
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
        countryCode,
        customerType,
        membershipTier,
        membershipExpiresAt,
      } = req.body;

      const data: any = {};
      if (fullName || name) data.fullName = (fullName || name).trim();
      if (phone) data.phone = phone.trim();
      if (altPhone !== undefined) data.altPhone = altPhone?.trim() || null;
      if (email !== undefined) data.email = email?.trim() || null;
      if (countryCode) data.countryCode = countryCode;
      if (customerType) data.customerType = customerType;
      if (membershipTier !== undefined) data.membershipTier = membershipTier;
      if (membershipExpiresAt !== undefined) data.membershipExpiresAt = membershipExpiresAt;

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
