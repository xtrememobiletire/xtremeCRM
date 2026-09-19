import { Router } from 'express';
import { fleetController } from '../controllers/fleetController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createFleetSchema,
  updateFleetSchema,
  fleetQuerySchema,
  addFleetDriverSchema,
  idParamSchema,
} from '../schemas/index.js';

const router = Router();

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
 * @route   POST /api/fleets
 * @desc    Create new B2B fleet account
 * @access  Private
 */
router.post(
  '/',
  validateRequest({ body: createFleetSchema }),
  fleetController.createFleet
);

/**
 * @route   PATCH /api/fleets/:id
 * @desc    Update fleet details
 * @access  Private
 */
router.patch(
  '/:id',
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
  validateRequest({ params: idParamSchema, body: addFleetDriverSchema }),
  fleetController.addFleetDriver
);

/**
 * @route   DELETE /api/fleets/:id/drivers/:driverId
 * @desc    Remove driver from fleet
 * @access  Private
 */
router.delete('/:id/drivers/:driverId', fleetController.deleteFleetDriver);

/**
 * @route   DELETE /api/fleets/:id
 * @desc    Delete fleet account
 * @access  Private
 */
router.delete(
  '/:id',
  validateRequest({ params: idParamSchema }),
  fleetController.deleteFleet
);

export default router;
