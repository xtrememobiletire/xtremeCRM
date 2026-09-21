import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { prisma } from '../config/database.js';
import { sendSuccess, sendError } from '../utils/index.js';
import { Request, Response } from 'express';

const router = Router();

router.use(authenticate);
router.use(authorize(['FLEET_MANAGER', 'ADMIN']));

/**
 * @route   GET /api/fleet-portal/dashboard
 * @desc    Fleet Manager KPI dashboard scoped to their fleet
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const fleet = await prisma.fleet.findFirst({
      where: { managerUserId: userId },
      include: { _count: { select: { vehicles: true, drivers: true, jobs: true } } },
    });
    if (!fleet) return sendError(res, 'No fleet assigned to your account', 404);

    return sendSuccess(res, {
      fleet: {
        id: fleet.id,
        companyName: fleet.name,
        accountCode: fleet.fleetCode,
        contactEmail: fleet.email,
        contactPhone: fleet.phone,
        address: fleet.address,
      },
      totalVehicles: fleet._count.vehicles,
      totalDrivers: fleet._count.drivers,
      totalJobs: fleet._count.jobs,
    });
  } catch (err: any) {
    return sendError(res, err.message);
  }
});

/**
 * @route   GET /api/fleet-portal/vehicles
 * @desc    Vehicles in fleet manager's fleet
 */
router.get('/vehicles', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const fleet = await prisma.fleet.findFirst({ where: { managerUserId: userId } });
    if (!fleet) return sendError(res, 'No fleet assigned', 404);

    const vehicles = await prisma.vehicle.findMany({
      where: { fleetId: fleet.id },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, vehicles);
  } catch (err: any) {
    return sendError(res, err.message);
  }
});

/**
 * @route   GET /api/fleet-portal/drivers
 * @desc    Drivers in fleet manager's fleet
 */
router.get('/drivers', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const fleet = await prisma.fleet.findFirst({ where: { managerUserId: userId } });
    if (!fleet) return sendError(res, 'No fleet assigned', 404);

    const drivers = await prisma.fleetDriver.findMany({
      where: { fleetId: fleet.id },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, drivers);
  } catch (err: any) {
    return sendError(res, err.message);
  }
});

/**
 * @route   GET /api/fleet-portal/jobs
 * @desc    Jobs for fleet manager's fleet
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const fleet = await prisma.fleet.findFirst({ where: { managerUserId: userId } });
    if (!fleet) return sendError(res, 'No fleet assigned', 404);

    const jobs = await prisma.job.findMany({
      where: { fleetId: fleet.id },
      include: {
        vehicle: true,
        serviceItems: true,
        driver: { select: { id: true, fullName: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return sendSuccess(res, jobs);
  } catch (err: any) {
    return sendError(res, err.message);
  }
});

/**
 * @route   GET /api/fleet-portal/invoices
 * @desc    Invoices for fleet (pending + paid)
 */
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const fleet = await prisma.fleet.findFirst({ where: { managerUserId: userId } });
    if (!fleet) return sendError(res, 'No fleet assigned', 404);

    const status = req.query.status as string;
    const where: any = { fleetId: fleet.id };
    if (status === 'PENDING') where.status = { in: ['DRAFT', 'SENT', 'OVERDUE'] };
    if (status === 'PAID') where.status = 'PAID';

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return sendSuccess(res, invoices);
  } catch (err: any) {
    return sendError(res, err.message);
  }
});

/**
 * @route   GET /api/fleet-portal/messages
 * @desc    Portal messages/notifications for fleet
 */
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const fleet = await prisma.fleet.findFirst({ where: { managerUserId: userId } });
    if (!fleet) return sendError(res, 'No fleet assigned', 404);

    const messages = await prisma.portalMessage.findMany({
      where: { fleetId: fleet.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return sendSuccess(res, messages);
  } catch (err: any) {
    return sendError(res, err.message);
  }
});

export default router;
