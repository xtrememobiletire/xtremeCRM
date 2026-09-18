import { PrismaClient, Job, Prisma } from '@prisma/client';
import {
  calculateSkip,
  createPaginatedResponse,
  PaginatedResponse,
  sanitizePaginationParams,
} from '../utils/pagination.js';
import type { PaginationQuery } from '../schemas/job.schema.js';

/**
 * =====================================
 * JOB SERVICE
 * =====================================
 * Business logic for job operations
 * Handles database queries with Prisma
 */

export class JobService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all jobs with pagination, filtering, and sorting
   * @param query - Pagination and filter parameters
   * @param countryCode - Tenant country code (CA, US, UK)
   * @returns Paginated list of jobs
   */
  async getAllJobs(
    query: PaginationQuery,
    countryCode: string
  ): Promise<PaginatedResponse<Job>> {
    // Sanitize pagination params
    const { page, limit } = sanitizePaginationParams(query.page, query.limit);
    const skip = calculateSkip(page, limit);

    // Build dynamic where clause
    const where: Prisma.JobWhereInput = {
      countryCode, // Tenant scoping
    };

    // Add optional filters
    if (query.status) {
      where.status = query.status;
    }

    if (query.urgency) {
      where.urgency = query.urgency;
    }

    if (query.search) {
      // Search in service address or problem notes
      where.OR = [
        { serviceAddress: { contains: query.search, mode: 'insensitive' } },
        { problemNotes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Build sort order
    const orderBy: Prisma.JobOrderByWithRelationInput = {
      [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
    };

    // Execute queries in parallel for better performance
    const [jobs, totalCount] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              primaryPhone: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              year: true,
              make: true,
              model: true,
              tireSize: true,
            },
          },
          assignedDriver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    return createPaginatedResponse(jobs, page, limit, totalCount);
  }

  /**
   * Get a single job by ID
   * @param id - Job ID
   * @param countryCode - Tenant country code
   * @returns Job details or null
   */
  async getJobById(id: string, countryCode: string): Promise<Job | null> {
    return this.prisma.job.findFirst({
      where: {
        id,
        countryCode,
      },
      include: {
        customer: true,
        vehicle: true,
        assignedDriver: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Create a new job
   * @param data - Job creation data
   * @param userId - ID of user creating the job
   * @param countryCode - Tenant country code
   * @returns Created job
   */
  async createJob(
    data: Prisma.JobCreateInput,
    userId: string,
    countryCode: string
  ): Promise<Job> {
    return this.prisma.job.create({
      data: {
        ...data,
        countryCode,
        createdById: userId,
      },
      include: {
        customer: true,
        vehicle: true,
      },
    });
  }

  /**
   * Update job status
   * @param id - Job ID
   * @param status - New status
   * @param countryCode - Tenant country code
   * @returns Updated job
   */
  async updateJobStatus(
    id: string,
    status: string,
    countryCode: string
  ): Promise<Job | null> {
    return this.prisma.job.update({
      where: {
        id,
        countryCode,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Assign driver to job
   * @param jobId - Job ID
   * @param driverId - Driver ID
   * @param countryCode - Tenant country code
   * @returns Updated job
   */
  async assignDriver(
    jobId: string,
    driverId: string,
    countryCode: string
  ): Promise<Job | null> {
    return this.prisma.job.update({
      where: {
        id: jobId,
        countryCode,
      },
      data: {
        assignedDriverId: driverId,
        status: 'ASSIGNED',
        updatedAt: new Date(),
      },
      include: {
        assignedDriver: true,
      },
    });
  }

  /**
   * Delete a job (soft delete recommended)
   * @param id - Job ID
   * @param countryCode - Tenant country code
   * @returns Deleted job
   */
  async deleteJob(id: string, countryCode: string): Promise<Job> {
    return this.prisma.job.delete({
      where: {
        id,
        countryCode,
      },
    });
  }
}
