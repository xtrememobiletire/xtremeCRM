import { Request, Response } from 'express';
import { JobService } from '../services/jobService.js';
import { PrismaClient } from '@prisma/client';
import type { PaginationQuery, CreateJobInput, UpdateJobStatusInput, AssignDriverInput } from '../schemas/job.schema.js';

/**
 * =====================================
 * JOB CONTROLLER
 * =====================================
 * Handles HTTP requests and responses
 * Thin layer - delegates business logic to JobService
 */

const prisma = new PrismaClient();
const jobService = new JobService(prisma);

/**
 * GET /api/jobs
 * Get all jobs with pagination and filters
 */
export async function getAllJobs(req: Request, res: Response): Promise<void> {
  try {
    // Extract query params (already validated by middleware)
    const query = req.query as unknown as PaginationQuery;
    
    // Get country code from authenticated user or request
    const countryCode = (req.user as any)?.countryCode || 'CA';

    const result = await jobService.getAllJobs(query, countryCode);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/jobs/:id
 * Get a single job by ID
 */
export async function getJobById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const countryCode = (req.user as any)?.countryCode || 'CA';

    const job = await jobService.getJobById(id, countryCode);

    if (!job) {
      res.status(404).json({
        success: false,
        message: 'Job not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * POST /api/jobs
 * Create a new job
 */
export async function createJob(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body as CreateJobInput;
    const userId = (req.user as any)?.id;
    const countryCode = (req.user as any)?.countryCode || 'CA';

    // Transform data to match Prisma schema
    const jobData = {
      customer: { connect: { id: data.customerId } },
      vehicle: { connect: { id: data.vehicleId } },
      serviceAddress: data.serviceAddress,
      serviceLatitude: data.serviceLatitude,
      serviceLongitude: data.serviceLongitude,
      urgency: data.urgency,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
      services: data.services,
      problemNotes: data.problemNotes,
      quotedPriceCents: data.quotedPriceCents,
      taxCents: data.taxCents,
      totalCents: data.totalCents,
      currency: data.currency,
      paymentMethod: data.paymentMethod,
      status: 'PENDING' as const,
    };

    const job = await jobService.createJob(jobData, userId, countryCode);

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: job,
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * PATCH /api/jobs/:id/status
 * Update job status
 */
export async function updateJobStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body as UpdateJobStatusInput;
    const countryCode = (req.user as any)?.countryCode || 'CA';

    const job = await jobService.updateJobStatus(id, status, countryCode);

    if (!job) {
      res.status(404).json({
        success: false,
        message: 'Job not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Job status updated successfully',
      data: job,
    });
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * PATCH /api/jobs/:id/assign-driver
 * Assign a driver to a job
 */
export async function assignDriver(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { driverId } = req.body as AssignDriverInput;
    const countryCode = (req.user as any)?.countryCode || 'CA';

    const job = await jobService.assignDriver(id, driverId, countryCode);

    if (!job) {
      res.status(404).json({
        success: false,
        message: 'Job not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Driver assigned successfully',
      data: job,
    });
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign driver',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * DELETE /api/jobs/:id
 * Delete a job
 */
export async function deleteJob(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const countryCode = (req.user as any)?.countryCode || 'CA';

    const job = await jobService.deleteJob(id, countryCode);

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully',
      data: job,
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete job',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
