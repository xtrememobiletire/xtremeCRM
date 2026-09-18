import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * =====================================
 * REQUEST VALIDATION MIDDLEWARE
 * =====================================
 * Validates incoming requests against Zod schemas
 * Provides clean error messages
 */

export interface ValidationTarget {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}

/**
 * Middleware factory for request validation
 * @param schemas - Object containing schemas for body, query, and params
 * @returns Express middleware function
 */
export function validateRequest(schemas: ValidationTarget) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schemas.body) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: formatZodErrors(result.error),
          });
        }
        req.body = result.data;
      }

      // Validate query parameters
      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          return res.status(400).json({
            success: false,
            message: 'Invalid query parameters',
            errors: formatZodErrors(result.error),
          });
        }
        req.query = result.data;
      }

      // Validate URL parameters
      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          return res.status(400).json({
            success: false,
            message: 'Invalid URL parameters',
            errors: formatZodErrors(result.error),
          });
        }
        req.params = result.data;
      }

      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal validation error',
      });
    }
  };
}

/**
 * Format Zod validation errors into user-friendly messages
 * @param error - ZodError object
 * @returns Formatted error messages
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(err.message);
  });

  return formatted;
}
