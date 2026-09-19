import { Router } from 'express';
import { telephonyController } from '../controllers/telephonyController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * @route   GET /api/telephony/token
 * @desc    Get WebRTC softphone token for active agent (FR-1.2)
 * @access  Private
 */
router.get('/token', authenticate, telephonyController.getToken);

/**
 * @route   POST /api/telephony/webhook
 * @desc    Telnyx dual-trigger inbound call webhook (FR-1.2)
 * @access  Public (Webhook)
 */
router.post('/webhook', telephonyController.handleWebhook);

/**
 * @route   POST /api/telephony/call
 * @desc    Click-to-call outbound trigger (FR-1.2)
 * @access  Private
 */
router.post('/call', authenticate, telephonyController.makeCall);

export default router;
