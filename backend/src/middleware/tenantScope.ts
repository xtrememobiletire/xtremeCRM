import { Request, Response, NextFunction } from 'express';

export const tenantScope = (req: Request, _res: Response, next: NextFunction): void => {
  const countryHeader = req.headers['x-country-code'] as string;
  const countryQuery = req.query.countryCode as string;
  const userCountry = (req.user as any)?.countryCode;

  req.countryCode = countryHeader || countryQuery || userCountry || 'CA';
  next();
};

export default tenantScope;
