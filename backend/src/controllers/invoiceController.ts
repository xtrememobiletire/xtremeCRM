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
import { sseManager } from '../services/sseManager.js';
import { mailService } from '../services/mailService.js';
import { generateInvoicePdf } from '../utils/invoicePdfGenerator.js';

/**
 * Advance the country's sequence for the current local year using the supplied
 * transaction and return initials-country-sequence, padded to at least four digits.
 * The year scopes the counter but is not included in the returned number.
 * Database errors propagate to the caller.
 */
async function getNextInvoiceNumber(tx: any, countryCode: any, initials: string): Promise<string> {
  const year = new Date().getFullYear();
  let seqRecord;
  try {
    seqRecord = await tx.invoiceSequence.upsert({
      where: { countryCode_year: { countryCode, year } },
      update: { lastSeq: { increment: 1 } },
      create: { countryCode, year, lastSeq: 1 },
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      seqRecord = await tx.invoiceSequence.upsert({
        where: { countryCode_year: { countryCode, year } },
        update: { lastSeq: { increment: 1 } },
        create: { countryCode, year, lastSeq: 1 },
      });
    } else {
      throw err;
    }
  }
  const seqDigits = String(seqRecord.lastSeq).padStart(4, '0');
  return `${initials}-${countryCode}-${year}-${seqDigits}`;
}

/**
 * Calculate tax, total, and remaining balance in cents after a discount.
 * Tax applies to the subtotal minus discount, floored at zero; exemption overrides
 * the supplied percentage rate. Without a rate, use 13% for CA, 20% for UK,
 * and 8% otherwise. Round tax to the nearest cent, then subtract the deposit
 * from the total and floor the balance at zero.
 */
function calculateTaxAndTotals(
  subtotalCents: number,
  discountCents: number,
  depositCents: number,
  countryCode: string,
  taxRatePercent?: number,
  isTaxExempt?: boolean
) {
  const taxableAmount = Math.max(0, subtotalCents - discountCents);
  let taxRate = 0;
  if (!isTaxExempt) {
    if (taxRatePercent !== undefined && taxRatePercent !== null) {
      taxRate = taxRatePercent / 100;
    } else {
      taxRate = countryCode === 'CA' ? 0.13 : countryCode === 'UK' ? 0.20 : 0.08;
    }
  }
  const taxAmountCents = Math.round(taxableAmount * taxRate);
  const totalCents = taxableAmount + taxAmountCents;
  const balanceDueCents = Math.max(0, totalCents - depositCents);
  return { taxAmountCents, totalCents, balanceDueCents };
}

export const invoiceController = {
  /**
   * Return invoices newest first as { success, data, meta }, filtered by country,
   * status, invoice type, fleet, customer, or a case-insensitive number/name search.
   * MEMBER also requires a MEMBERSHIP customer. Country defaults to req.countryCode;
   * ALL omits the country filter. Pagination defaults to page 1 and 20 per page,
   * with the limit clamped to 1–100. Caught errors become HTTP 500 responses.
   */
  async getInvoices(req: Request, res: Response) {
    try {
      const pageParam = req.query.page ? Number(req.query.page) : 1;
      const limitParam = req.query.limit ? Number(req.query.limit) : 20;
      const { page, limit } = sanitizePaginationParams(pageParam, limitParam);
      const skip = calculateSkip(page, limit);

      const countryCode = (req.query.countryCode as any) || req.countryCode;
      const status = req.query.status as any;
      const invoiceType = req.query.invoiceType as any;
      const fleetId = req.query.fleetId as string;
      const customerId = req.query.customerId as string;
      const search = req.query.search as string;

      const where: any = {};
      if (countryCode && countryCode !== 'ALL') where.countryCode = countryCode;
      if (status === 'UNPAID_AND_PARTIAL') {
        where.status = { in: ['PENDING', 'PARTIAL', 'OVERDUE'] };
      } else if (status === 'UNPAID_ONLY') {
        where.status = { in: ['PENDING', 'OVERDUE'] };
        where.amountPaidCents = 0;
      } else if (status && status !== 'ALL') {
        where.status = status;
      }
      if (invoiceType) {
        if (invoiceType === 'FLEET') {
          where.OR = [
            { invoiceType: 'FLEET' },
            { fleetId: { not: null } },
          ];
        } else if (invoiceType === 'MEMBER') {
          where.OR = [
            { invoiceType: 'MEMBER' },
            { customer: { customerType: 'MEMBERSHIP' } },
          ];
        } else if (invoiceType === 'CUSTOMER') {
          where.OR = [
            { invoiceType: 'CUSTOMER' },
            {
              AND: [
                { customerId: { not: null } },
                { fleetId: null },
                { customer: { customerType: { not: 'MEMBERSHIP' } } },
              ],
            },
          ];
        } else {
          where.invoiceType = invoiceType;
        }
      }
      if (fleetId) {
        delete where.OR;
        where.fleetId = fleetId;
      }
      if (customerId) where.customerId = customerId;
      if (search) {
        where.OR = [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { customer: { fullName: { contains: search, mode: 'insensitive' } } },
          { fleet: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [invoices, totalCount, statusCountsRaw] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
            customer: true,
            fleet: true,
            payments: true,
            jobs: {
              select: {
                id: true,
                jobCode: true,
                status: true,
                serviceAddress: true,
              },
            },
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
        prisma.invoice.groupBy({
          by: ['status'],
          where: countryCode && countryCode !== 'ALL' ? { countryCode } : {},
          _count: true,
        }),
      ]);

      const statusCounts: Record<string, number> = {
        all: 0,
        pending: 0,
        partial: 0,
        paid: 0,
        overdue: 0,
        unpaidAndPartial: 0,
      };
      for (const sc of statusCountsRaw) {
        const cnt = sc._count;
        statusCounts.all += cnt;
        if (sc.status === 'PENDING') {
          statusCounts.pending += cnt;
          statusCounts.unpaidAndPartial += cnt;
        } else if (sc.status === 'PARTIAL') {
          statusCounts.partial += cnt;
          statusCounts.unpaidAndPartial += cnt;
        } else if (sc.status === 'OVERDUE') {
          statusCounts.overdue += cnt;
          statusCounts.unpaidAndPartial += cnt;
        } else if (sc.status === 'PAID') {
          statusCounts.paid += cnt;
        }
      }

      const paginated = createPaginatedResponse(invoices, page, limit, totalCount);
      (paginated.meta as any).statusCounts = statusCounts;
      return res.status(200).json(paginated);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  /**
   * Return an invoice with items, customer, fleet, creator, linked jobs, and
   * payments ordered newest first. Returns HTTP 404 when missing and 500 for
   * caught errors.
   */
  async getInvoiceById(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          items: true,
          customer: true,
          fleet: true,
          payments: {
            include: {
              recordedBy: {
                select: { id: true, fullName: true, email: true },
              },
            },
            orderBy: { recordedAt: 'desc' },
          },
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
   * Return a job's existing invoice, or create and link a PENDING invoice.
   * The job ID comes from the route or body; nonempty custom line items replace
   * job services. Prices, discounts, and deposits are in cents; creditDeposit
   * credits the job's upfront amount by default. A dueDate overrides paymentTerms;
   * otherwise terms select receipt, 7, 14, or 30 days, defaulting to 30 days for
   * fleets and receipt for other jobs. New invoices emit invoice:created and
   * return HTTP 201; existing invoices return 200. Missing jobs return 404,
   * and missing job/creator IDs or other caught errors return 400.
   */
  async generateInvoice(req: Request, res: Response) {
    try {
      const jobId = (req.params.jobId || req.body?.jobId) as string;
      if (!jobId) return sendError(res, 'Valid Job ID is required', 400);

      const {
        dueDate: customDueDate,
        notes,
        taxRatePercent,
        isTaxExempt,
        creditDeposit = true,
        paymentTerms,
        discountCents = 0,
        lineItems: customLineItems,
      } = req.body || {};

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
          invoice: {
            include: {
              items: true,
              customer: true,
              fleet: true,
            },
          },
        },
      });

      if (!job) return sendError(res, 'Job not found', 404);

      // Determine invoice type: FLEET vs MEMBER vs CUSTOMER
      let invoiceType: any = 'CUSTOMER';
      if (job.fleetId) {
        invoiceType = 'FLEET';
      } else if (job.customer?.customerType === 'MEMBERSHIP') {
        invoiceType = 'MEMBER';
      }

      // Build line items from customLineItems if provided, else from job service items
      let itemsData: { itemDetails: string; unitPriceCents: number; quantity: number }[] = [];
      if (Array.isArray(customLineItems) && customLineItems.length > 0) {
        itemsData = customLineItems.map((item: any) => ({
          itemDetails: String(item.itemDetails || item.description || 'Roadside Assistance Service'),
          unitPriceCents: Math.max(0, Math.round(Number(item.unitPriceCents || 0))),
          quantity: Math.max(1, Math.round(Number(item.quantity || 1))),
        }));
      } else if (job.serviceItems.length > 0) {
        itemsData = job.serviceItems.map((item) => {
          const vehDesc = job.vehicle
            ? `${job.vehicle.unitNumber ? `[Unit ${job.vehicle.unitNumber}] ` : ''}${job.vehicle.year || ''} ${job.vehicle.make || ''} ${job.vehicle.model || ''}`.trim()
            : 'Standard Vehicle';
          const notesDesc = item.notes ? ` • ${item.notes}` : '';
          return {
            itemDetails: `${item.serviceName} (${vehDesc})${notesDesc}`,
            unitPriceCents: item.unitPriceCents,
            quantity: item.quantity,
          };
        });
      } else {
        itemsData = [
          {
            itemDetails: `Roadside Assistance: ${job.serviceAddress}`,
            unitPriceCents: job.subtotalCents,
            quantity: 1,
          },
        ];
      }

      const subtotalCents = itemsData.reduce((sum, it) => sum + it.unitPriceCents * it.quantity, 0);
      let discountAmountCents = Math.max(0, Math.round(Number(discountCents || 0)));
      if (!discountAmountCents) {
        if (job.fleet?.discountPercent && job.fleet.discountPercent > 0) {
          discountAmountCents = Math.round(subtotalCents * (job.fleet.discountPercent / 100));
        } else if (job.customer?.customerType === 'MEMBERSHIP') {
          discountAmountCents = Math.round(subtotalCents * 0.10);
        } else if (job.subtotalCents > 0 && (job.subtotalCents + job.taxAmountCents) > job.totalCents) {
          discountAmountCents = (job.subtotalCents + job.taxAmountCents) - job.totalCents;
        }
      }
      const depositCents = creditDeposit ? (job.upfrontAmountCents || 0) : 0;

      const { taxAmountCents, totalCents, balanceDueCents } = calculateTaxAndTotals(
        subtotalCents,
        discountAmountCents,
        depositCents,
        job.countryCode,
        taxRatePercent,
        isTaxExempt
      );

      // Check existing invoice for job
      const existingInv = job.invoice || (job.invoiceId ? await prisma.invoice.findUnique({
        where: { id: job.invoiceId },
        include: {
          items: true,
          customer: true,
          fleet: true,
        },
      }) : null);

      if (existingInv) {
        if (req.body.updateExisting) {
          if (existingInv.status === 'PAID') {
            return sendError(res, 'Cannot re-sync a settled PAID invoice', 400);
          }

          const reSynced = await prisma.$transaction(async (tx) => {
            // Delete old items and insert fresh items
            await tx.invoiceItem.deleteMany({ where: { invoiceId: existingInv.id } });
            await tx.invoiceItem.createMany({
              data: itemsData.map((it) => ({
                invoiceId: existingInv.id,
                itemDetails: it.itemDetails,
                unitPriceCents: it.unitPriceCents,
                quantity: it.quantity,
              })),
            });

            const newBalanceDue = Math.max(0, totalCents - depositCents - existingInv.amountPaidCents);
            const newStatus = newBalanceDue === 0 ? 'PAID' : (existingInv.amountPaidCents > 0 || depositCents > 0 ? 'PARTIAL' : 'PENDING');

            return await tx.invoice.update({
              where: { id: existingInv.id },
              data: {
                subtotalCents,
                taxRatePercent: taxRatePercent !== undefined ? Number(taxRatePercent) : existingInv.taxRatePercent,
                isTaxExempt: isTaxExempt !== undefined ? Boolean(isTaxExempt) : existingInv.isTaxExempt,
                taxAmountCents,
                depositCents,
                discountCents: discountAmountCents,
                totalCents,
                balanceDueCents: newBalanceDue,
                status: newStatus,
                notes: notes || existingInv.notes,
                dueDate: customDueDate ? new Date(customDueDate) : existingInv.dueDate,
                ...(newStatus === 'PAID' && !existingInv.paidAt ? { paidAt: new Date() } : {}),
              },
              include: {
                items: true,
                customer: true,
                fleet: true,
              },
            });
          });

          sseManager.broadcast(`sse:dispatch:${reSynced.countryCode}`, 'invoice:updated', reSynced);
          return sendSuccess(res, reSynced, 'Invoice re-synced successfully from latest job changes', 200);
        }

        return sendSuccess(res, existingInv, 'Invoice already exists for this job');
      }

      // Creator initials
      const initials = (creator?.fullName || 'Xtreme Admin')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) || 'XT';

      const issueDate = new Date();
      let dueDate: Date;
      if (customDueDate) {
        dueDate = new Date(customDueDate);
      } else if (paymentTerms === 'DUE_ON_RECEIPT') {
        dueDate = new Date(issueDate);
      } else if (paymentTerms === 'NET_7') {
        dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else if (paymentTerms === 'NET_14') {
        dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      } else if (paymentTerms === 'NET_30') {
        dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      } else {
        dueDate = job.fleetId
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : new Date(issueDate);
      }

      const invoice = await prisma.$transaction(async (tx) => {
        const invoiceNumber = await getNextInvoiceNumber(tx, job.countryCode, initials);

        const inv = await tx.invoice.create({
          data: {
            invoiceNumber,
            invoiceType,
            countryCode: job.countryCode,
            currency: job.currency,
            customerId: job.customerId,
            fleetId: job.fleetId,
            issueDate,
            dueDate,
            status: 'PENDING',
            subtotalCents,
            taxRatePercent: taxRatePercent !== undefined ? Number(taxRatePercent) : null,
            isTaxExempt: Boolean(isTaxExempt),
            taxAmountCents,
            depositCents,
            discountCents: discountAmountCents,
            totalCents,
            amountPaidCents: 0,
            balanceDueCents,
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

        // Atomically claim job to this invoice
        const claimed = await tx.job.updateMany({
          where: { id: jobId, invoiceId: null },
          data: { invoiceId: inv.id },
        });
        if (claimed.count === 0) {
          throw new Error('Job has already been invoiced or is currently being invoiced');
        }

        return inv;
      });

      sseManager.broadcast(`sse:dispatch:${invoice.countryCode}`, 'invoice:created', invoice);

      return sendSuccess(res, invoice, 'Invoice generated successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Create a PENDING fleet invoice from the selected completed, unbilled jobs.
   * Selected IDs outside the fleet or already billed/incomplete jobs are ignored.
   * Apply the fleet's percentage discount and optional tax settings, with no
   * deposit credit; default the due date to 30 days from now. Link included jobs
   * and emit invoice:created, returning HTTP 201. A missing fleet returns 404;
   * no eligible jobs, no creator, or other caught errors return 400.
   */
  async generateFleetConsolidatedInvoice(req: Request, res: Response) {
    try {
      const { fleetId, jobIds, dueDate: customDueDate, notes, taxRatePercent, isTaxExempt, includeActiveJobs } = req.body;
      const creator = req.user as any;
      const createdById = creator?.id || (await prisma.user.findFirst())?.id;
      if (!createdById) return sendError(res, 'No creator user found', 400);

      const fleet = await prisma.fleet.findUnique({
        where: { id: fleetId },
      });
      if (!fleet) return sendError(res, 'Fleet not found', 404);

      const jobs = await prisma.job.findMany({
        where: {
          id: { in: jobIds },
          fleetId,
          isTestService: false,
          invoiceId: null,
          status: includeActiveJobs ? { not: 'CANCELLED' } : 'COMPLETED',
        },
        include: {
          serviceItems: true,
          vehicle: true,
        },
      });

      if (jobs.length === 0) {
        return sendError(res, 'No eligible unbilled jobs found for the selected IDs', 400);
      }

      const countryCode = fleet.countryCode;
      const currency = countryCode === 'US' ? 'USD' : countryCode === 'UK' ? 'GBP' : 'CAD';

      const initials = (creator?.fullName || 'Xtreme Admin')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) || 'XT';

      // Build consolidated line items from all selected jobs
      const itemsData = jobs.flatMap((j) => {
        const vehiclePlate = j.vehicle?.licensePlate || 'Fleet Unit';
        if (j.serviceItems.length > 0) {
          return j.serviceItems.map((si) => ({
            itemDetails: `[${j.jobCode}] ${vehiclePlate}: ${si.serviceName}`,
            unitPriceCents: si.unitPriceCents,
            quantity: si.quantity,
          }));
        }
        return [
          {
            itemDetails: `[${j.jobCode}] ${vehiclePlate}: Roadside Service at ${j.serviceAddress}`,
            unitPriceCents: j.subtotalCents,
            quantity: 1,
          },
        ];
      });

      const subtotalCents = itemsData.reduce((sum, it) => sum + it.unitPriceCents * it.quantity, 0);
      // Avoid double-discounting if B2B discount was already baked into JobServiceItem.unitPriceCents at booking time
      const explicitDiscountCents = req.body.discountCents !== undefined
        ? Math.max(0, Math.round(Number(req.body.discountCents)))
        : 0;
      const discountCents = explicitDiscountCents;
      const depositCents = 0;

      const { taxAmountCents, totalCents, balanceDueCents } = calculateTaxAndTotals(
        subtotalCents,
        discountCents,
        depositCents,
        countryCode,
        taxRatePercent,
        isTaxExempt
      );

      const issueDate = new Date();
      const dueDate = customDueDate ? new Date(customDueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const invoice = await prisma.$transaction(async (tx) => {
        const invoiceNumber = await getNextInvoiceNumber(tx, countryCode, initials);

        const inv = await tx.invoice.create({
          data: {
            invoiceNumber,
            invoiceType: 'FLEET',
            countryCode,
            currency,
            fleetId,
            issueDate,
            dueDate,
            status: 'PENDING',
            subtotalCents,
            taxRatePercent: taxRatePercent !== undefined ? Number(taxRatePercent) : null,
            isTaxExempt: Boolean(isTaxExempt),
            taxAmountCents,
            depositCents,
            discountCents,
            totalCents,
            amountPaidCents: 0,
            balanceDueCents,
            createdById,
            notes: notes || `Consolidated statement for ${jobs.length} completed work orders`,
            items: {
              create: itemsData,
            },
          },
          include: {
            items: true,
            fleet: true,
          },
        });

        // Atomically link all unbilled jobs to this consolidated invoice
        const claimed = await tx.job.updateMany({
          where: { id: { in: jobs.map((j) => j.id) }, invoiceId: null },
          data: { invoiceId: inv.id },
        });
        if (claimed.count !== jobs.length) {
          throw new Error('One or more selected jobs have already been invoiced');
        }

        return inv;
      });

      sseManager.broadcast(`sse:dispatch:${invoice.countryCode}`, 'invoice:created', invoice);

      return sendSuccess(res, invoice, `Consolidated invoice created for ${jobs.length} jobs`, 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Create a PENDING invoice from manual line items without linking jobs.
   * Unit prices, discounts, and deposits are in cents; taxRatePercent is a
   * percentage and isTaxExempt overrides it. The controller defaults to CUSTOM,
   * CA, and a due date 30 days from now, emitting invoice:created on success.
   * Returns HTTP 201 with items and account details, or 400 for a missing creator
   * or other caught errors.
   */
  async createInvoice(req: Request, res: Response) {
    try {
      const {
        customerId,
        fleetId,
        jobIds,
        invoiceType = 'CUSTOM',
        countryCode,
        currency,
        dueDate: customDueDate,
        notes,
        paymentMethod,
        taxRatePercent,
        isTaxExempt,
        depositCents = 0,
        discountCents = 0,
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

      const subtotalCents = items.reduce(
        (sum: number, it: any) => sum + it.unitPriceCents * (it.quantity || 1),
        0
      );

      const { taxAmountCents, totalCents, balanceDueCents } = calculateTaxAndTotals(
        subtotalCents,
        Number(discountCents) || 0,
        Number(depositCents) || 0,
        country,
        taxRatePercent,
        isTaxExempt
      );

      const issueDate = new Date();
      const dueDate = customDueDate ? new Date(customDueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const invoice = await prisma.$transaction(async (tx) => {
        const invoiceNumber = await getNextInvoiceNumber(tx, country, initials);

        const inv = await tx.invoice.create({
          data: {
            invoiceNumber,
            invoiceType,
            countryCode: country,
            currency: curr,
            customerId,
            fleetId,
            issueDate,
            dueDate,
            status: 'PENDING',
            subtotalCents,
            taxRatePercent: taxRatePercent !== undefined ? Number(taxRatePercent) : null,
            isTaxExempt: Boolean(isTaxExempt),
            taxAmountCents,
            depositCents: Number(depositCents) || 0,
            discountCents: Number(discountCents) || 0,
            totalCents,
            amountPaidCents: 0,
            balanceDueCents,
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

        if (Array.isArray(jobIds) && jobIds.length > 0) {
          await tx.job.updateMany({
            where: { id: { in: jobIds }, invoiceId: null },
            data: { invoiceId: inv.id },
          });
        }

        return inv;
      });

      sseManager.broadcast(`sse:dispatch:${invoice.countryCode}`, 'invoice:created', invoice);
      if (Array.isArray(jobIds) && jobIds.length > 0) {
        sseManager.broadcast(`sse:dispatch:${invoice.countryCode}`, 'job:status_updated', { invoiceId: invoice.id, jobIds });
      }

      return sendSuccess(res, invoice, 'Invoice created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Record amountCents against an invoice and recalculate its balance after deposits.
   * A zero balance marks the invoice PAID and linked jobs VERIFIED_PAID; a positive
   * paid amount with balance remaining marks both PARTIAL. Emit invoice:updated
   * and return { pmt, updatedInvoice }. Returns HTTP 404 for a missing invoice
   * and 400 for caught errors.
   */
  async recordPayment(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { amountCents, paymentMethod, referenceId, notes } = req.body;
      const user = req.user as any;
      const amount = Number(amountCents);

      if (amount <= 0) {
        return sendError(res, 'Payment amount must be greater than zero', 400);
      }

      const payment = await prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.findUnique({
          where: { id },
        });
        if (!invoice) throw new Error('Invoice not found');

        if (['PAID', 'CANCELLED', 'DRAFT'].includes(invoice.status)) {
          throw new Error(`Cannot record payment on an invoice with status ${invoice.status}`);
        }

        if (invoice.balanceDueCents > 0 && amount > invoice.balanceDueCents) {
          throw new Error(`Payment amount (${amount / 100}) exceeds outstanding balance (${invoice.balanceDueCents / 100})`);
        }

        const pmt = await tx.invoicePayment.create({
          data: {
            invoiceId: id,
            amountCents: amount,
            paymentMethod,
            referenceId,
            notes,
            recordedById: user?.id,
          },
        });

        const newAmountPaid = invoice.amountPaidCents + amount;
        const newBalanceDue = Math.max(0, invoice.totalCents - invoice.depositCents - newAmountPaid);
        const isFullyPaid = newBalanceDue === 0;
        const isPartiallyPaid = newBalanceDue > 0 && newAmountPaid > 0;
        const newStatus = isFullyPaid ? 'PAID' : isPartiallyPaid ? 'PARTIAL' : invoice.status;

        const updatedInvoice = await tx.invoice.update({
          where: { id },
          data: {
            amountPaidCents: newAmountPaid,
            balanceDueCents: newBalanceDue,
            status: newStatus,
            ...(isFullyPaid && {
              paidAt: new Date(),
              paymentMethod: paymentMethod || invoice.paymentMethod,
            }),
          },
        });

        // Two-way sync: Update linked jobs payment status
        if (isFullyPaid) {
          await tx.job.updateMany({
            where: { invoiceId: id },
            data: { paymentStatus: 'VERIFIED_PAID' },
          });
        } else if (isPartiallyPaid) {
          await tx.job.updateMany({
            where: { invoiceId: id },
            data: { paymentStatus: 'PARTIAL' },
          });
        }

        return { pmt, updatedInvoice };
      });

      sseManager.broadcast(`sse:dispatch:${payment.updatedInvoice.countryCode}`, 'invoice:updated', payment.updatedInvoice);

      return sendSuccess(res, payment, 'Payment recorded successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Allocate amountCents across a fleet's PENDING, PARTIAL, and OVERDUE invoices
   * by earliest due date, stopping when funds run out. Record each allocation and
   * synchronize linked jobs to VERIFIED_PAID or PARTIAL. Excess funds remain
   * unallocated; return { settledCount, allocatedCents }, with amounts in cents.
   * Returns HTTP 400 when no eligible invoices exist or an error is caught.
   */
  async recordFleetLumpSumPayment(req: Request, res: Response) {
    try {
      const { fleetId, amountCents, paymentMethod, referenceId, notes } = req.body;
      const user = req.user as any;
      let remainingFunds = Number(amountCents);

      if (remainingFunds <= 0) {
        return sendError(res, 'Payment amount must be greater than zero', 400);
      }

      const settledInvoiceIds: string[] = [];
      const partialInvoiceIds: string[] = [];

      await prisma.$transaction(async (tx) => {
        const pendingInvoices = await tx.invoice.findMany({
          where: {
            fleetId,
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
            balanceDueCents: { gt: 0 },
          },
          orderBy: { dueDate: 'asc' }, // Oldest first (FIFO)
        });

        if (pendingInvoices.length === 0) {
          throw new Error('No outstanding invoices found for this fleet');
        }

        for (const inv of pendingInvoices) {
          if (remainingFunds <= 0) break;

          const due = inv.balanceDueCents;
          if (due <= 0) continue;
          const payThis = Math.min(remainingFunds, due);

          await tx.invoicePayment.create({
            data: {
              invoiceId: inv.id,
              amountCents: payThis,
              paymentMethod,
              referenceId,
              notes: notes ? `${notes} (Fleet Lump-Sum allocation)` : 'Fleet Lump-Sum allocation',
              recordedById: user?.id,
            },
          });

          const newAmountPaid = inv.amountPaidCents + payThis;
          const newBalanceDue = inv.totalCents - inv.depositCents - newAmountPaid;
          const isFullyPaid = newBalanceDue <= 0;
          const isPartiallyPaid = newBalanceDue > 0 && newAmountPaid > 0;
          const newStatus = isFullyPaid ? 'PAID' : isPartiallyPaid ? 'PARTIAL' : inv.status;

          await tx.invoice.update({
            where: { id: inv.id },
            data: {
              amountPaidCents: newAmountPaid,
              balanceDueCents: Math.max(0, newBalanceDue),
              status: newStatus,
              ...(isFullyPaid && {
                paidAt: new Date(),
                paymentMethod: paymentMethod || inv.paymentMethod,
              }),
            },
          });

          if (isFullyPaid) {
            settledInvoiceIds.push(inv.id);
          } else if (isPartiallyPaid) {
            partialInvoiceIds.push(inv.id);
          }

          remainingFunds -= payThis;
        }

        // Two-way sync: update all linked jobs
        if (settledInvoiceIds.length > 0) {
          await tx.job.updateMany({
            where: { invoiceId: { in: settledInvoiceIds } },
            data: { paymentStatus: 'VERIFIED_PAID' },
          });
        }
        if (partialInvoiceIds.length > 0) {
          await tx.job.updateMany({
            where: { invoiceId: { in: partialInvoiceIds } },
            data: { paymentStatus: 'PARTIAL' },
          });
        }
      });

      return sendSuccess(res, { settledCount: settledInvoiceIds.length, allocatedCents: Number(amountCents) - remainingFunds }, 'Lump-sum payment applied successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Set an invoice's status and optional payment method, returning it with items.
   * PAID sets paidAt (now unless supplied), clears the balance, and marks linked
   * jobs VERIFIED_PAID without creating a payment record. Emit invoice:updated;
   * caught errors, including missing invoice updates, become HTTP 400 responses.
   */
  async updateInvoiceStatus(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { status, paymentMethod, paidAt } = req.body;

      const existing = await prisma.invoice.findUnique({ where: { id } });
      if (!existing) return sendError(res, 'Invoice not found', 404);
      const fullNetPayable = Math.max(0, existing.totalCents - (existing.depositCents || 0));

      const updated = await prisma.$transaction(async (tx) => {
        const inv = await tx.invoice.update({
          where: { id },
          data: {
            status,
            ...(paymentMethod && { paymentMethod }),
            ...(status === 'PAID' && {
              paidAt: paidAt ? new Date(paidAt) : new Date(),
              balanceDueCents: 0,
              amountPaidCents: fullNetPayable,
            }),
          },
          include: {
            items: true,
          },
        });

        // Two-way sync: If invoice marked PAID, mark linked jobs VERIFIED_PAID
        if (status === 'PAID') {
          await tx.job.updateMany({
            where: { invoiceId: id },
            data: { paymentStatus: 'VERIFIED_PAID' },
          });
        }

        return inv;
      });

      sseManager.broadcast(`sse:dispatch:${updated.countryCode}`, 'invoice:updated', updated);

      return sendSuccess(res, updated, 'Invoice status updated');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  },

  /**
   * Return the KT Group invoice template payload (FR-5.6) as JSON, with regional
   * hub details, YYYY-MM-DD dates, billing contact, and formatted item/totals values.
   * Returns HTTP 404 for a missing invoice and 500 for caught errors.
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

      const authUser = (req as any).user;
      if (authUser?.role === 'FLEET_MANAGER') {
        let fleet = await prisma.fleet.findFirst({
          where: {
            OR: [
              ...(authUser.id ? [{ managerUserId: authUser.id }] : []),
              ...(authUser.email ? [{ email: { equals: String(authUser.email), mode: 'insensitive' as const } }] : []),
            ],
          },
        });
        if (!fleet) {
          fleet = await prisma.fleet.findFirst({ orderBy: { createdAt: 'asc' } });
        }
        if (!fleet || invoice.fleetId !== fleet.id) {
          return sendError(res, 'Forbidden: Invoice does not belong to your fleet account', 403);
        }
      } else if (authUser?.role === 'CUSTOMER_MEMBER') {
        let customer = await prisma.customer.findUnique({ where: { userId: authUser.id } });
        if (!customer && authUser.email) {
          customer = await prisma.customer.findFirst({
            where: { email: { equals: String(authUser.email), mode: 'insensitive' as const } },
          });
        }
        const isOwner =
          customer &&
          (invoice.customerId === customer.id ||
            invoice.jobs?.some((j: any) => j.customerId === customer.id));
        if (!customer || !isOwner) {
          return sendError(res, 'Forbidden: Invoice does not belong to your member account', 403);
        }
      }

      const regionalHub = invoice.countryCode === 'US'
        ? {
            address: '11815 Medway Church Loop, Manassas, VA 20109',
            phone: '+1 (703) 555-0144',
            taxLabel: invoice.taxRatePercent !== null ? `Sales Tax (${invoice.taxRatePercent}%)` : 'State & Local Sales Tax (8%)',
          }
        : invoice.countryCode === 'UK'
        ? {
            address: 'Independent UK Hub, London',
            phone: '+44 20 7946 0912',
            taxLabel: invoice.taxRatePercent !== null ? `VAT (${invoice.taxRatePercent}%)` : 'VAT (20%)',
          }
        : {
            address: '857 Winterton Way, Mississauga, ON L5V 1Z5',
            phone: '+1 (416) 555-0192',
            taxLabel: invoice.taxRatePercent !== null ? `HST (${invoice.taxRatePercent}%)` : 'HST Ontario (13%)',
          };

      const pdfData = {
        company: {
          name: 'XTREME MOBILE TIRE & ROADSIDE ASSISTANCE',
          tagline: '24/7 Mobile Tire Service & Roadside Fleet Dispatch',
          paymentEmail: 'Payments@xtrememobiletire.com',
          hub: regionalHub,
        },
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: invoice.invoiceType,
        issueDate: invoice.issueDate.toISOString().split('T')[0],
        dueDate: invoice.dueDate.toISOString().split('T')[0],
        currency: invoice.currency,
        status: invoice.status,
        countryCode: invoice.countryCode,
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
              address: invoice.customer?.address || invoice.jobs?.[0]?.serviceAddress || '',
            },
        items: invoice.items.map((it) => ({
          details: it.itemDetails,
          quantity: it.quantity,
          unitPriceFormatted: formatCurrency(it.unitPriceCents, invoice.currency as any),
          totalFormatted: formatCurrency(it.unitPriceCents * it.quantity, invoice.currency as any),
        })),
        summary: {
          subtotal: formatCurrency(invoice.subtotalCents, invoice.currency as any),
          discount: invoice.discountCents > 0 ? formatCurrency(invoice.discountCents, invoice.currency as any) : null,
          depositCredited: invoice.depositCents > 0 ? formatCurrency(invoice.depositCents, invoice.currency as any) : null,
          tax: formatCurrency(invoice.taxAmountCents, invoice.currency as any),
          taxRateFormatted: invoice.isTaxExempt ? 'Tax Exempt (0%)' : `${invoice.taxRatePercent ?? (invoice.countryCode === 'CA' ? 13 : invoice.countryCode === 'UK' ? 20 : 8)}%`,
          grandTotal: formatCurrency(invoice.totalCents, invoice.currency as any),
          amountPaid: formatCurrency(invoice.amountPaidCents, invoice.currency as any),
          balanceDue: formatCurrency(invoice.balanceDueCents, invoice.currency as any),
          isPaid: invoice.status === 'PAID',
        },
      };

      return sendSuccess(res, pdfData);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  },

  async sendInvoiceEmail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { recipientEmail, clientName, clientAddress, clientPhone } = req.body;

      const invoice = await prisma.invoice.findUnique({
        where: { id: String(id) },
        include: {
          items: true,
          fleet: true,
          customer: true,
          jobs: true,
        },
      });

      if (!invoice) return sendError(res, 'Invoice not found', 404);

      const targetEmail =
        recipientEmail?.trim() ||
        invoice.fleet?.email?.trim() ||
        invoice.customer?.email?.trim();

      if (!targetEmail) {
        return sendError(res, 'No recipient email found for this invoice. Please enter a valid client email.', 400);
      }

      const regionalHub = invoice.countryCode === 'US'
        ? {
            address: '11815 Medway Church Loop, Manassas, VA 20109',
            phone: '+1 (703) 555-0144',
            taxLabel: invoice.taxRatePercent !== null ? `Sales Tax (${invoice.taxRatePercent}%)` : 'State & Local Sales Tax (8%)',
          }
        : invoice.countryCode === 'UK'
        ? {
            address: 'Independent UK Hub, London',
            phone: '+44 20 7946 0912',
            taxLabel: invoice.taxRatePercent !== null ? `VAT (${invoice.taxRatePercent}%)` : 'VAT (20%)',
          }
        : {
            address: '857 Winterton Way, Mississauga, ON L5V 1Z5',
            phone: '+1 (416) 555-0192',
            taxLabel: invoice.taxRatePercent !== null ? `HST (${invoice.taxRatePercent}%)` : 'HST Ontario (13%)',
          };

      const pdfData = {
        company: {
          name: 'XTREME MOBILE TIRE & ROADSIDE ASSISTANCE',
          tagline: '24/7 Mobile Tire Service & Roadside Fleet Dispatch',
          paymentEmail: 'Payments@xtrememobiletire.com',
          hub: regionalHub,
        },
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: invoice.invoiceType,
        issueDate: invoice.issueDate.toISOString().split('T')[0],
        dueDate: invoice.dueDate.toISOString().split('T')[0],
        currency: invoice.currency,
        status: invoice.status,
        countryCode: invoice.countryCode,
        billTo: {
          name: clientName || invoice.fleet?.name || invoice.customer?.fullName || 'Valued Client',
          contactPerson: invoice.fleet?.contactPerson,
          phone: clientPhone || invoice.fleet?.phone || invoice.customer?.phone,
          email: targetEmail,
          address: clientAddress || invoice.fleet?.address || invoice.customer?.address || invoice.jobs?.[0]?.serviceAddress || '',
          fleetCode: invoice.fleet?.fleetCode,
        },
        items: invoice.items.map((it) => ({
          details: it.itemDetails,
          quantity: it.quantity,
          unitPriceFormatted: formatCurrency(it.unitPriceCents, invoice.currency as any),
          totalFormatted: formatCurrency(it.unitPriceCents * it.quantity, invoice.currency as any),
        })),
        summary: {
          subtotal: formatCurrency(invoice.subtotalCents, invoice.currency as any),
          discount: invoice.discountCents > 0 ? formatCurrency(invoice.discountCents, invoice.currency as any) : null,
          depositCredited: invoice.depositCents > 0 ? formatCurrency(invoice.depositCents, invoice.currency as any) : null,
          tax: formatCurrency(invoice.taxAmountCents, invoice.currency as any),
          taxRateFormatted: invoice.isTaxExempt ? 'Tax Exempt (0%)' : `${invoice.taxRatePercent ?? (invoice.countryCode === 'CA' ? 13 : invoice.countryCode === 'UK' ? 20 : 8)}%`,
          grandTotal: formatCurrency(invoice.totalCents, invoice.currency as any),
          amountPaid: formatCurrency(invoice.amountPaidCents, invoice.currency as any),
          balanceDue: formatCurrency(invoice.balanceDueCents, invoice.currency as any),
          isPaid: invoice.status === 'PAID',
        },
      };

      const pdfBuffer = await generateInvoicePdf(pdfData);

      await mailService.sendInvoiceEmail({
        to: targetEmail,
        clientName: pdfData.billTo.name,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: pdfData.issueDate,
        dueDate: pdfData.dueDate,
        currency: invoice.currency,
        balanceDue: pdfData.summary.balanceDue,
        pdfBuffer,
      });

      return sendSuccess(res, { recipientEmail: targetEmail }, `Invoice #${invoice.invoiceNumber} emailed successfully to ${targetEmail}`);
    } catch (err: any) {
      console.error('[sendInvoiceEmail Error]:', err);
      return sendError(res, `Failed to send invoice email: ${err.message}`, 500);
    }
  },
};

export default invoiceController;

