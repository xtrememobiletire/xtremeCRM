import { Router } from 'express';
import { leadController } from '../controllers/leadController.js';
import { authenticate } from '../middleware/auth.js';
import { memoryUpload } from '../config/multer.js';

const router = Router();

/**
 * @route   POST /api/leads/upload
 * @desc    Upload CSV / Excel spreadsheet with leads (VA)
 * @access  Private
 */
router.post('/upload', authenticate, memoryUpload.single('file'), leadController.uploadLeads);

/**
 * @route   GET /api/leads/agent-queue
 * @desc    Get active calling queue for Call Agent with 10-cap round-robin auto-fill
 * @access  Private
 */
router.get('/agent-queue', authenticate, leadController.getAgentQueue);

/**
 * @route   GET /api/leads
 * @desc    Get paginated leads list
 * @access  Private (Staff)
 */
router.get('/', authenticate, leadController.getLeads);

/**
 * @route   POST /api/leads
 * @desc    Push single lead (VA / Agent)
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
 * @desc    Update lead status / disposition / notes
 * @access  Private
 */
router.patch('/:id', authenticate, leadController.updateLead);

/**
 * @route   PATCH /api/leads/:id/disposition
 * @desc    Set call disposition for a lead
 * @access  Private
 */
router.patch('/:id/disposition', authenticate, leadController.setDisposition);

/**
 * @route   POST /api/leads/:id/transfer
 * @desc    Warm transfer lead to Dispatcher Manager
 * @access  Private
 */
router.post('/:id/transfer', authenticate, leadController.transferLeadToDm);

/**
 * @route   POST /api/leads/:id/convert
 * @desc    Convert lead to Fleet Account
 * @access  Private
 */
router.post('/:id/convert', authenticate, leadController.convertToFleet);

export default router;
