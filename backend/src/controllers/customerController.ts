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

      // Check unique [countryCode, phone]
      const existing = await prisma.customer.findUnique({
        where: {
          countryCode_phone: {
            countryCode: countryCode || 'CA',
            phone,
          },
        },
      });
      if (existing) {
        return sendError(res, 'Customer with this phone already exists in this country', 409);
      }

      const customer = await prisma.customer.create({
        data: {
          fullName,
          phone,
          altPhone,
          email,
          countryCode: countryCode || 'CA',
          customerType: customerType || 'RETAIL',
          membershipTier,
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
      const updated = await prisma.customer.update({
        where: { id },
        data: req.body,
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
