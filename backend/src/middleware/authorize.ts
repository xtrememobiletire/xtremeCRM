import { Request, Response, NextFunction } from 'express';

/**
 * Create middleware that calls next for an allowed role or ADMIN,
 * GENERAL_MANAGER, or DEVELOPER. A missing or disallowed role receives HTTP 403.
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req.user as any)?.role;

    if (
      !userRole ||
      (!allowedRoles.includes(userRole) &&
        !['ADMIN', 'GENERAL_MANAGER', 'DEVELOPER'].includes(userRole))
    ) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient permissions',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};

export default authorize;
