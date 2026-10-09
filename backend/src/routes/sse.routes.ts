import { Router } from 'express';
import { sseController } from '../controllers/sseController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// SSE stream: Optional authenticate so dashboard or authenticated staff receives personalized channels
router.get('/stream', authenticate, sseController.stream);

export default router;
