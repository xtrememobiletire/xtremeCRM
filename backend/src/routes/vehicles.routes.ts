import { Router } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

const router = Router();

router.use(authenticate);

router.get('/', async (_req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany();
    sendSuccess(res, vehicles);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
    if (!vehicle) return sendError(res, 'Vehicle not found', 404);
    sendSuccess(res, vehicle);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
