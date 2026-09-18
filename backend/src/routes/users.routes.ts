import { Router } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(['ADMIN']), async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, firstName: true, lastName: true, countryCode: true, isActive: true },
    });
    sendSuccess(res, users);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, countryCode: true },
    });
    if (!user) return sendError(res, 'User not found', 404);
    sendSuccess(res, user);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
