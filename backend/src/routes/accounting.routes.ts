import { Router } from 'express';
import { accountingController } from '../controllers/accountingController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import upload from '../config/multer.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  stateJobExpensesSchema,
  createCashLedgerSchema,
  cashLedgerQuerySchema,
  accountingSummaryQuerySchema,
  reconciliationQuerySchema,
  idParamSchema,
} from '../schemas/index.js';

const router = Router();

router.use(authenticate);
router.use(authorize(['ADMIN', 'ACCOUNTANT']));

/**
 * @route   GET /api/accounting/summary
 * @desc    Get regional P&L summary without cross-currency blending
 * @access  Private (ADMIN, ACCOUNTANT)
 */
router.get(
  '/summary',
  validateRequest({ query: accountingSummaryQuerySchema }),
  accountingController.getAccountingSummary
);

/**
 * @route   GET /api/accounting/reconciliation
 * @desc    Get completed jobs financial breakdown for ledger
 * @access  Private (ADMIN, ACCOUNTANT)
 */
router.get(
  '/reconciliation',
  validateRequest({ query: reconciliationQuerySchema }),
  accountingController.getReconciliationJobs
);

/**
 * @route   GET /api/accounting/jobs
 * @desc    Alias for /reconciliation
 * @access  Private (ADMIN, ACCOUNTANT)
 */
router.get(
  '/jobs',
  validateRequest({ query: reconciliationQuerySchema }),
  accountingController.getReconciliationJobs
);

/**
 * @route   POST /api/accounting/job-expenses
 * @desc    State job actual expenses
 * @access  Private (ADMIN, ACCOUNTANT)
 */
router.post(
  '/job-expenses',
  validateRequest({ body: stateJobExpensesSchema }),
  accountingController.stateJobExpenses
);

/**
 * @route   GET /api/accounting/cash-ledger
 * @desc    Get driver cash ledger entries
 * @access  Private (ADMIN, ACCOUNTANT)
 */
router.get(
  '/cash-ledger',
  validateRequest({ query: cashLedgerQuerySchema }),
  accountingController.getCashLedger
);

/**
 * @route   POST /api/accounting/cash-ledger
 * @desc    Record driver cash transaction
 * @access  Private (ADMIN, ACCOUNTANT)
 */
router.post(
  '/cash-ledger',
  validateRequest({ body: createCashLedgerSchema }),
  accountingController.createCashTransaction
);

/**
 * @route   PATCH /api/accounting/cash-ledger/:id/verify
 * @desc    Accountant verifies cash deposit
 * @access  Private (ADMIN, ACCOUNTANT)
 */
router.patch(
  '/cash-ledger/:id/verify',
  validateRequest({ params: idParamSchema }),
  accountingController.verifyCashTransaction
);

/**
 * @route   PATCH /api/accounting/jobs/:id/verify-payment
 * @desc    Senior Accountant verifies job cash payment (marks VERIFIED_PAID)
 * @access  Private (ADMIN, ACCOUNTANT)
 */
router.patch(
  '/jobs/:id/verify-payment',
  validateRequest({ params: idParamSchema }),
  accountingController.verifyJobPayment
);

/**
 * @route   POST /api/accounting/receipt/:id
 * @desc    Upload customer payment receipt
 * @access  Private (ADMIN, ACCOUNTANT)
 */
router.post(
  '/receipt/:id',
  validateRequest({ params: idParamSchema }),
  upload.single('receipt'),
  accountingController.uploadReceipt
);

/**
 * @route   POST /api/accounting/material-receipt/:id
 * @desc    Upload supplier wholesale parts receipt
 * @access  Private (ADMIN, ACCOUNTANT)
 */
router.post(
  '/material-receipt/:id',
  validateRequest({ params: idParamSchema }),
  upload.single('materialReceipt'),
  accountingController.uploadMaterialReceipt
);

/**
 * @route   GET /api/accounting/developer-profit
 * @desc    Get total IT/developer profits across regions
 * @access  Private (ADMIN strictly)
 */
router.get(
  '/developer-profit',
  authorize(['ADMIN']),
  accountingController.getDeveloperProfit
);

export default router;
