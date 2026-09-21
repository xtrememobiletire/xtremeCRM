import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  userQuerySchema,
  createUserSchema,
  updateUserSchema,
  idParamSchema,
} from '../schemas/index.js';

const router = Router();

router.use(authenticate);

/**
 * @route   GET /api/users
 * @desc    Get paginated users with filters
 * @access  Private (ADMIN, DISPATCHER)
 */
router.get(
  '/',
  authorize(['ADMIN', 'DISPATCHER', 'CALL_AGENT', 'ACCOUNTANT']),
  validateRequest({ query: userQuerySchema }),
  userController.getUsers
);

/**
 * @route   GET /api/users/:id
 * @desc    Get single user by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateRequest({ params: idParamSchema }),
  userController.getUserById
);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (ADMIN only)
 */
router.post(
  '/',
  authorize(['ADMIN']),
  validateRequest({ body: createUserSchema }),
  userController.createUser
);

/**
 * @route   PATCH /api/users/:id
 * @desc    Update user profile or role
 * @access  Private (ADMIN only)
 */
router.patch(
  '/:id',
  authorize(['ADMIN']),
  validateRequest({ params: idParamSchema, body: updateUserSchema }),
  userController.updateUser
);

/**
 * @route   PATCH /api/users/me/active
 * @desc    Toggle current agent presence for call intake (FR-1.1)
 * @access  Private
 */
router.patch('/me/active', userController.toggleAgentActive);

/**
 * @route   PATCH /api/users/:id/active
 * @desc    Toggle agent presence for call intake (FR-1.1)
 * @access  Private
 */
router.patch(
  '/:id/active',
  validateRequest({ params: idParamSchema }),
  userController.toggleAgentActive
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Soft delete user
 * @access  Private (ADMIN only)
 */
router.delete(
  '/:id',
  authorize(['ADMIN']),
  validateRequest({ params: idParamSchema }),
  userController.deleteUser
);

export default router;
