import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { prisma } from '../config/database.js';
import { sendSuccess, sendError } from '../utils/index.js';
import { Request, Response } from 'express';

const router = Router();

router.use(authenticate);
router.use(authorize(['CUSTOMER_MEMBER', 'ADMIN', 'GENERAL_MANAGER']));

async function getScopedCustomer(req: Request) {
  const userId = (req.user as any)?.id;
  const userEmail = (req.user as any)?.email;
  const userPhone = (req.user as any)?.phone;
  const role = (req.user as any)?.role;
  const countryCode = (req.user as any)?.countryCode || 'CA';
  const fullName = (req.user as any)?.fullName || 'Member Customer';
  const requestedCustomerId = (req.query.customerId as string) || (req.body?.customerId as string);

  if (requestedCustomerId && ['ADMIN', 'GENERAL_MANAGER'].includes(role)) {
    const cust = await prisma.customer.findUnique({ where: { id: requestedCustomerId } });
    if (cust) return cust;
  }

  // 1. Direct match by userId
  let customer = userId ? await prisma.customer.findFirst({ where: { userId } }) : null;

  // 2. Email or Phone match -> link account
  if (!customer && (userEmail || userPhone)) {
    customer = await prisma.customer.findFirst({
      where: {
        OR: [
          ...(userEmail ? [{ email: { equals: String(userEmail), mode: 'insensitive' as const } }] : []),
          ...(userPhone ? [{ phone: String(userPhone) }] : []),
        ],
      },
    });

    if (customer && userId && !customer.userId) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { userId },
      });
    }
  }

  // 3. Auto-provision customer profile for CUSTOMER_MEMBER if none exists
  if (!customer && role === 'CUSTOMER_MEMBER' && userId) {
    const fallbackPhone = userPhone || `+14165550${Math.floor(100 + Math.random() * 900)}`;
    customer = await prisma.customer.create({
      data: {
        userId,
        fullName,
        email: userEmail,
        phone: fallbackPhone,
        countryCode: (['CA', 'US', 'UK'].includes(countryCode) ? countryCode : 'CA') as any,
        customerType: 'MEMBERSHIP',
        membershipTier: 'GOLD',
        membershipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // 4. Admin fallback
  if (!customer && ['ADMIN', 'GENERAL_MANAGER'].includes(role)) {
    customer = await prisma.customer.findFirst({
      where: { customerType: 'MEMBERSHIP' },
      orderBy: { createdAt: 'desc' },
    });
    if (!customer) {
      customer = await prisma.customer.findFirst({ orderBy: { createdAt: 'desc' } });
    }
  }

  return customer;
}

/**
 * @route   GET /api/member-portal/vehicles
 * @desc    Member's saved vehicles
 */
router.get('/vehicles', async (req: Request, res: Response) => {
  try {
    const customer = await getScopedCustomer(req);
    if (!customer) return sendSuccess(res, []);

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
 * @route   POST /api/member-portal/vehicles
 * @desc    Add a vehicle to member garage
 */
router.post('/vehicles', async (req: Request, res: Response) => {
  try {
    const customer = await getScopedCustomer(req);
    if (!customer) {
      return sendError(res, 'Member profile not found', 404);
    }
    const { make, model, year, licensePlate, vin, tireSize, color } = req.body;
    if (!make || !model) {
      return sendError(res, 'Vehicle make and model are required', 400);
    }
    const country = customer.countryCode || 'CA';
    const vehicle = await prisma.vehicle.create({
      data: {
        customerId: customer.id,
        countryCode: country,
        make: String(make).trim(),
        model: String(model).trim(),
        year: year ? Number(year) : new Date().getFullYear(),
        licensePlate: licensePlate ? String(licensePlate).trim().toUpperCase() : null,
        vin: vin ? String(vin).trim().toUpperCase() : null,
        tireSize: tireSize ? String(tireSize).trim() : 'TBD',
        color: color ? String(color).trim() : null,
      },
    });
    return sendSuccess(res, vehicle, 'Vehicle added to garage', 201);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/**
 * @route   GET /api/member-portal/jobs
 * @desc    Member's job history
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const customer = await getScopedCustomer(req);
    if (!customer) return sendSuccess(res, []);

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
    const customer = await getScopedCustomer(req);
    if (!customer) return sendSuccess(res, []);

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

/**
 * @route   GET /api/member-portal/invoices
 * @desc    Member's invoices (pending & paid)
 */
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const customer = await getScopedCustomer(req);
    if (!customer) return sendSuccess(res, []);

    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [{ customerId: customer.id }, { jobs: { some: { customerId: customer.id } } }],
      },
      include: {
        items: true,
        jobs: { include: { vehicle: true, serviceItems: true } },
        payments: { orderBy: { recordedAt: 'desc' } },
      },
      orderBy: { issueDate: 'desc' },
      take: 50,
    });
    return sendSuccess(res, invoices);
  } catch (err: any) {
    return sendError(res, err.message);
  }
});

export default router;
