import { Router } from 'express';
import {
  getAllJobs,
  getJobById,
  createJob,
  updateJobStatus,
  assignDriver,
  deleteJob,
} from '../controllers/jobController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  PaginationQuerySchema,
  CreateJobSchema,
  UpdateJobStatusSchema,
  AssignDriverSchema,
} from '../schemas/job.schema.js';
import { z } from 'zod';

/**
 * =====================================
 * JOB ROUTES
 * =====================================
 * All endpoints for job management
 * Format: METHOD /api/jobs/...
 */

const router = Router();

// ID parameter validation schema
const IdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid job ID format' }),
});

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs with pagination and filters
 * @access  Private (Admin, Dispatcher, Accountant)
 * @query   page, limit, search, status, urgency, sortBy, sortOrder
 * 
 * @example
 * GET /api/jobs?page=1&limit=20&status=PENDING&urgency=URGENT&sortBy=createdAt&sortOrder=desc
 */
router.get(
  '/',
  validateRequest({ query: PaginationQuerySchema }),
  getAllJobs
);

/**
 * @route   GET /api/jobs/:id
 * @desc    Get a single job by ID
 * @access  Private
 * @params  id (UUID)
 * 
 * @example
 * GET /api/jobs/123e4567-e89b-12d3-a456-426614174000
 */
router.get(
  '/:id',
  validateRequest({ params: IdParamSchema }),
  getJobById
);

/**
 * @route   POST /api/jobs
 * @desc    Create a new job
 * @access  Private (Admin, Dispatcher)
 * @body    CreateJobInput
 * 
 * @example
 * POST /api/jobs
 * {
 *   "customerId": "123e4567...",
 *   "vehicleId": "123e4567...",
 *   "serviceAddress": "123 Main St, Toronto, ON",
 *   "urgency": "URGENT",
 *   "services": ["TIRE_REPAIR", "STEM_VALVE"],
 *   "quotedPriceCents": 16000,
 *   "totalCents": 18080,
 *   "currency": "CAD"
 * }
 */
router.post(
  '/',
  validateRequest({ body: CreateJobSchema }),
  createJob
);

/**
 * @route   PATCH /api/jobs/:id/status
 * @desc    Update job status
 * @access  Private (Admin, Dispatcher, Driver)
 * @params  id (UUID)
 * @body    { status: JobStatus }
 * 
 * @example
 * PATCH /api/jobs/123e4567.../status
 * { "status": "COMPLETED" }
 */
router.patch(
  '/:id/status',
  validateRequest({
    params: IdParamSchema,
    body: UpdateJobStatusSchema,
  }),
  updateJobStatus
);

/**
 * @route   PATCH /api/jobs/:id/assign-driver
 * @desc    Assign a driver to a job
 * @access  Private (Admin, Dispatcher)
 * @params  id (UUID)
 * @body    { driverId: string }
 * 
 * @example
 * PATCH /api/jobs/123e4567.../assign-driver
 * { "driverId": "789e4567..." }
 */
router.patch(
  '/:id/assign-driver',
  validateRequest({
    params: IdParamSchema,
    body: AssignDriverSchema,
  }),
  assignDriver
);

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete a job
 * @access  Private (Admin only)
 * @params  id (UUID)
 * 
 * @example
 * DELETE /api/jobs/123e4567-e89b-12d3-a456-426614174000
 */
router.delete(
  '/:id',
  validateRequest({ params: IdParamSchema }),
  deleteJob
);

export default router;
