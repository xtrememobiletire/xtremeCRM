import { Request, Response } from 'express';
import { jobService } from '../services/jobService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const jobController = {
  async getJobs(req: Request, res: Response) {
    try {
      const countryCode = (req.countryCode as any) || 'CA';
      const jobs = await jobService.listJobs(countryCode);
      sendSuccess(res, jobs);
    } catch (err: any) {
      sendError(res, err.message);
    }
  },

  async getJobById(req: Request, res: Response) {
    try {
      const job = await jobService.getJobById(req.params.id);
      if (!job) return sendError(res, 'Job not found', 404);
      sendSuccess(res, job);
    } catch (err: any) {
      sendError(res, err.message);
    }
  },

  async createJob(req: Request, res: Response) {
    try {
      const createdById = (req.user as any)?.id;
      const job = await jobService.createJob(req.body, createdById);
      sendSuccess(res, job, 'Job created', 201);
    } catch (err: any) {
      sendError(res, err.message, 400);
    }
  },

  async updateJobStatus(req: Request, res: Response) {
    try {
      const { status, driverId, problemNotes } = req.body;
      const job = await jobService.updateJobStatus(req.params.id, status, driverId, problemNotes);
      sendSuccess(res, job, 'Job status updated');
    } catch (err: any) {
      sendError(res, err.message, 400);
    }
  },
};

export default jobController;
