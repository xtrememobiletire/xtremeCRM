import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { prisma } from '../config/database.js';
import { sendSuccess, sendError } from '../utils/index.js';
import { Request, Response } from 'express';

const router = Router();

router.use(authenticate);
router.use(authorize(['CUSTOMER_MEMBER', 'ADMIN']));

/**
 * @route   GET /api/member-portal/vehicles
 * @desc    Member's saved vehicles
 */
router.get('/vehicles', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const customer = await prisma.customer.findFirst({ where: { userId } });
    if (!customer) return sendError(res, 'No customer profile linked to your account', 404);

    const vehicles = await prisma.vehicle.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, vehicles);
  } catch (err: any) {
    return sendError(res, err.message);
  }
});

/**
 * @route   GET /api/member-portal/jobs
 * @desc    Member's job history
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const customer = await prisma.customer.findFirst({ where: { userId } });
    if (!customer) return sendError(res, 'No customer profile linked', 404);

    const jobs = await prisma.job.findMany({
      where: { customerId: customer.id },
      include: {
        vehicle: true,
        serviceItems: true,
        driver: { select: { id: true, fullName: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // NFR-4: Strip internal financials from member view
    const sanitized = jobs.map(j => {
      const { materialCostCents: _, itPlatformFeeCents: __, repairerFeeCents: ___,
              otherExpenseCents: ____, expenseNotes: _____, expenseStatedById: ______,
              expenseStatedAt: _______, ...rest } = j;
      return rest;
    });

    return sendSuccess(res, sanitized);
  } catch (err: any) {
    return sendError(res, err.message);
  }
});

/**
 * @route   GET /api/member-portal/receipts
 * @desc    Member's payment receipts
 */
router.get('/receipts', async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const customer = await prisma.customer.findFirst({ where: { userId } });
    if (!customer) return sendError(res, 'No customer profile linked', 404);

    const jobs = await prisma.job.findMany({
      where: {
        customerId: customer.id,
        paymentStatus: 'VERIFIED_PAID',
      },
      select: {
        id: true,
        jobCode: true,
        totalCents: true,
        currency: true,
        receiptUrl: true,
        completedAt: true,
        serviceItems: { select: { serviceName: true, unitPriceCents: true, quantity: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: 50,
    });
    return sendSuccess(res, jobs);
  } catch (err: any) {
    return sendError(res, err.message);
  }
});

export default router;
