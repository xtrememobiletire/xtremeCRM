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
import { geocodingService } from '../services/geocodingService.js';

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
      if (countryCode && countryCode !== 'ALL') where.countryCode = countryCode;
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
            address: true,
            assignedVehicle: true,
            latitude: true,
            longitude: true,
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

  /**
   * Create a user and return profile fields without the password hash (HTTP 201).
   * An assignedVehicle value starting with EXTERNAL enables generated email/password
   * fallbacks, though route validation still requires both. If either coordinate
   * is missing, successful address geocoding supplies both; unsuccessful geocoding
   * leaves supplied coordinates intact. Duplicate email returns 409; missing
   * credentials and caught errors return 400.
   */
  async createUser(req: Request, res: Response) {
    try {
      const {
        email,
        password,
        fullName,
        role,
        countryCode,
        phone,
        isAgentActive,
        address,
        assignedVehicle,
        workingDays,
        workingHours,
        approvedByName,
        latitude,
        longitude,
      } = req.body;

      const isExternalContractor = assignedVehicle === 'EXTERNAL_CONTRACTOR' || assignedVehicle?.startsWith('EXTERNAL');
      const finalEmail = email?.trim() || (isExternalContractor ? `contractor_${Date.now()}_${Math.random().toString(36).substring(7)}@external.xtremetire.com` : '');
      if (!finalEmail) return sendError(res, 'Email is required', 400);

      const existing = await prisma.user.findUnique({ where: { email: finalEmail } });
      if (existing) return sendError(res, 'User with this email already exists', 409);

      const finalPassword = password || (isExternalContractor ? `Ext_${Date.now()}_${Math.random().toString(36).substring(7)}` : '');
      if (!finalPassword) return sendError(res, 'Password is required', 400);

      let finalLat = latitude !== undefined && latitude !== null ? Number(latitude) : undefined;
      let finalLng = longitude !== undefined && longitude !== null ? Number(longitude) : undefined;

      if ((finalLat === undefined || finalLng === undefined) && address) {
        const geo = await geocodingService.geocodeAddress(address, countryCode || 'CA');
        if (geo.latitude !== null && geo.longitude !== null) {
          finalLat = geo.latitude;
          finalLng = geo.longitude;
        }
      }

      const passwordHash = await bcrypt.hash(finalPassword, 10);
      const user = await prisma.user.create({
        data: {
          email: finalEmail,
          passwordHash,
          fullName,
          role: role || 'CALL_AGENT',
          countryCode: countryCode || 'CA',
          phone,
          isAgentActive: isAgentActive ?? false,
          address,
          assignedVehicle,
          workingDays,
          workingHours,
          approvedByName,
          latitude: finalLat,
          longitude: finalLng,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          countryCode: true,
          phone: true,
          address: true,
          assignedVehicle: true,
          workingDays: true,
          workingHours: true,
          approvedByName: true,
          latitude: true,
          longitude: true,
          isAgentActive: true,
          createdAt: true,
        },
      });

      return sendSuccess(res, user, 'User created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Update supplied profile, role, duty, schedule, and location fields and return
   * the updated profile. Successful geocoding replaces both coordinates when an
   * address is supplied and either coordinate is missing; unsuccessful geocoding
   * leaves existing coordinates unchanged unless explicitly supplied.
   * Password and email are not updated. Caught errors become HTTP 400 responses.
   */
  async updateUser(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const {
        fullName,
        role,
        countryCode,
        phone,
        isAgentActive,
        address,
        assignedVehicle,
        workingDays,
        workingHours,
        approvedByName,
        latitude,
        longitude,
      } = req.body;

      let finalLat = latitude !== undefined && latitude !== null ? Number(latitude) : undefined;
      let finalLng = longitude !== undefined && longitude !== null ? Number(longitude) : undefined;

      if ((finalLat === undefined || finalLng === undefined) && address) {
        const geo = await geocodingService.geocodeAddress(address, countryCode || 'CA');
        if (geo.latitude !== null && geo.longitude !== null) {
          finalLat = geo.latitude;
          finalLng = geo.longitude;
        }
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...(fullName && { fullName }),
          ...(role && { role }),
          ...(countryCode && { countryCode }),
          ...(phone !== undefined && { phone }),
          ...(isAgentActive !== undefined && { isAgentActive }),
          ...(address !== undefined && { address }),
          ...(assignedVehicle !== undefined && { assignedVehicle }),
          ...(workingDays !== undefined && { workingDays }),
          ...(workingHours !== undefined && { workingHours }),
          ...(approvedByName !== undefined && { approvedByName }),
          ...(finalLat !== undefined && { latitude: finalLat }),
          ...(finalLng !== undefined && { longitude: finalLng }),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          countryCode: true,
          phone: true,
          address: true,
          assignedVehicle: true,
          workingDays: true,
          workingHours: true,
          approvedByName: true,
          latitude: true,
          longitude: true,
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
      const id = req.params.id === 'me' ? (req.user as any)?.id : String(req.params.id || (req.user as any)?.id);
      if (!id) return sendError(res, 'User identity required', 400);
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return sendError(res, 'User not found', 404);

      const targetState = typeof req.body?.isAgentActive === 'boolean' ? req.body.isAgentActive : !user.isAgentActive;
      const updated = await prisma.user.update({
        where: { id },
        data: { isAgentActive: targetState },
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
