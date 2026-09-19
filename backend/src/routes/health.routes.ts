import { Router } from 'express';
import { getHello, getHealth } from '../controllers/health.controller.js';

const router = Router();

router.get('/hello', getHello);
router.get('/health', getHealth);

export default router;
