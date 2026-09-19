import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import {
  sendSuccess,
  sendError,
  sanitizePaginationParams,
  calculateSkip,
  createPaginatedResponse,
  formatCurrency,
} from '../utils/index.js';

export const invoiceController = {
  async getInvoices(req: Request, res: Response) {
    try {
      const pageParam = req.query.page ? Number(req.query.page) : 1;
      const limitParam = req.query.limit ? Number(req.query.limit) : 20;
      const { page, limit } = sanitizePaginationParams(pageParam, limitParam);
      const skip = calculateSkip(page, limit);

      const countryCode = (req.query.countryCode as any) || req.countryCode;
      const status = req.query.status as any;
      const fleetId = req.query.fleetId as string;
      const customerId = req.query.customerId as string;
      const search = req.query.search as string;

      const where: any = {};
      if (countryCode) where.countryCode = countryCode;
      if (status) where.status = status;
      if (fleetId) where.fleetId = fleetId;
      if (customerId) where.customerId = customerId;
      if (search) {
        where.OR = [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { customer: { fullName: { contains: search, mode: 'insensitive' } } },
          { fleet: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [invoices, totalCount] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
            customer: true,
            fleet: true,
            createdBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        }),
        prisma.invoice.count({ where }),
      ]);

      const paginated = createPaginatedResponse(invoices, page, limit, totalCount);
      return res.status(200).json(paginated);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async getInvoiceById(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          items: true,
          customer: true,
          fleet: true,
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          jobs: {
            include: {
              vehicle: true,
              serviceItems: true,
            },
          },
        },
      });

      if (!invoice) return sendError(res, 'Invoice not found', 404);
      return sendSuccess(res, invoice);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * 1-Click Invoice Generation from Job (FR-5.2, FR-5.4)
   * Format: [CreatorInitials]-[CountryCode]-[SequentialDigits] (e.g. MW-US-0002)
   */
  async generateInvoice(req: Request, res: Response) {
    try {
      const { jobId, dueDate: customDueDate, notes } = req.body;
      const creator = req.user as any;
      const createdById = creator?.id || (await prisma.user.findFirst())?.id;
      if (!createdById) return sendError(res, 'No creator user found', 400);

      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          customer: true,
          fleet: true,
          vehicle: true,
          serviceItems: true,
          createdBy: true,
        },
      });

      if (!job) return sendError(res, 'Job not found', 404);

      // Extract creator initials (e.g. "Sarah Agent" -> "SA", fallback "XT")
      const initials = (creator?.fullName || 'Xtreme Admin')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) || 'XT';

      const count = await prisma.invoice.count({
        where: { countryCode: job.countryCode },
      });
      const seqDigits = String(count + 1).padStart(4, '0');
      const invoiceNumber = `${initials}-${job.countryCode}-${seqDigits}`;

      const issueDate = new Date();
      const dueDate = customDueDate ? new Date(customDueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Build line items from job service items
      const itemsData = job.serviceItems.length > 0
        ? job.serviceItems.map((item) => ({
            itemDetails: `${item.serviceName} (${job.vehicle ? `${job.vehicle.year} ${job.vehicle.make} ${job.vehicle.model}` : 'Standard Vehicle'})`,
            unitPriceCents: item.unitPriceCents,
            quantity: item.quantity,
          }))
        : [
            {
              itemDetails: `Roadside Assistance: ${job.serviceAddress}`,
              unitPriceCents: job.subtotalCents,
              quantity: 1,
            },
          ];

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          countryCode: job.countryCode,
          currency: job.currency,
          customerId: job.customerId,
          fleetId: job.fleetId,
          issueDate,
          dueDate,
          status: 'PENDING',
          subtotalCents: job.subtotalCents,
          taxAmountCents: job.taxAmountCents,
          totalCents: job.totalCents,
          createdById,
          paymentMethod: job.paymentMethod,
          notes: notes || `Generated from Job ${job.jobCode}`,
          items: {
            create: itemsData,
          },
        },
        include: {
          items: true,
          customer: true,
          fleet: true,
        },
      });

      // Link job to this invoice
      await prisma.job.update({
        where: { id: jobId },
        data: { invoiceId: invoice.id },
      });

      return sendSuccess(res, invoice, 'Invoice generated successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async createInvoice(req: Request, res: Response) {
    try {
      const {
        customerId,
        fleetId,
        countryCode,
        currency,
        dueDate: customDueDate,
        notes,
        paymentMethod,
        items,
      } = req.body;

      const creator = req.user as any;
      const createdById = creator?.id || (await prisma.user.findFirst())?.id;
      if (!createdById) return sendError(res, 'No creator user found', 400);

      const country = countryCode || 'CA';
      const curr = currency || (country === 'US' ? 'USD' : country === 'UK' ? 'GBP' : 'CAD');

      const initials = (creator?.fullName || 'Xtreme Admin')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) || 'XT';

      const count = await prisma.invoice.count({ where: { countryCode: country } });
      const seqDigits = String(count + 1).padStart(4, '0');
      const invoiceNumber = `${initials}-${country}-${seqDigits}`;

      const subtotalCents = items.reduce(
        (sum: number, it: any) => sum + it.unitPriceCents * (it.quantity || 1),
        0
      );
      const taxRate = country === 'CA' ? 0.13 : country === 'UK' ? 0.20 : 0.08;
      const taxAmountCents = Math.round(subtotalCents * taxRate);
      const totalCents = subtotalCents + taxAmountCents;

      const issueDate = new Date();
      const dueDate = customDueDate ? new Date(customDueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          countryCode: country,
          currency: curr,
          customerId,
          fleetId,
          issueDate,
          dueDate,
          status: 'PENDING',
          subtotalCents,
          taxAmountCents,
          totalCents,
          createdById,
          paymentMethod,
          notes,
          items: {
            create: items.map((it: any) => ({
              itemDetails: it.itemDetails,
              unitPriceCents: it.unitPriceCents,
              quantity: it.quantity || 1,
            })),
          },
        },
        include: {
          items: true,
          customer: true,
          fleet: true,
        },
      });

      return sendSuccess(res, invoice, 'Invoice created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  async updateInvoiceStatus(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { status, paymentMethod, paidAt } = req.body;

      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          status,
          ...(paymentMethod && { paymentMethod }),
          ...(status === 'PAID' && { paidAt: paidAt ? new Date(paidAt) : new Date() }),
        },
        include: {
          items: true,
        },
      });

      return sendSuccess(res, updated, 'Invoice status updated');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Layout payload conforming to verified KT Group Invoice Template (FR-5.6)
   */
  async getInvoicePdfData(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          items: true,
          customer: true,
          fleet: true,
          createdBy: true,
          jobs: {
            include: { vehicle: true },
          },
        },
      });

      if (!invoice) return sendError(res, 'Invoice not found', 404);

      const regionalHub = invoice.countryCode === 'US'
        ? {
            address: '11815 Medway Church Loop, Manassas, VA 20109',
            phone: '+1 (703) 555-0144',
            taxLabel: 'State & Local Sales Tax (8%)',
          }
        : invoice.countryCode === 'UK'
        ? {
            address: 'Independent UK Hub, London',
            phone: '+44 20 7946 0912',
            taxLabel: 'VAT (20%)',
          }
        : {
            address: '857 Winterton Way, Mississauga, ON L5V 1Z5',
            phone: '+1 (416) 555-0192',
            taxLabel: 'HST Ontario (13%)',
          };

      const pdfData = {
        company: {
          name: 'XTREME MOBILE TIRE & ROADSIDE ASSISTANCE',
          tagline: '24/7 Mobile Tire Service & Roadside Fleet Dispatch',
          paymentEmail: 'Payments@xtrememobiletire.com',
          hub: regionalHub,
        },
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate.toISOString().split('T')[0],
        dueDate: invoice.dueDate.toISOString().split('T')[0],
        currency: invoice.currency,
        status: invoice.status,
        billTo: invoice.fleet
          ? {
              name: invoice.fleet.name,
              contactPerson: invoice.fleet.contactPerson,
              phone: invoice.fleet.phone,
              email: invoice.fleet.email,
              address: invoice.fleet.address,
              fleetCode: invoice.fleet.fleetCode,
            }
          : {
              name: invoice.customer?.fullName || 'Retail Customer',
              phone: invoice.customer?.phone,
              email: invoice.customer?.email,
            },
        items: invoice.items.map((it) => ({
          details: it.itemDetails,
          quantity: it.quantity,
          unitPriceFormatted: formatCurrency(it.unitPriceCents, invoice.currency as any),
          totalFormatted: formatCurrency(it.unitPriceCents * it.quantity, invoice.currency as any),
        })),
        summary: {
          subtotal: formatCurrency(invoice.subtotalCents, invoice.currency as any),
          tax: formatCurrency(invoice.taxAmountCents, invoice.currency as any),
          grandTotal: formatCurrency(invoice.totalCents, invoice.currency as any),
          isPaid: invoice.status === 'PAID',
        },
      };

      return sendSuccess(res, pdfData);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },
};

export default invoiceController;
