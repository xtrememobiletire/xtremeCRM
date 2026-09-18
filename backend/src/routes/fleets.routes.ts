import { Router } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

const router = Router();

router.use(authenticate);

router.get('/', async (_req, res) => {
  try {
    const fleets = await prisma.customer.findMany({ where: { isFleet: true } });
    sendSuccess(res, fleets);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const fleet = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!fleet) return sendError(res, 'Fleet not found', 404);
    sendSuccess(res, fleet);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
