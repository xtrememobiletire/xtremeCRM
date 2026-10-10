import { Router } from 'express';
import { jobController } from '../controllers/jobController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  PaginationQuerySchema,
  CreateJobSchema,
  UpdateJobStatusSchema,
  AssignDriverSchema,
  VerifyBookingAddressSchema,
  idParamSchema,
} from '../schemas/index.js';
import { tenantScope } from '../middleware/tenantScope.js';
import { upload } from '../config/multer.js';

const router = Router();

/**
 * @route   POST /api/jobs/public-booking
 * @desc    Public landing page self-service booking (no auth required)
 * @access  Public
 */
router.post('/public-booking', validateRequest({ body: CreateJobSchema }), jobController.createPublicBooking);

router.use(authenticate);
router.use(tenantScope);

/**
 * @route   POST /api/jobs/disposition
 * @desc    Record call disposition for unbooked calls
 * @access  Private
 */
router.post('/disposition', jobController.recordDisposition);

/**
 * @route   GET /api/jobs
 * @desc    Get paginated jobs with filters
 * @access  Private
 */
router.get(
  '/',
  validateRequest({ query: PaginationQuerySchema }),
  jobController.getAllJobs
);

/**
 * @route   GET /api/jobs/:id
 * @desc    Get single job by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateRequest({ params: idParamSchema }),
  jobController.getJobById
);

/**
 * @route   POST /api/jobs
 * @desc    Create a new job with 16-service catalog items
 * @access  Private
 */
router.post(
  '/',
  validateRequest({ body: CreateJobSchema }),
  jobController.createJob
);

/**
 * @route   PATCH /api/jobs/:id/status
 * @desc    Update job status lifecycle
 * @access  Private
 */
router.patch(
  '/:id/status',
  upload.single('receipt'),
  validateRequest({
    params: idParamSchema,
    body: UpdateJobStatusSchema,
  }),
  jobController.updateJobStatus
);

/**
 * @route   PATCH /api/jobs/:id/assign-driver
 * @desc    Assign driver to job
 * @access  Private
 */
router.patch(
  '/:id/assign-driver',
  validateRequest({
    params: idParamSchema,
    body: AssignDriverSchema,
  }),
  jobController.assignDriver
);

/**
 * @route   PATCH /api/jobs/:id/verify-booking
 * @desc    Verify website booking address with Mapbox geocoding & release to PENDING
 * @access  Private (Admin, General Manager, Dispatcher)
 */
router.patch(
  '/:id/verify-booking',
  validateRequest({
    params: idParamSchema,
    body: VerifyBookingAddressSchema,
  }),
  jobController.verifyBookingAddress
);

/**
 * @route   PATCH /api/jobs/:id/expenses
 * @desc    Accountant state job actual expenses
 * @access  Private (Admin / Accountant)
 */
router.patch(
  '/:id/expenses',
  validateRequest({ params: idParamSchema }),
  jobController.stateJobExpenses
);

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete a job
 * @access  Private
 */
router.delete(
  '/:id',
  validateRequest({ params: idParamSchema }),
  jobController.deleteJob
);

export default router;
