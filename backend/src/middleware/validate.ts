import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

interface ValidationTargets {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validate = (schemas: ValidationTargets) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        const parsed = await schemas.query.parseAsync(req.query);
        Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true, enumerable: true });
      }
      if (schemas.params) {
        const parsed = await schemas.params.parseAsync(req.params);
        Object.defineProperty(req, 'params', { value: parsed, writable: true, configurable: true, enumerable: true });
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          issues: error.issues,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(error);
    }
  };
};

export default validate;
