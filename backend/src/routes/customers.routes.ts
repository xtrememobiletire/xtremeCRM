import { Router } from 'express';
import { customerController } from '../controllers/customerController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createCustomerSchema } from '../schemas/customer.schema.js';
import { tenantScope } from '../middleware/tenantScope.js';

const router = Router();

router.use(authenticate);
router.use(tenantScope);

router.get('/search', customerController.searchCustomer);
router.get('/:id', customerController.getCustomerById);
router.post('/', validateRequest({ body: createCustomerSchema }), customerController.createCustomer);

export default router;
