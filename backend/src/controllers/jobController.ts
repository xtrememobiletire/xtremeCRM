import { Request, Response } from 'express';
import { JobService } from '../services/jobService.js';
import { prisma } from '../config/database.js';
import type { PaginationQuery, CreateJobInput, UpdateJobStatusInput, AssignDriverInput } from '../schemas/job.schema.js';

const jobService = new JobService(prisma);

export async function getAllJobs(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query as unknown as PaginationQuery;
    const countryCode = (req.user as any)?.countryCode || (req.query.countryCode as string) || 'CA';

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

export async function getJobById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const countryCode = (req.user as any)?.countryCode;

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

export async function createJob(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body as CreateJobInput;
    const userId = (req.user as any)?.id;
    const countryCode = (req.user as any)?.countryCode || data.countryCode || 'CA';

    const job = await jobService.createJob(data, userId, countryCode);

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

export async function updateJobStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body as UpdateJobStatusInput;
    const countryCode = (req.user as any)?.countryCode;

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

export async function assignDriver(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { driverId } = req.body as AssignDriverInput;
    const countryCode = (req.user as any)?.countryCode;

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

export async function deleteJob(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const countryCode = (req.user as any)?.countryCode;

    const job = await jobService.deleteJob(id, countryCode);

    if (!job) {
      res.status(404).json({
        success: false,
        message: 'Job not found',
      });
      return;
    }

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
