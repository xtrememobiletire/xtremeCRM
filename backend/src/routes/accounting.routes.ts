import { Router } from 'express';
import { accountingController } from '../controllers/accountingController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);
router.use(authorize(['ADMIN', 'ACCOUNTANT']));

router.post('/job-expenses', accountingController.stateJobExpenses);
router.get('/invoices', accountingController.getInvoices);
router.post('/invoices/generate', accountingController.generateInvoice);

export default router;
