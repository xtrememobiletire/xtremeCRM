import { Router } from 'express';
import { telephonyController } from '../controllers/telephonyController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/token', authenticate, telephonyController.getToken);
router.post('/webhook', telephonyController.handleWebhook);

export default router;
