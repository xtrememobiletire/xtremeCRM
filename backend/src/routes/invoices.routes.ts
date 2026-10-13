import { Router } from 'express';
import { invoiceController } from '../controllers/invoiceController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  invoiceQuerySchema,
  createInvoiceSchema,
  generateInvoiceSchema,
  generateFleetConsolidatedSchema,
  recordPaymentSchema,
  recordFleetLumpSumPaymentSchema,
  updateInvoiceStatusSchema,
  idParamSchema,
} from '../schemas/index.js';

const router = Router();

router.use(authenticate);

const INVOICE_WRITE_ROLES = ['ADMIN', 'GENERAL_MANAGER', 'DISPATCHER', 'ACCOUNTANT'];

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
 * @route   POST /api/invoices
 * @desc    Create manual/ad-hoc invoice
 * @access  Private
 */
router.post(
  '/',
  authorize(INVOICE_WRITE_ROLES),
  validateRequest({ body: createInvoiceSchema }),
  invoiceController.createInvoice
);

/**
 * @route   POST /api/invoices/generate & POST /api/invoices/generate/:jobId
 * @desc    On-demand Invoice Generation from Job
 * @access  Private
 */
router.post(
  '/generate/:jobId',
  authorize(INVOICE_WRITE_ROLES),
  validateRequest({ params: idParamSchema, body: generateInvoiceSchema.optional() }),
  invoiceController.generateInvoice
);

router.post(
  '/generate',
  authorize(INVOICE_WRITE_ROLES),
  validateRequest({ body: generateInvoiceSchema }),
  invoiceController.generateInvoice
);

/**
 * @route   POST /api/invoices/consolidated
 * @desc    Weekly Fleet Consolidated Statement Invoicing
 * @access  Private
 */
router.post(
  '/consolidated',
  authorize(INVOICE_WRITE_ROLES),
  validateRequest({ body: generateFleetConsolidatedSchema }),
  invoiceController.generateFleetConsolidatedInvoice
);

/**
 * @route   POST /api/invoices/payments/lump-sum
 * @desc    Record lump-sum payment across fleet invoices (FIFO)
 * @access  Private
 */
router.post(
  '/payments/lump-sum',
  authorize(INVOICE_WRITE_ROLES),
  validateRequest({ body: recordFleetLumpSumPaymentSchema }),
  invoiceController.recordFleetLumpSumPayment
);

/**
 * @route   POST /api/invoices/:id/payments
 * @desc    Record payment on a single invoice
 * @access  Private
 */
router.post(
  '/:id/payments',
  authorize(INVOICE_WRITE_ROLES),
  validateRequest({ params: idParamSchema, body: recordPaymentSchema }),
  invoiceController.recordPayment
);

/**
 * @route   GET /api/invoices/:id/pdf
 * @desc    Get KT Group template PDF payload
 * @access  Private
 */
router.get(
  '/:id/pdf',
  validateRequest({ params: idParamSchema }),
  invoiceController.getInvoicePdfData
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
 * @route   PATCH /api/invoices/:id/status
 * @desc    Update invoice status
 * @access  Private
 */
router.patch(
  '/:id/status',
  authorize(INVOICE_WRITE_ROLES),
  validateRequest({ params: idParamSchema, body: updateInvoiceStatusSchema }),
  invoiceController.updateInvoiceStatus
);

export default router;
