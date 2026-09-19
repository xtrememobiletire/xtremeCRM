import { prisma } from '../config/database.js';

export const invoiceService = {
  async generateInvoice(jobId: string, createdById: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { customer: true, vehicle: true },
    });
    if (!job) throw new Error('Job not found');

    const invoiceNumber = `INV-${job.countryCode}-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const dueDate = new Date();
    dueDate.setDate(now.getDate() + 30);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        countryCode: job.countryCode,
        currency: job.currency,
        customerId: job.customerId,
        fleetId: job.fleetId,
        issueDate: now,
        dueDate,
        status: 'PENDING',
        subtotalCents: job.subtotalCents,
        taxAmountCents: job.taxAmountCents,
        totalCents: job.totalCents,
        createdById,
        items: {
          create: [
            {
              itemDetails: `Service for Vehicle (${job.vehicle ? `${job.vehicle.make} ${job.vehicle.model}` : 'N/A'})`,
              unitPriceCents: job.subtotalCents,
              quantity: 1,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });

    await prisma.job.update({
      where: { id: jobId },
      data: { invoiceId: invoice.id },
    });

    return invoice;
  },
};

export default invoiceService;
