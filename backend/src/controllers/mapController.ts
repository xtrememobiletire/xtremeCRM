import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { geocodingService } from '../services/geocodingService.js';
import { sendSuccess, sendError } from '../utils/index.js';

export const mapController = {
  /**
   * GET /api/map/customers
   * Fetch all customers with valid latitude/longitude coordinates
   */
  async getCustomers(req: Request, res: Response) {
    try {
      const countryCode = (req.query.countryCode as any) || req.countryCode;
      const where: any = {
        latitude: { not: null },
        longitude: { not: null },
      };
      if (countryCode) where.countryCode = countryCode;

      const customers = await prisma.customer.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          address: true,
          latitude: true,
          longitude: true,
          countryCode: true,
          customerType: true,
          membershipTier: true,
          createdAt: true,
          _count: {
            select: {
              jobs: true,
              vehicles: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });

      return sendSuccess(res, customers);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * GET /api/map/fleets
   * Fetch all fleets with coordinates
   */
  async getFleets(req: Request, res: Response) {
    try {
      const countryCode = (req.query.countryCode as any) || req.countryCode;
      const status = req.query.status as any;

      const where: any = {
        latitude: { not: null },
        longitude: { not: null },
      };
      if (countryCode) where.countryCode = countryCode;
      if (status) where.status = status;

      const fleets = await prisma.fleet.findMany({
        where,
        select: {
          id: true,
          fleetCode: true,
          name: true,
          contactPerson: true,
          phone: true,
          email: true,
          address: true,
          latitude: true,
          longitude: true,
          countryCode: true,
          status: true,
          _count: {
            select: {
              vehicles: true,
              drivers: true,
              jobs: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        take: 500,
      });

      return sendSuccess(res, fleets);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * GET /api/map/jobs
   * Fetch service jobs with coordinates for live dispatch and routing
   */
  async getJobs(req: Request, res: Response) {
    try {
      const countryCode = (req.query.countryCode as any) || req.countryCode;
      const status = req.query.status as any;
      const driverId = req.query.driverId as string;

      const where: any = {
        serviceLatitude: { not: null },
        serviceLongitude: { not: null },
      };
      if (countryCode) where.countryCode = countryCode;
      if (status) where.status = status;
      if (driverId) where.driverId = driverId;

      const jobs = await prisma.job.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          fleet: {
            select: {
              id: true,
              name: true,
              fleetCode: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              year: true,
              make: true,
              model: true,
              licensePlate: true,
              tireSize: true,
            },
          },
          driver: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 300,
      });

      return sendSuccess(res, jobs);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * POST /api/map/geocode
   * Manual geocoding endpoint
   */
  async geocode(req: Request, res: Response) {
    try {
      const { address, countryCode } = req.body;
      if (!address || typeof address !== 'string' || !address.trim()) {
        return sendError(res, 'Valid address string is required', 400);
      }

      const geo = await geocodingService.geocodeAddress(address, countryCode);
      if (!geo.latitude || !geo.longitude) {
        return sendError(res, 'Could not geocode provided address', 404);
      }

      return sendSuccess(res, geo, 'Address geocoded successfully');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },

  /**
   * GET /api/map/config
   * Return mapbox public token for client initialization
   */
  async getConfig(_req: Request, res: Response) {
    try {
      const { config } = await import('../config/env.js');
      const token = config.MAPBOX_ACCESS_TOKEN || '';
      return sendSuccess(res, { token });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  },
};

export default mapController;
