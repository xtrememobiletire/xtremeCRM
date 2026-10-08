import { Router } from 'express';
import { leadController } from '../controllers/leadController.js';
import { authenticate } from '../middleware/auth.js';
import { memoryUpload } from '../config/multer.js';

const router = Router();

/**
 * @route   POST /api/leads/upload
 * @desc    Upload CSV / Excel spreadsheet with leads (VA / Admin)
 * @access  Private
 */
router.post('/upload', authenticate, memoryUpload.single('file'), leadController.uploadLeads);

/**
 * @route   POST /api/leads/distribute
 * @desc    Evenly distribute leads across VAs with 5-cap limit (Admin / GM)
 * @access  Private (Admin, General Manager)
 */
router.post('/distribute', authenticate, leadController.distributeLeads);

/**
 * @route   GET /api/leads/agent-queue
 * @desc    Get active calling queue for Call Agent / VA with 5-cap auto-fill
 * @access  Private
 */
router.get('/agent-queue', authenticate, leadController.getAgentQueue);

/**
 * @route   POST /api/leads/start-batch
 * @desc    Start campaign batch and assign 5 leads to active agents (Admin / GM)
 * @access  Private
 */
router.post('/start-batch', authenticate, leadController.startBatch);

/**
 * @route   GET /api/leads
 * @desc    Get paginated leads list with pool filtering (?pool=va|callbacks|dispatcher|admin|disqualified)
 * @access  Private (Staff)
 */
router.get('/', authenticate, leadController.getLeads);

/**
 * @route   POST /api/leads
 * @desc    Push single lead (VA / Agent / Admin)
 * @access  Private
 */
router.post('/', authenticate, leadController.createLead);

/**
 * @route   GET /api/leads/:id
 * @desc    Get lead by ID
 * @access  Private
 */
router.get('/:id', authenticate, leadController.getLeadById);

/**
 * @route   PATCH /api/leads/:id
 * @desc    Update lead status / disposition / notes / assignment
 * @access  Private
 */
router.patch('/:id', authenticate, leadController.updateLead);

/**
 * @route   PATCH /api/leads/:id/disposition
 * @desc    Set call disposition for a lead & trigger pg-boss replenishment
 * @access  Private
 */
router.patch('/:id/disposition', authenticate, leadController.setDisposition);

/**
 * @route   POST /api/leads/:id/advance-stage
 * @desc    Advance lead stage in the pipeline (VA -> Dispatcher Review -> Trial -> Contract)
 * @access  Private
 */
router.post('/:id/advance-stage', authenticate, leadController.advanceStage);

/**
 * @route   POST /api/leads/:id/disqualify
 * @desc    Disqualify lead with structured reason and reason notes
 * @access  Private
 */
router.post('/:id/disqualify', authenticate, leadController.disqualifyLead);

/**
 * @route   POST /api/leads/:id/test-service
 * @desc    Create trial / test service work order for prospective fleet lead
 * @access  Private (Dispatcher, Admin, GM)
 */
router.post('/:id/test-service', authenticate, leadController.createTestServiceJob);

/**
 * @route   POST /api/leads/:id/transfer
 * @desc    Warm transfer lead to Dispatcher Manager
 * @access  Private
 */
router.post('/:id/transfer', authenticate, leadController.transferLeadToDm);

/**
 * @route   POST /api/leads/:id/convert
 * @desc    Convert lead to Fleet Account (100% data preservation)
 * @access  Private
 */
router.post('/:id/convert', authenticate, leadController.convertToFleet);

export default router;
