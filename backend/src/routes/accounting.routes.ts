import { Router } from 'express';
import { accountingController } from '../controllers/accountingController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  stateJobExpensesSchema,
  createCashLedgerSchema,
  cashLedgerQuerySchema,
  accountingSummaryQuerySchema,
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

export default router;
