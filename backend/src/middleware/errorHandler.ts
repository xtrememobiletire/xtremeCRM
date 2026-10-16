import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Unhandled error caught by errorHandler middleware:', err);

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: err.flatten(),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target || 'field';
      res.status(409).json({
        success: false,
        error: `Unique constraint violation: A record with that ${target} already exists.`,
        code: 'CONFLICT',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'The requested record was not found or has already been deleted.',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({
        success: false,
        error: 'Foreign key constraint failed. Related record does not exist.',
        code: 'INVALID_RELATION',
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  res.status(500).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  });
};

export default errorHandler;
