import { PrismaClient, Job, Prisma } from '@prisma/client';
import {
  calculateSkip,
  createPaginatedResponse,
  PaginatedResponse,
  sanitizePaginationParams,
} from '../utils/pagination.js';
import type { PaginationQuery } from '../schemas/job.schema.js';

export class JobService {
  constructor(private prisma: PrismaClient) {}

  private mapJob(job: any) {
    const customer = job.customer
      ? {
          id: job.customer.id,
          fullName: job.customer.fullName,
          firstName: job.customer.fullName?.split(' ')[0] || '',
          lastName: job.customer.fullName?.split(' ').slice(1).join(' ') || '',
          primaryPhone: job.customer.phone,
          phone: job.customer.phone,
        }
      : null;

    const vehicle = job.vehicle
      ? {
          id: job.vehicle.id,
          year: job.vehicle.year,
          make: job.vehicle.make,
          model: job.vehicle.model,
          tireSize: job.vehicle.tireSize,
          licensePlate: job.vehicle.licensePlate,
        }
      : null;

    const assignedDriver = job.driver
      ? {
          id: job.driver.id,
          fullName: job.driver.fullName,
          firstName: job.driver.fullName?.split(' ')[0] || '',
          lastName: job.driver.fullName?.split(' ').slice(1).join(' ') || '',
          phone: job.driver.phone,
        }
      : null;

    const services = job.serviceItems
      ? job.serviceItems.map((s: any) => s.serviceName)
      : [];

    return {
      id: job.id,
      jobCode: job.jobCode,
      serviceAddress: job.serviceAddress,
      status: job.status,
      urgency: job.urgency,
      totalCents: job.totalCents,
      quotedPriceCents: job.subtotalCents,
      taxCents: job.taxAmountCents,
      currency: job.currency,
      paymentMethod: job.paymentMethod,
      createdAt: job.createdAt,
      scheduledFor: job.appointmentDate,
      customer,
      vehicle,
      assignedDriver,
      driver: assignedDriver,
      services,
    };
  }

  async getAllJobs(
    query: PaginationQuery,
    countryCode: string = 'CA'
  ): Promise<PaginatedResponse<any>> {
    const { page, limit } = sanitizePaginationParams(query.page, query.limit);
    const skip = calculateSkip(page, limit);

    const where: any = {
      countryCode: (query.countryCode || countryCode) as any,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.urgency) {
      where.urgency = query.urgency;
    }

    if (query.search) {
      where.OR = [
        { serviceAddress: { contains: query.search, mode: 'insensitive' } },
        { problemNotes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: any = {};
    if (sortField === 'scheduledFor') {
      orderBy.appointmentDate = sortOrder;
    } else {
      orderBy[sortField] = sortOrder;
    }

    const [jobs, totalCount] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          customer: true,
          vehicle: true,
          driver: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          serviceItems: true,
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    const mapped = jobs.map((j) => this.mapJob(j));
    return createPaginatedResponse(mapped, page, limit, totalCount);
  }

  async getJobById(id: string, countryCode?: string): Promise<any | null> {
    const where: any = { id };
    if (countryCode) {
      where.countryCode = countryCode as any;
    }

    const job = await this.prisma.job.findFirst({
      where,
      include: {
        customer: true,
        vehicle: true,
        driver: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        serviceItems: true,
      },
    });

    return job ? this.mapJob(job) : null;
  }

  async createJob(
    data: any,
    userId?: string,
    countryCode: string = 'CA'
  ): Promise<any> {
    const jobCode = `JOB-${countryCode}-${Math.floor(10000 + Math.random() * 90000)}`;

    // Resolve creator ID: if none provided, find first available system user
    let creatorId = userId;
    if (!creatorId) {
      const defaultUser = await this.prisma.user.findFirst();
      creatorId = defaultUser?.id;
    }

    if (!creatorId) {
      throw new Error('No user found to assign job creation.');
    }

    const job = await this.prisma.job.create({
      data: {
        jobCode,
        countryCode: countryCode as any,
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        serviceAddress: data.serviceAddress,
        urgency: data.urgency || 'STANDARD',
        appointmentDate: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
        problemNotes: data.problemNotes,
        subtotalCents: data.quotedPriceCents || data.totalCents || 0,
        taxAmountCents: data.taxCents || 0,
        totalCents: data.totalCents || data.quotedPriceCents || 0,
        currency: data.currency || 'CAD',
        paymentMethod: data.paymentMethod,
        createdById: creatorId,
        status: 'PENDING',
        serviceItems: data.services?.length
          ? {
              create: data.services.map((s: string) => ({
                serviceName: s,
                unitPriceCents: Math.round((data.totalCents || 0) / data.services.length),
              })),
            }
          : undefined,
      },
      include: {
        customer: true,
        vehicle: true,
        driver: true,
        serviceItems: true,
      },
    });

    return this.mapJob(job);
  }

  async updateJobStatus(
    id: string,
    status: any,
    countryCode?: string
  ): Promise<any | null> {
    const existing = await this.prisma.job.findFirst({
      where: { id, ...(countryCode ? { countryCode: countryCode as any } : {}) },
    });
    if (!existing) return null;

    const data: any = {
      status,
      updatedAt: new Date(),
    };
    if (status === 'ARRIVED') data.arrivedAt = new Date();
    if (status === 'COMPLETED') data.completedAt = new Date();

    const updated = await this.prisma.job.update({
      where: { id },
      data,
      include: {
        customer: true,
        vehicle: true,
        driver: true,
        serviceItems: true,
      },
    });

    return this.mapJob(updated);
  }

  async assignDriver(
    jobId: string,
    driverId: string,
    countryCode?: string
  ): Promise<any | null> {
    const existing = await this.prisma.job.findFirst({
      where: { id: jobId, ...(countryCode ? { countryCode: countryCode as any } : {}) },
    });
    if (!existing) return null;

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        driverId,
        status: 'ASSIGNED',
        assignedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        customer: true,
        vehicle: true,
        driver: true,
        serviceItems: true,
      },
    });

    return this.mapJob(updated);
  }

  async deleteJob(id: string, countryCode?: string): Promise<any | null> {
    const existing = await this.prisma.job.findFirst({
      where: { id, ...(countryCode ? { countryCode: countryCode as any } : {}) },
    });
    if (!existing) return null;

    // Delete relation serviceItems first if not cascade
    await this.prisma.jobServiceItem.deleteMany({ where: { jobId: id } });

    const deleted = await this.prisma.job.delete({
      where: { id },
    });

    return this.mapJob(deleted);
  }
}
