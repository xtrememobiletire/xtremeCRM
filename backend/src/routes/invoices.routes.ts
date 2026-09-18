import { Router } from 'express';
import { accountingController } from '../controllers/accountingController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', accountingController.getInvoices);
router.post('/generate', accountingController.generateInvoice);

export default router;
