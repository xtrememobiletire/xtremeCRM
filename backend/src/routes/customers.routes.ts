import { Router } from 'express';
import { customerController } from '../controllers/customerController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
  idParamSchema,
} from '../schemas/index.js';
import { tenantScope } from '../middleware/tenantScope.js';

const router = Router();

router.use(authenticate);
router.use(tenantScope);

/**
 * @route   GET /api/customers
 * @desc    Get paginated customers
 * @access  Private
 */
router.get(
  '/',
  validateRequest({ query: customerQuerySchema }),
  customerController.getCustomers
);

/**
 * @route   GET /api/customers/lookup
 * @desc    Fast screen pop customer & fleet lookup by phone (PRD FR-1.3)
 * @access  Private
 */
router.get('/lookup', customerController.lookupCustomer);

/**
 * @route   GET /api/customers/search
 * @desc    Fast search by phone or name for Telnyx screen pop (FR-1.3)
 * @access  Private
 */
router.get('/search', customerController.searchCustomer);

/**
 * @route   GET /api/customers/:id
 * @desc    Get customer by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateRequest({ params: idParamSchema }),
  customerController.getCustomerById
);

/**
 * @route   POST /api/customers
 * @desc    Create a customer
 * @access  Private
 */
router.post(
  '/',
  validateRequest({ body: createCustomerSchema }),
  customerController.createCustomer
);

/**
 * @route   PATCH /api/customers/:id
 * @desc    Update customer details
 * @access  Private
 */
router.patch(
  '/:id',
  validateRequest({ params: idParamSchema, body: updateCustomerSchema }),
  customerController.updateCustomer
);

/**
 * @route   DELETE /api/customers/:id
 * @desc    Delete customer
 * @access  Private
 */
router.delete(
  '/:id',
  validateRequest({ params: idParamSchema }),
  customerController.deleteCustomer
);

export default router;
