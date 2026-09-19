import { Request, Response } from 'express';
import { checkDatabaseHealth } from '../services/health.service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const getHello = (_req: Request, res: Response): void => {
  sendSuccess(res, {
    message: 'Hello from XtremeCRM Express Backend!',
  });
};

export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    const health = await checkDatabaseHealth();
    sendSuccess(res, health);
  } catch (err) {
    sendError(
      res,
      err instanceof Error ? err.message : 'Database query failed',
      500
    );
  }
};

export default {
  getHello,
  getHealth,
};
