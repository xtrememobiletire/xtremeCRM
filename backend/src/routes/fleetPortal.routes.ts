import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { prisma } from '../config/database.js';
import { sendSuccess, sendError, generateUniqueJobCode } from '../utils/index.js';
import { getIO } from '../config/socket.js';
import { geocodingService } from '../services/geocodingService.js';
import { sseManager } from '../services/sseManager.js';
import { resolveTimezoneFromCoords } from '../utils/timezone.js';

const router = Router();

router.use(authenticate);
router.use(authorize(['FLEET_MANAGER', 'ADMIN', 'GENERAL_MANAGER']));

async function getScopedFleet(req: Request) {
  const userId = (req.user as any)?.id;
  const userEmail = (req.user as any)?.email;
  const role = (req.user as any)?.role;
  const requestedFleetId = (req.query.fleetId as string) || (req.body?.fleetId as string);
  const includeCounts = {
    _count: { select: { vehicles: true, drivers: true, jobs: true, invoices: true } },
  };

  // IDOR fix: Only ADMIN or GENERAL_MANAGER can inspect another fleet
  if (requestedFleetId && ['ADMIN', 'GENERAL_MANAGER'].includes(role)) {
    const matched = await prisma.fleet.findUnique({
      where: { id: requestedFleetId },
      include: includeCounts,
    });
    if (matched) return matched;
  }

  // Scoped resolution strictly for authenticated fleet manager
  let fleet = await prisma.fleet.findFirst({
    where: {
      OR: [
        ...(userId ? [{ managerUserId: userId }] : []),
        ...(userEmail ? [{ email: { equals: String(userEmail), mode: 'insensitive' as const } }] : []),
      ],
    },
    include: includeCounts,
  });

  if (!fleet && ['FLEET_MANAGER', 'ADMIN', 'GENERAL_MANAGER'].includes(role)) {
    fleet = await prisma.fleet.findFirst({
      orderBy: { createdAt: 'asc' },
      include: includeCounts,
    });
  }

  return fleet;
}

/**
 * @route   GET /api/fleet-portal/dashboard
 * @desc    Fleet Manager KPI dashboard scoped to their fleet
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const fleet = await getScopedFleet(req);
    if (!fleet) {
      return sendSuccess(res, {
        fleet: null,
        totalVehicles: 0,
        totalDrivers: 0,
        totalJobs: 0,
        pendingInvoicesCount: 0,
        paidInvoicesCount: 0,
      });
    }

    const [pendingCount, paidCount] = await Promise.all([
      prisma.invoice.count({
        where: { fleetId: fleet.id, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
      }),
      prisma.invoice.count({
        where: { fleetId: fleet.id, status: 'PAID' },
      }),
    ]);

    return sendSuccess(res, {
      fleet: {
        id: fleet.id,
        companyName: fleet.name,
        accountCode: fleet.fleetCode,
        contactEmail: fleet.email,
        contactPhone: fleet.phone,
        address: fleet.address,
        poaEmail: fleet.poaEmail,
        status: fleet.status || 'APPROVED',
        contactPerson: fleet.contactPerson,
        countryCode: fleet.countryCode,
      },
      totalVehicles: fleet._count.vehicles,
      totalDrivers: fleet._count.drivers,
      totalJobs: fleet._count.jobs,
      pendingInvoicesCount: pendingCount,
      paidInvoicesCount: paidCount,
    });
  } catch (err: any) {
    return sendError(res, err.message);
  }
});

/**
 * @route   PATCH /api/fleet-portal/company
 * @desc    Update company profile details
 */
router.patch('/company', async (req: Request, res: Response) => {
  try {
    const fleet = await getScopedFleet(req);
    if (!fleet) return sendError(res, 'Fleet not found', 404);

    const { email, phone, address, website, contactPerson } = req.body;
    const updated = await prisma.fleet.update({
      where: { id: fleet.id },
      data: {
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(website !== undefined && { website }),
        ...(contactPerson !== undefined && { contactPerson }),
      },
    });

    return sendSuccess(res, updated, 'Company details updated successfully');
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
    const fleet = await getScopedFleet(req);
    if (!fleet) return sendSuccess(res, []);

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
 * @route   POST /api/fleet-portal/vehicles
 * @desc    Add a vehicle to this fleet
 */
router.post('/vehicles', async (req: Request, res: Response) => {
  try {
    const fleet = await getScopedFleet(req);
    if (!fleet) return sendError(res, 'Fleet not found', 404);

    const { year, make, model, licensePlate, tireSize, vin, unitNumber } = req.body;
    if (!make || !model || !tireSize) {
      return sendError(res, 'Make, Model, and Tire Size are required', 400);
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        fleetId: fleet.id,
        countryCode: fleet.countryCode,
        year: Number(year) || new Date().getFullYear(),
        make: make.trim(),
        model: model.trim(),
        unitNumber: unitNumber ? String(unitNumber).trim() : null,
        licensePlate: licensePlate ? licensePlate.trim().toUpperCase() : null,
        tireSize: tireSize.trim(),
        vin: vin ? vin.trim().toUpperCase() : null,
      },
    });

    return sendSuccess(res, vehicle, 'Vehicle registered successfully', 201);
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
});

/**
 * @route   DELETE /api/fleet-portal/vehicles/:id
 * @desc    Remove vehicle from fleet
 */
router.delete('/vehicles/:id', async (req: Request, res: Response) => {
  try {
    const fleet = await getScopedFleet(req);
    if (!fleet) return sendError(res, 'Fleet not found', 404);

    const id = String(req.params.id);
    await prisma.vehicle.deleteMany({
      where: { id, fleetId: fleet.id },
    });

    return sendSuccess(res, null, 'Vehicle removed successfully');
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
});

/**
 * @route   GET /api/fleet-portal/drivers
 * @desc    Drivers in fleet manager's fleet
 */
router.get('/drivers', async (req: Request, res: Response) => {
  try {
    const fleet = await getScopedFleet(req);
    if (!fleet) return sendSuccess(res, []);

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
 * @route   POST /api/fleet-portal/drivers
 * @desc    Register a driver in the fleet
 */
router.post('/drivers', async (req: Request, res: Response) => {
  try {
    const fleet = await getScopedFleet(req);
    if (!fleet) return sendError(res, 'Fleet not found', 404);

    const { fullName, phone, licensePlate } = req.body;
    if (!fullName || !phone) {
      return sendError(res, 'Full Name and Phone Number are required', 400);
    }

    const cleanPhone = phone.trim();
    const existing = await prisma.fleetDriver.findUnique({
      where: { fleetId_phone: { fleetId: fleet.id, phone: cleanPhone } },
    });

    if (existing) {
      return sendError(res, 'Driver with this phone already exists in your fleet', 409);
    }

    const driver = await prisma.fleetDriver.create({
      data: {
        fleetId: fleet.id,
        fullName: fullName.trim(),
        phone: cleanPhone,
        licensePlate: licensePlate ? licensePlate.trim().toUpperCase() : null,
      },
    });

    return sendSuccess(res, driver, 'Driver registered successfully', 201);
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
});

/**
 * @route   DELETE /api/fleet-portal/drivers/:id
 * @desc    Remove driver from fleet
 */
router.delete('/drivers/:id', async (req: Request, res: Response) => {
  try {
    const fleet = await getScopedFleet(req);
    if (!fleet) return sendError(res, 'Fleet not found', 404);

    const id = String(req.params.id);
    await prisma.fleetDriver.deleteMany({
      where: { id, fleetId: fleet.id },
    });

    return sendSuccess(res, null, 'Driver removed successfully');
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
});

/**
 * @route   PATCH /api/fleet-portal/drivers/:id
 * @desc    Update driver details (e.g. assign vehicle license plate)
 */
router.patch('/drivers/:id', async (req: Request, res: Response) => {
  try {
    const fleet = await getScopedFleet(req);
    if (!fleet) return sendError(res, 'Fleet not found', 404);

    const id = String(req.params.id);
    const { fullName, phone, licensePlate } = req.body;

    await prisma.fleetDriver.updateMany({
      where: { id, fleetId: fleet.id },
      data: {
        ...(fullName && { fullName: fullName.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(licensePlate !== undefined && {
          licensePlate: licensePlate ? licensePlate.trim().toUpperCase() : null,
        }),
      },
    });

    return sendSuccess(res, null, 'Driver updated successfully');
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
});

/**
 * @route   GET /api/fleet-portal/jobs
 * @desc    Jobs / service requests for fleet
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const fleet = await getScopedFleet(req);
    if (!fleet) return sendSuccess(res, []);

    const jobs = await prisma.job.findMany({
      where: { fleetId: fleet.id },
      include: {
        vehicle: true,
        serviceItems: true,
        driver: { select: { id: true, fullName: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return sendSuccess(res, jobs);
  } catch (err: any) {
    return sendError(res, err.message);
  }
});

const PORTAL_SERVICE_MAP: Record<
  string,
  { category: 'TIRE_SERVICE' | 'ROADSIDE_ASSISTANCE' | 'MAINTENANCE'; priceCents: number }
> = {
  // Tire Services
  'Flat Tire Repair': { category: 'TIRE_SERVICE', priceCents: 12000 },
  'Flat Tire Repair (Plug)': { category: 'TIRE_SERVICE', priceCents: 12000 },
  'Tire Repair (plug)': { category: 'TIRE_SERVICE', priceCents: 12000 },
  'Tire Repair (Plug)': { category: 'TIRE_SERVICE', priceCents: 12000 },
  'Tire Patch': { category: 'TIRE_SERVICE', priceCents: 8500 },
  'Tire Patch Repair': { category: 'TIRE_SERVICE', priceCents: 8500 },
  'Stem Valve Replacement': { category: 'TIRE_SERVICE', priceCents: 8500 },
  'Valve Stem Replacement': { category: 'TIRE_SERVICE', priceCents: 8500 },
  'New Tire Replacement': { category: 'TIRE_SERVICE', priceCents: 24000 },
  'Used Tire Replacement': { category: 'TIRE_SERVICE', priceCents: 14000 },
  'Used tire replacement': { category: 'TIRE_SERVICE', priceCents: 14000 },
  'New RIM Replacement': { category: 'TIRE_SERVICE', priceCents: 22000 },
  'Used RIM Replacement': { category: 'TIRE_SERVICE', priceCents: 13000 },
  'Seasonal Tire Swap (On-Rim)': { category: 'TIRE_SERVICE', priceCents: 11000 },
  'Tire Swap (ON RIM)': { category: 'TIRE_SERVICE', priceCents: 11000 },
  'Seasonal Tire Swap (Off-Rim)': { category: 'TIRE_SERVICE', priceCents: 16000 },
  'Tire Swap (OFF RIM)': { category: 'TIRE_SERVICE', priceCents: 16000 },
  'Spare Tire Change': { category: 'TIRE_SERVICE', priceCents: 10000 },
  'Wheel Balance': { category: 'TIRE_SERVICE', priceCents: 9000 },
  'Rim Repair': { category: 'TIRE_SERVICE', priceCents: 17500 },

  // Roadside Assistance
  'Jump Start': { category: 'ROADSIDE_ASSISTANCE', priceCents: 9500 },
  'Battery Booster': { category: 'ROADSIDE_ASSISTANCE', priceCents: 9500 },
  'Jump Start / Battery Booster': { category: 'ROADSIDE_ASSISTANCE', priceCents: 9500 },
  'Battery Replacement': { category: 'ROADSIDE_ASSISTANCE', priceCents: 21000 },
  'Lockout Service': { category: 'ROADSIDE_ASSISTANCE', priceCents: 13500 },
  'Lock Smith Service': { category: 'ROADSIDE_ASSISTANCE', priceCents: 13500 },
  'Lockout / Lock Smith Service': { category: 'ROADSIDE_ASSISTANCE', priceCents: 13500 },
  'Fuel Delivery': { category: 'ROADSIDE_ASSISTANCE', priceCents: 10500 },
  'Towing Service': { category: 'ROADSIDE_ASSISTANCE', priceCents: 18000 },
  'Winch Out': { category: 'ROADSIDE_ASSISTANCE', priceCents: 16500 },
  'Winch Out Service': { category: 'ROADSIDE_ASSISTANCE', priceCents: 16500 },
  'Emergency Roadside Assistance': { category: 'ROADSIDE_ASSISTANCE', priceCents: 18000 },

  // Maintenance & Inspections
  'Battery Installation': { category: 'MAINTENANCE', priceCents: 15000 },
  'Tire Rotation': { category: 'MAINTENANCE', priceCents: 8000 },
  'Oil Change': { category: 'MAINTENANCE', priceCents: 11000 },
  'Brake Inspection': { category: 'MAINTENANCE', priceCents: 9500 },
};

/**
 * @route   POST /api/fleet-portal/request-service
 * @desc    Book a new service request directly from the Fleet Manager Portal
 */
router.post('/request-service', async (req: Request, res: Response) => {
  try {
    const fleet = await getScopedFleet(req);
    if (!fleet) return sendError(res, 'Fleet account not found', 404);

    const {
      vehicleId,
      driverId,
      serviceItems,
      serviceName = 'Tire Repair (plug)',
      serviceType = 'STANDARD',
      serviceCategory,
      serviceAddress: explicitAddress,
      address,
      serviceLatitude,
      serviceLongitude,
      appointmentDate,
      scheduledAt,
      contactPhone,
      tireSize,
      notes,
      problemNotes,
    } = req.body;

    const serviceAddress = (explicitAddress || address || fleet.address || '').trim();

    if (!vehicleId && !tireSize) {
      return sendError(res, 'Please select a vehicle or provide a tire size', 400);
    }
    if (!serviceAddress) {
      return sendError(res, 'Service / breakdown location is required', 400);
    }

    const country = (fleet.countryCode || 'CA') as 'CA' | 'US' | 'UK';
    const currency = country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : 'CAD';
    const taxRateBps = country === 'CA' ? 1300 : country === 'UK' ? 2000 : 800;

    let lat = typeof serviceLatitude === 'number' ? serviceLatitude : null;
    let lng = typeof serviceLongitude === 'number' ? serviceLongitude : null;
    if ((lat === null || lng === null) && serviceAddress) {
      try {
        const geo = await geocodingService.geocodeAddress(serviceAddress, country);
        if (geo) {
          lat = geo.latitude;
          lng = geo.longitude;
        }
      } catch {
        // geocode fallback
      }
    }

    const serviceTimezone = req.body.serviceTimezone || resolveTimezoneFromCoords(lat, lng, country);

    const isEmergency = serviceType === 'EMERGENCY';
    let itemsToCreate: Array<{
      serviceName: string;
      category: 'TIRE_SERVICE' | 'ROADSIDE_ASSISTANCE' | 'MAINTENANCE';
      unitPriceCents: number;
      quantity: number;
      notes?: string | null;
    }> = [];

    if (Array.isArray(serviceItems) && serviceItems.length > 0) {
      itemsToCreate = serviceItems.map((item: any) => {
        const itemKey = String(item.serviceName || item.name || '').trim();
        const catalogEntry = PORTAL_SERVICE_MAP[itemKey];
        const category = item.category || catalogEntry?.category || (isEmergency ? 'ROADSIDE_ASSISTANCE' : 'TIRE_SERVICE');
        const unitPriceCents = item.unitPriceCents ? Math.round(Number(item.unitPriceCents)) : (catalogEntry?.priceCents ?? (isEmergency ? 18000 : 12000));
        const quantity = Math.max(1, Math.round(Number(item.quantity || 1)));
        return {
          serviceName: itemKey || 'Commercial Fleet Service',
          category: category as any,
          unitPriceCents,
          quantity,
          notes: item.notes ? String(item.notes).trim() : null,
        };
      });
    } else {
      const rawServiceKey = String(serviceCategory || serviceName || '').trim();
      const catalogEntry = PORTAL_SERVICE_MAP[rawServiceKey];
      const resolvedCategory = catalogEntry?.category || (isEmergency ? 'ROADSIDE_ASSISTANCE' : 'TIRE_SERVICE');
      const basePriceCents = catalogEntry?.priceCents ?? (isEmergency ? 18000 : 12000);
      itemsToCreate = [
        {
          serviceName: rawServiceKey || 'Commercial Fleet Service',
          category: resolvedCategory as any,
          unitPriceCents: basePriceCents,
          quantity: 1,
          notes: `Requested via Fleet Portal: ${tireSize || ''}`,
        },
      ];
    }

    const subtotalCents = itemsToCreate.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0
    );
    const discountPercent = Math.max(0, Number(fleet.discountPercent || 0));
    const discountCents = Math.round(subtotalCents * (discountPercent / 100));
    const netSubtotalCents = Math.max(0, subtotalCents - discountCents);
    const taxAmountCents = Math.round((netSubtotalCents * taxRateBps) / 10000);
    const totalCents = netSubtotalCents + taxAmountCents;
    const itPlatformFeeCents = country === 'CA' ? 150 : 100;

    const rawScheduled = scheduledAt || appointmentDate;
    const scheduledDateObj = !isEmergency && rawScheduled ? new Date(rawScheduled) : new Date(Date.now() + 30 * 60000);
    const windowEndObj = new Date(scheduledDateObj.getTime() + 60 * 60000);

    const jobCode = await generateUniqueJobCode(country, 'JOB');

    let finalVehicleId = vehicleId;
    if (!finalVehicleId) {
      const v = await prisma.vehicle.create({
        data: {
          fleetId: fleet.id,
          countryCode: country,
          year: new Date().getFullYear(),
          make: 'Fleet',
          model: 'Vehicle',
          tireSize: tireSize || '11R22.5',
        },
      });
      finalVehicleId = v.id;
    }

    let vehicleObj = null;
    if (finalVehicleId) {
      vehicleObj = await prisma.vehicle.findUnique({ where: { id: finalVehicleId } });
    }
    const vehNoteParts: string[] = [];
    if (vehicleObj?.unitNumber) vehNoteParts.push(`Unit ${vehicleObj.unitNumber}`);
    if (vehicleObj?.licensePlate) vehNoteParts.push(`Plate: ${vehicleObj.licensePlate}`);
    if (vehicleObj?.year || vehicleObj?.make || vehicleObj?.model) {
      vehNoteParts.push(`${vehicleObj.year || ''} ${vehicleObj.make || ''} ${vehicleObj.model || ''}`.trim());
    }
    const vehNote = vehNoteParts.length > 0 ? `[${vehNoteParts.join(' | ')}] ` : '';
    const finalTireSize = tireSize || vehicleObj?.tireSize || 'N/A';

    let driverPhone = contactPhone?.trim() || fleet.phone;
    let driverName = (req.body.recipientName || fleet.contactPerson || fleet.name || '').trim();
    if (driverId) {
      const d = await prisma.fleetDriver.findUnique({ where: { id: String(driverId) } });
      if (d) {
        driverName = d.fullName;
        if (d.phone) driverPhone = d.phone;
      }
    }

    const creatorId = (req.user as any)?.id || fleet.managerUserId || (await prisma.user.findFirst())?.id;

    const createdJob = await prisma.job.create({
      data: {
        jobCode,
        createdById: creatorId!,
        fleetId: fleet.id,
        vehicleId: finalVehicleId,
        countryCode: country,
        source: 'FLEET_PORTAL',
        status: 'PENDING',
        urgency: isEmergency ? 'URGENT' : 'STANDARD',
        serviceAddress,
        serviceLatitude: lat,
        serviceLongitude: lng,
        serviceTimezone,
        appointmentDate: scheduledDateObj,
        arrivalWindowStart: scheduledDateObj,
        arrivalWindowEnd: windowEndObj,
        estimatedArrivalAt: scheduledDateObj,
        recipientName: driverName,
        recipientPhone: driverPhone,
        problemNotes: `[Fleet Self-Request] ${vehNote}Tire Spec: ${finalTireSize}. ${notes || problemNotes || ''}`.trim(),
        currency: currency as any,
        subtotalCents,
        taxRateBps,
        taxAmountCents,
        totalCents,
        itPlatformFeeCents,
        paymentMethod: 'INVOICE_NET30',
        paymentStatus: 'UNPAID',
        serviceItems: {
          create: itemsToCreate,
        },
      },
      include: {
        vehicle: true,
        serviceItems: true,
        driver: { select: { id: true, fullName: true, phone: true } },
      },
    });

    try {
      sseManager.broadcast(`sse:dispatch:${country}`, 'job:created', createdJob);
    } catch {
      // sse ignore
    }

    try {
      const io = getIO();
      io.to(`dispatch:${country}`).emit('job:created', createdJob);
      io.to(`dispatch:${country}`).emit('job:triage_new', createdJob);
      io.to(`fleet:${fleet.id}`).emit('job:created', createdJob);
    } catch {
      // socket not ready or offline
    }

    return sendSuccess(res, createdJob, 'Service request booked successfully', 201);
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
});

/**
 * @route   GET /api/fleet-portal/invoices
 * @desc    Invoices for fleet (pending + paid)
 */
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const fleet = await getScopedFleet(req);
    if (!fleet) return sendSuccess(res, []);

    const status = req.query.status as string;
    const where: any = { fleetId: fleet.id };
    if (status === 'PENDING') where.status = { in: ['PENDING', 'PARTIAL', 'OVERDUE'] };
    if (status === 'PAID') where.status = 'PAID';

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
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
    const fleet = await getScopedFleet(req);
    if (!fleet) return sendSuccess(res, []);

    const messages: any[] = [];
    return sendSuccess(res, messages);
  } catch (err: any) {
    return sendError(res, err.message);
  }
});

export default router;
