import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import {
  sendSuccess,
  sendError,
  sanitizePaginationParams,
  calculateSkip,
  createPaginatedResponse,
} from '../utils/index.js';

export const fleetController = {
  async getFleets(req: Request, res: Response) {
    try {
      const pageParam = req.query.page ? Number(req.query.page) : 1;
      const limitParam = req.query.limit ? Number(req.query.limit) : 20;
      const { page, limit } = sanitizePaginationParams(pageParam, limitParam);
      const skip = calculateSkip(page, limit);

      const countryCode = req.query.countryCode as any;
      const status = req.query.status as any;
      const search = req.query.search as string;

      const where: any = {};
      if (countryCode) where.countryCode = countryCode;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { fleetCode: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ];
      }

      const [fleets, totalCount] = await Promise.all([
        prisma.fleet.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                vehicles: true,
                drivers: true,
                jobs: true,
                invoices: true,
              },
            },
          },
        }),
        prisma.fleet.count({ where }),
      ]);

      const paginated = createPaginatedResponse(fleets, page, limit, totalCount);
      return res.status(200).json(paginated);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * 24/7 Roadside Driver Verification (FR-2.1)
   * Lookup by company name or vehicle license plate
   */
  async lookupFleet(req: Request, res: Response) {
    try {
      const query = ((req.query.query || req.query.plate || '') as string).trim();
      if (!query) {
        return sendError(res, 'Query parameter or plate is required for lookup', 400);
      }

      // First check if plate matches any fleet vehicle
      const vehicleMatch = await prisma.vehicle.findFirst({
        where: {
          licensePlate: { contains: query, mode: 'insensitive' },
          fleetId: { not: null },
        },
        include: {
          fleet: {
            include: {
              drivers: true,
              vehicles: true,
            },
          },
        },
      });

      if (vehicleMatch && vehicleMatch.fleet) {
        return sendSuccess(res, {
          matchType: 'LICENSE_PLATE',
          fleet: vehicleMatch.fleet,
          matchedVehicle: vehicleMatch,
          verifiedTireSize: vehicleMatch.tireSize,
        });
      }

      // If no vehicle plate match, search fleet company name or phone
      const fleetMatch = await prisma.fleet.findFirst({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { fleetCode: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query } },
          ],
        },
        include: {
          vehicles: true,
          drivers: true,
        },
      });

      if (fleetMatch) {
        return sendSuccess(res, {
          matchType: 'COMPANY_NAME',
          fleet: fleetMatch,
          vehicles: fleetMatch.vehicles,
        });
      }

      return sendError(res, 'No fleet or registered vehicle found matching query', 404);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async getFleetById(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const fleet = await prisma.fleet.findUnique({
        where: { id },
        include: {
          vehicles: true,
          drivers: true,
          jobs: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { vehicle: true, serviceItems: true },
          },
          invoices: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              vehicles: true,
              drivers: true,
              jobs: true,
              invoices: true,
            },
          },
        },
      });

      if (!fleet) return sendError(res, 'Fleet not found', 404);
      return sendSuccess(res, fleet);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async createFleet(req: Request, res: Response) {
    try {
      const {
        fleetCode,
        name,
        companyName,
        contactPerson,
        contactName,
        phone,
        email,
        address,
        website,
        countryCode,
        country,
        status,
        virtualAssistantId,
      } = req.body;

      const resolvedName = (companyName || name || '').trim();
      if (!resolvedName) {
        return sendError(res, 'Company name is required', 400);
      }

      const resolvedContact = (contactPerson || contactName || 'Fleet Manager').trim();
      const resolvedPhone = (phone || '').trim() || '+14165550100';
      const effectiveCountry = countryCode || country || (req as any).countryCode || 'CA';

      const code = (fleetCode || '').trim() || `XMT-${Math.floor(1000 + Math.random() * 9000)}`;

      const existing = await prisma.fleet.findUnique({ where: { fleetCode: code } });
      if (existing) {
        return sendError(res, 'Fleet code already in use', 409);
      }

      const fleet = await prisma.fleet.create({
        data: {
          fleetCode: code,
          name: resolvedName,
          contactPerson: resolvedContact,
          phone: resolvedPhone,
          email: email?.trim() || null,
          address: address?.trim() || null,
          website: website?.trim() || null,
          countryCode: effectiveCountry,
          status: status || 'APPROVED',
          contractSignedAt: new Date(),
          virtualAssistantId: virtualAssistantId || null,
        },
      });

      return sendSuccess(res, fleet, 'Fleet created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async updateFleet(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const {
        fleetCode,
        name,
        companyName,
        contactPerson,
        contactName,
        phone,
        email,
        poaEmail,
        fleetManager,
        ceoOwnerName,
        address,
        website,
        countryCode,
        status,
        contractSignedAt,
        virtualAssistantId,
      } = req.body;

      const data: any = {};
      if (fleetCode !== undefined) data.fleetCode = fleetCode;
      if (name || companyName) data.name = (name || companyName).trim();
      if (contactPerson || contactName) data.contactPerson = (contactPerson || contactName).trim();
      if (phone !== undefined) data.phone = phone.trim();
      if (email !== undefined) data.email = email?.trim() || null;
      if (poaEmail !== undefined) data.poaEmail = poaEmail?.trim() || null;
      if (fleetManager !== undefined) data.fleetManager = fleetManager?.trim() || null;
      if (ceoOwnerName !== undefined) data.ceoOwnerName = ceoOwnerName?.trim() || null;
      if (address !== undefined) data.address = address?.trim() || null;
      if (website !== undefined) data.website = website?.trim() || null;
      if (countryCode !== undefined) data.countryCode = countryCode;
      if (status !== undefined) data.status = status;
      if (contractSignedAt !== undefined) data.contractSignedAt = contractSignedAt;
      if (virtualAssistantId !== undefined) data.virtualAssistantId = virtualAssistantId || null;

      const updated = await prisma.fleet.update({
        where: { id },
        data,
      });

      return sendSuccess(res, updated, 'Fleet updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async getFleetDrivers(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const drivers = await prisma.fleetDriver.findMany({
        where: { fleetId: id },
        orderBy: { createdAt: 'desc' },
      });
      return sendSuccess(res, drivers);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async addFleetDriver(req: Request, res: Response) {
    try {
      const fleetId = String(req.params.id);
      const { fullName, phone, licensePlate } = req.body;

      const existing = await prisma.fleetDriver.findUnique({
        where: {
          fleetId_phone: {
            fleetId,
            phone,
          },
        },
      });
      if (existing) {
        return sendError(res, 'Driver with this phone already exists in this fleet', 409);
      }

      const driver = await prisma.fleetDriver.create({
        data: {
          fleetId,
          fullName,
          phone,
          licensePlate,
        },
      });

      return sendSuccess(res, driver, 'Driver added successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async deleteFleetDriver(req: Request, res: Response) {
    try {
      const driverId = String(req.params.driverId);
      await prisma.fleetDriver.delete({ where: { id: driverId } });
      return sendSuccess(res, null, 'Driver removed successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async deleteFleet(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await prisma.fleet.delete({ where: { id } });
      return sendSuccess(res, null, 'Fleet deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },
};

export default fleetController;
