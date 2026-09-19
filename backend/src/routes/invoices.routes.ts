import { Router } from 'express';
import { invoiceController } from '../controllers/invoiceController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  invoiceQuerySchema,
  createInvoiceSchema,
  generateInvoiceSchema,
  updateInvoiceStatusSchema,
  idParamSchema,
} from '../schemas/index.js';

const router = Router();

router.use(authenticate);

/**
 * @route   GET /api/invoices
 * @desc    Get paginated invoices with filters
 * @access  Private
 */
router.get(
  '/',
  validateRequest({ query: invoiceQuerySchema }),
  invoiceController.getInvoices
);

/**
 * @route   GET /api/invoices/:id
 * @desc    Get single invoice by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateRequest({ params: idParamSchema }),
  invoiceController.getInvoiceById
);

/**
 * @route   POST /api/invoices
 * @desc    Create manual invoice
 * @access  Private (ADMIN, ACCOUNTANT)
 */
router.post(
  '/',
  validateRequest({ body: createInvoiceSchema }),
  invoiceController.createInvoice
);

/**
 * @route   POST /api/invoices/generate
 * @desc    1-Click Invoice Generation from Job (FR-5.2)
 * @access  Private
 */
router.post(
  '/generate',
  validateRequest({ body: generateInvoiceSchema }),
  invoiceController.generateInvoice
);

/**
 * @route   PATCH /api/invoices/:id/status
 * @desc    Update invoice status
 * @access  Private
 */
router.patch(
  '/:id/status',
  validateRequest({ params: idParamSchema, body: updateInvoiceStatusSchema }),
  invoiceController.updateInvoiceStatus
);

/**
 * @route   GET /api/invoices/:id/pdf
 * @desc    Get KT Group template PDF payload (FR-5.6)
 * @access  Private
 */
router.get(
  '/:id/pdf',
  validateRequest({ params: idParamSchema }),
  invoiceController.getInvoicePdfData
);

export default router;
