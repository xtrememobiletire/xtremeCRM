import { Router } from 'express';
import { fleetController } from '../controllers/fleetController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createFleetSchema,
  updateFleetSchema,
  fleetQuerySchema,
  addFleetDriverSchema,
  registerFleetSchema,
  idParamSchema,
} from '../schemas/index.js';

const router = Router();

/**
 * @route   POST /api/fleets/register
 * @desc    Public landing page self-service fleet account registration (unapproved / PENDING)
 * @access  Public
 */
router.post(
  '/register',
  validateRequest({ body: registerFleetSchema }),
  fleetController.registerPublicFleet
);

router.use(authenticate);

/**
 * @route   GET /api/fleets
 * @desc    Get paginated fleets
 * @access  Private
 */
router.get(
  '/',
  validateRequest({ query: fleetQuerySchema }),
  fleetController.getFleets
);

/**
 * @route   GET /api/fleets/lookup
 * @desc    24/7 Roadside Driver Verification by Plate or Company Name (FR-2.1)
 * @access  Private
 */
router.get('/lookup', fleetController.lookupFleet);

/**
 * @route   GET /api/fleets/:id
 * @desc    Get fleet by ID with vehicles, drivers, and KPI
 * @access  Private
 */
router.get(
  '/:id',
  validateRequest({ params: idParamSchema }),
  fleetController.getFleetById
);

/**
 * @route   GET /api/fleets/:id/billing-summary
 * @desc    Get fleet outstanding balance & unbilled completed work orders
 * @access  Private
 */
router.get(
  '/:id/billing-summary',
  validateRequest({ params: idParamSchema }),
  fleetController.getFleetBillingSummary
);

/**
 * @route   POST /api/fleets
 * @desc    Create new B2B fleet account
 * @access  Private
 */
router.post(
  '/',
  authorize(['ADMIN', 'GENERAL_MANAGER', 'DISPATCHER']),
  validateRequest({ body: createFleetSchema }),
  fleetController.createFleet
);

/**
 * @route   PATCH /api/fleets/:id/approve
 * @desc    Approve pending fleet registration into active approved fleet
 * @access  Private
 */
router.patch(
  '/:id/approve',
  authorize(['ADMIN', 'GENERAL_MANAGER', 'DISPATCHER']),
  validateRequest({ params: idParamSchema }),
  fleetController.approveFleet
);

/**
 * @route   PATCH /api/fleets/:id
 * @desc    Update fleet details
 * @access  Private
 */
router.patch(
  '/:id',
  authorize(['ADMIN', 'GENERAL_MANAGER', 'DISPATCHER']),
  validateRequest({ params: idParamSchema, body: updateFleetSchema }),
  fleetController.updateFleet
);

/**
 * @route   GET /api/fleets/:id/drivers
 * @desc    List fleet drivers
 * @access  Private
 */
router.get(
  '/:id/drivers',
  validateRequest({ params: idParamSchema }),
  fleetController.getFleetDrivers
);

/**
 * @route   POST /api/fleets/:id/drivers
 * @desc    Register a driver in the fleet
 * @access  Private
 */
router.post(
  '/:id/drivers',
  authorize(['ADMIN', 'GENERAL_MANAGER', 'DISPATCHER']),
  validateRequest({ params: idParamSchema, body: addFleetDriverSchema }),
  fleetController.addFleetDriver
);

/**
 * @route   DELETE /api/fleets/:id/drivers/:driverId
 * @desc    Remove driver from fleet
 * @access  Private
 */
router.delete(
  '/:id/drivers/:driverId',
  authorize(['ADMIN', 'GENERAL_MANAGER', 'DISPATCHER']),
  fleetController.deleteFleetDriver
);

/**
 * @route   DELETE /api/fleets/:id
 * @desc    Delete fleet account
 * @access  Private
 */
router.delete(
  '/:id',
  authorize(['ADMIN', 'GENERAL_MANAGER', 'DISPATCHER']),
  validateRequest({ params: idParamSchema }),
  fleetController.deleteFleet
);

export default router;
