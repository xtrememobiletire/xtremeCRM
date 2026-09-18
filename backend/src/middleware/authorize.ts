import { Request, Response, NextFunction } from 'express';

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req.user as any)?.role;

    if (!userRole || (!allowedRoles.includes(userRole) && userRole !== 'ADMIN')) {
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
