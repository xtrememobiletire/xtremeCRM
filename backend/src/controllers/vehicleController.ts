import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import {
  sendSuccess,
  sendError,
  sanitizePaginationParams,
  calculateSkip,
  createPaginatedResponse,
} from '../utils/index.js';

export const vehicleController = {
  async getVehicles(req: Request, res: Response) {
    try {
      const pageParam = req.query.page ? Number(req.query.page) : 1;
      const limitParam = req.query.limit ? Number(req.query.limit) : 20;
      const { page, limit } = sanitizePaginationParams(pageParam, limitParam);
      const skip = calculateSkip(page, limit);

      const customerId = req.query.customerId as string;
      const fleetId = req.query.fleetId as string;
      const countryCode = req.query.countryCode as any;
      const search = req.query.search as string;

      const where: any = {};
      if (customerId) where.customerId = customerId;
      if (fleetId) where.fleetId = fleetId;
      if (countryCode) where.countryCode = countryCode;
      if (search) {
        where.OR = [
          { licensePlate: { contains: search, mode: 'insensitive' } },
          { make: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
          { tireSize: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [vehicles, totalCount] = await Promise.all([
        prisma.vehicle.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, fullName: true, phone: true } },
            fleet: { select: { id: true, name: true, fleetCode: true } },
          },
        }),
        prisma.vehicle.count({ where }),
      ]);

      const paginated = createPaginatedResponse(vehicles, page, limit, totalCount);
      return res.status(200).json(paginated);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async getVehicleById(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const vehicle = await prisma.vehicle.findUnique({
        where: { id },
        include: {
          customer: true,
          fleet: true,
          jobs: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!vehicle) return sendError(res, 'Vehicle not found', 404);
      return sendSuccess(res, vehicle);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async createVehicle(req: Request, res: Response) {
    try {
      const { customerId, fleetId, countryCode, year, make, model, licensePlate, vin, tireSize } = req.body;

      // Check licensePlate uniqueness within country if provided
      if (licensePlate) {
        const existing = await prisma.vehicle.findUnique({
          where: {
            countryCode_licensePlate: {
              countryCode: countryCode || 'CA',
              licensePlate,
            },
          },
        });
        if (existing) {
          return sendError(res, `Vehicle with plate ${licensePlate} already exists in ${countryCode}`, 409);
        }
      }

      const vehicle = await prisma.vehicle.create({
        data: {
          customerId,
          fleetId,
          countryCode: countryCode || 'CA',
          year: Number(year),
          make,
          model,
          licensePlate,
          vin,
          tireSize,
        },
        include: {
          customer: true,
          fleet: true,
        },
      });

      return sendSuccess(res, vehicle, 'Vehicle created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async updateVehicle(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const updated = await prisma.vehicle.update({
        where: { id },
        data: req.body,
        include: {
          customer: true,
          fleet: true,
        },
      });

      return sendSuccess(res, updated, 'Vehicle updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async deleteVehicle(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await prisma.vehicle.delete({ where: { id } });
      return sendSuccess(res, null, 'Vehicle deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },
};

export default vehicleController;
