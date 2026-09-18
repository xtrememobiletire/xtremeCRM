import { Router } from 'express';
import { messageController } from '../controllers/messageController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createPortalMessageSchema,
  portalMessageQuerySchema,
  createJobMessageSchema,
  idParamSchema,
} from '../schemas/index.js';

const router = Router();

router.use(authenticate);

/**
 * @route   GET /api/messages/portal
 * @desc    Get internal portal inbox messages (FR-3.2)
 * @access  Private
 */
router.get(
  '/portal',
  validateRequest({ query: portalMessageQuerySchema }),
  messageController.getPortalMessages
);

/**
 * @route   POST /api/messages/portal
 * @desc    Send internal portal inbox message
 * @access  Private
 */
router.post(
  '/portal',
  validateRequest({ body: createPortalMessageSchema }),
  messageController.sendPortalMessage
);

/**
 * @route   PATCH /api/messages/portal/:id/read
 * @desc    Mark portal message as read
 * @access  Private
 */
router.patch(
  '/portal/:id/read',
  validateRequest({ params: idParamSchema }),
  messageController.markMessageRead
);

/**
 * @route   GET /api/messages/job/:jobId
 * @desc    Get job two-way chat messages between driver and dispatcher (FR-4.5)
 * @access  Private
 */
router.get('/job/:jobId', messageController.getJobMessages);

/**
 * @route   POST /api/messages/job/:jobId
 * @desc    Send job chat message
 * @access  Private
 */
router.post(
  '/job/:jobId',
  validateRequest({ body: createJobMessageSchema }),
  messageController.sendJobMessage
);

export default router;
