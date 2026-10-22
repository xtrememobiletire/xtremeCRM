import { Router } from 'express';
import { leadController } from '../controllers/leadController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { memoryUpload } from '../config/multer.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createLeadSchema,
  updateLeadSchema,
  updateDispositionSchema,
  trialServiceSchema,
  convertFleetSchema,
  reviveBatchSchema,
  createBatchSchema,
  assignBatchSchema,
} from '../schemas/lead.schema.js';

const router = Router();

// 1. Authenticate all requests to /api/leads/*
router.use(authenticate);

// 2. Strict Role-Based Barrier: Block ACCOUNTANT, DRIVER, FLEET_MANAGER, CUSTOMER_MEMBER from entire leads module
router.use(
  authorize([
    'ADMIN',
    'GENERAL_MANAGER',
    'DEVELOPER',
    'LEAD_MANAGER',
    'DISPATCHER',
    'CALL_AGENT',
    'VIRTUAL_ASSISTANT',
  ])
);

// Role groupings for granular route security
const MANAGEMENT_ROLES = ['ADMIN', 'GENERAL_MANAGER', 'DEVELOPER', 'LEAD_MANAGER'];
const DISPATCHER_OR_MGMT = ['ADMIN', 'GENERAL_MANAGER', 'DEVELOPER', 'LEAD_MANAGER', 'DISPATCHER'];
const VA_OPERATIONAL_ROLES = [
  'ADMIN',
  'GENERAL_MANAGER',
  'DEVELOPER',
  'LEAD_MANAGER',
  'DISPATCHER',
  'CALL_AGENT',
  'VIRTUAL_ASSISTANT',
];

/**
 * @route   GET /api/leads/stats
 * @desc    Get real-time pipeline count metrics & VA workloads
 * @access  Private (Management / Dispatcher)
 */
router.get('/stats', authorize(DISPATCHER_OR_MGMT), leadController.getLeadStats);

/**
 * @route   GET /api/leads/batches
 * @desc    Get outbound batches with progress and lead counters
 * @access  Private (Management / Dispatcher)
 */
router.get('/batches', authorize(DISPATCHER_OR_MGMT), leadController.getBatches);

/**
 * @route   GET /api/leads/batches/available-for-va
 * @desc    Get currently active batches within operating window with unassigned leads
 * @access  Private (Staff / VA)
 */
router.get(
  '/batches/available-for-va',
  authorize(VA_OPERATIONAL_ROLES),
  leadController.getAvailableBatchesForVa
);

/**
 * @route   POST /api/leads/upload
 * @desc    Upload CSV / Excel spreadsheet with leads
 * @access  Private (Management Only)
 */
router.post(
  '/upload',
  authorize(MANAGEMENT_ROLES),
  memoryUpload.single('file'),
  validateRequest({ body: createBatchSchema }),
  leadController.uploadLeads
);

/**
 * @route   POST /api/leads/distribute
 * @desc    Evenly distribute leads across VAs with 5-cap limit
 * @access  Private (Management Only)
 */
router.post('/distribute', authorize(MANAGEMENT_ROLES), leadController.distributeLeads);

/**
 * @route   GET /api/leads/agent-queue
 * @desc    Get active calling queue for Call Agent / VA with 1-lead cap auto-replenishment
 * @access  Private (VA / Agent)
 */
router.get('/agent-queue', authorize(VA_OPERATIONAL_ROLES), leadController.getAgentQueue);
router.post('/agent-queue/claim', authorize(VA_OPERATIONAL_ROLES), leadController.claimNextLead);

/**
 * @route   POST /api/leads/start-batch
 * @route   POST /api/leads/batches/:id/start
 * @desc    Start campaign batch and assign 1 lead to each active agent
 * @access  Private (Management Only)
 */
router.post('/start-batch', authorize(MANAGEMENT_ROLES), leadController.startBatch);
router.post('/batches/:id/start', authorize(MANAGEMENT_ROLES), leadController.startBatch);
router.post('/batches/:id/close', authorize(MANAGEMENT_ROLES), leadController.closeBatch);
router.post(
  '/batches/:id/revive',
  authorize(MANAGEMENT_ROLES),
  validateRequest({ body: reviveBatchSchema }),
  leadController.reviveBatch
);
router.post(
  '/batches/:id/assign',
  authorize(MANAGEMENT_ROLES),
  validateRequest({ body: assignBatchSchema }),
  leadController.assignBatch
);
router.delete('/batches/:id', authorize(MANAGEMENT_ROLES), leadController.deleteBatch);

/**
 * @route   GET /api/leads
 * @desc    Get paginated leads list with pool filtering
 * @access  Private (Staff)
 */
router.get('/', authorize(VA_OPERATIONAL_ROLES), leadController.getLeads);

/**
 * @route   POST /api/leads
 * @desc    Push single lead
 * @access  Private (Staff)
 */
router.post(
  '/',
  authorize(VA_OPERATIONAL_ROLES),
  validateRequest({ body: createLeadSchema }),
  leadController.createLead
);

/**
 * @route   GET /api/leads/:id
 * @desc    Get lead by ID
 * @access  Private (Staff)
 */
router.get('/:id', authorize(VA_OPERATIONAL_ROLES), leadController.getLeadById);

/**
 * @route   PATCH /api/leads/:id
 * @desc    Update lead status / disposition / notes / assignment
 * @access  Private (Staff)
 */
router.patch(
  '/:id',
  authorize(VA_OPERATIONAL_ROLES),
  validateRequest({ body: updateLeadSchema }),
  leadController.updateLead
);

/**
 * @route   PATCH /api/leads/:id/disposition
 * @desc    Set call disposition for a lead & trigger atomic 1-cap replenishment
 * @access  Private (VA / Agent)
 */
router.patch(
  '/:id/disposition',
  authorize(VA_OPERATIONAL_ROLES),
  validateRequest({ body: updateDispositionSchema }),
  leadController.setDisposition
);

/**
 * @route   POST /api/leads/:id/claim-callback
 * @desc    Claim an unassigned due callback lead (Atomic ACID with SKIP LOCKED)
 * @access  Private (VA / Agent)
 */
router.post(
  '/:id/claim-callback',
  authorize(VA_OPERATIONAL_ROLES),
  leadController.claimCallbackLead
);

/**
 * @route   POST /api/leads/:id/advance-stage
 * @desc    Advance lead stage in the pipeline
 * @access  Private (Dispatcher / Management)
 */
router.post(
  '/:id/advance-stage',
  authorize(DISPATCHER_OR_MGMT),
  leadController.advanceStage
);

/**
 * @route   POST /api/leads/:id/disqualify
 * @desc    Disqualify lead with structured reason and reason notes
 * @access  Private (Staff)
 */
router.post(
  '/:id/disqualify',
  authorize(VA_OPERATIONAL_ROLES),
  leadController.disqualifyLead
);

/**
 * @route   POST /api/leads/:id/reactivate
 * @desc    Reactivate disqualified lead back to VA_OUTREACH pool
 * @access  Private (Management Only)
 */
router.post(
  '/:id/reactivate',
  authorize(MANAGEMENT_ROLES),
  leadController.reactivateLead
);

/**
 * @route   POST /api/leads/:id/test-service
 * @desc    Create trial / test service work order for prospective fleet lead
 * @access  Private (Management / Dispatcher)
 */
router.post(
  '/:id/test-service',
  authorize(DISPATCHER_OR_MGMT),
  validateRequest({ body: trialServiceSchema }),
  leadController.createTestServiceJob
);

/**
 * @route   POST /api/leads/:id/transfer
 * @desc    Warm transfer lead to Dispatcher Manager
 * @access  Private (Staff)
 */
router.post(
  '/:id/transfer',
  authorize(VA_OPERATIONAL_ROLES),
  leadController.transferLeadToDm
);

/**
 * @route   POST /api/leads/:id/convert
 * @desc    Convert lead to Fleet Account (100% data preservation)
 * @access  Private (Management Only)
 */
router.post(
  '/:id/convert',
  authorize(MANAGEMENT_ROLES),
  validateRequest({ body: convertFleetSchema }),
  leadController.convertToFleet
);

export default router;
