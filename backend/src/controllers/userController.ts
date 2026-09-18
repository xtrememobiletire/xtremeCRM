import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/database.js';
import {
  sendSuccess,
  sendError,
  sanitizePaginationParams,
  calculateSkip,
  createPaginatedResponse,
} from '../utils/index.js';

export const userController = {
  async getUsers(req: Request, res: Response) {
    try {
      const pageParam = req.query.page ? Number(req.query.page) : 1;
      const limitParam = req.query.limit ? Number(req.query.limit) : 20;
      const { page, limit } = sanitizePaginationParams(pageParam, limitParam);
      const skip = calculateSkip(page, limit);

      const role = req.query.role as any;
      const countryCode = req.query.countryCode as any;
      const search = req.query.search as string;

      const where: any = { deletedAt: null };
      if (role) where.role = role;
      if (countryCode) where.countryCode = countryCode;
      if (search) {
        where.OR = [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ];
      }

      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            countryCode: true,
            phone: true,
            isAgentActive: true,
            createdAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      const paginated = createPaginatedResponse(users, page, limit, totalCount);
      return res.status(200).json(paginated);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async getUserById(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const user = await prisma.user.findUnique({
        where: { id, deletedAt: null },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          countryCode: true,
          phone: true,
          isAgentActive: true,
          createdAt: true,
        },
      });

      if (!user) return sendError(res, 'User not found', 404);
      return sendSuccess(res, user);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async createUser(req: Request, res: Response) {
    try {
      const { email, password, fullName, role, countryCode, phone, isAgentActive } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return sendError(res, 'User with this email already exists', 409);

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          role: role || 'CALL_AGENT',
          countryCode: countryCode || 'CA',
          phone,
          isAgentActive: isAgentActive ?? false,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          countryCode: true,
          phone: true,
          isAgentActive: true,
          createdAt: true,
        },
      });

      return sendSuccess(res, user, 'User created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async updateUser(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { fullName, role, countryCode, phone, isAgentActive } = req.body;

      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...(fullName && { fullName }),
          ...(role && { role }),
          ...(countryCode && { countryCode }),
          ...(phone !== undefined && { phone }),
          ...(isAgentActive !== undefined && { isAgentActive }),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          countryCode: true,
          phone: true,
          isAgentActive: true,
          updatedAt: true,
        },
      });

      return sendSuccess(res, updated, 'User updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async toggleAgentActive(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return sendError(res, 'User not found', 404);

      const updated = await prisma.user.update({
        where: { id },
        data: { isAgentActive: !user.isAgentActive },
        select: {
          id: true,
          email: true,
          fullName: true,
          isAgentActive: true,
        },
      });

      return sendSuccess(res, updated, `Agent presence set to ${updated.isAgentActive ? 'Active' : 'Inactive'}`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async deleteUser(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return sendSuccess(res, null, 'User deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },
};

export default userController;
