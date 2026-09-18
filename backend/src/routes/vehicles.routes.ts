import { Router } from 'express';
import { vehicleController } from '../controllers/vehicleController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  createVehicleSchema,
  updateVehicleSchema,
  vehicleQuerySchema,
  idParamSchema,
} from '../schemas/index.js';

const router = Router();

router.use(authenticate);

/**
 * @route   GET /api/vehicles
 * @desc    Get paginated vehicles with filters
 * @access  Private
 */
router.get(
  '/',
  validateRequest({ query: vehicleQuerySchema }),
  vehicleController.getVehicles
);

/**
 * @route   GET /api/vehicles/:id
 * @desc    Get vehicle by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateRequest({ params: idParamSchema }),
  vehicleController.getVehicleById
);

/**
 * @route   POST /api/vehicles
 * @desc    Create a vehicle linked to customer or fleet
 * @access  Private
 */
router.post(
  '/',
  validateRequest({ body: createVehicleSchema }),
  vehicleController.createVehicle
);

/**
 * @route   PATCH /api/vehicles/:id
 * @desc    Update vehicle specifications
 * @access  Private
 */
router.patch(
  '/:id',
  validateRequest({ params: idParamSchema, body: updateVehicleSchema }),
  vehicleController.updateVehicle
);

/**
 * @route   DELETE /api/vehicles/:id
 * @desc    Delete vehicle
 * @access  Private
 */
router.delete(
  '/:id',
  validateRequest({ params: idParamSchema }),
  vehicleController.deleteVehicle
);

export default router;
