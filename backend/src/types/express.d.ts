import { Request } from 'express';
import { UserRole, CountryCode } from './common.js';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      fullName: string;
      role: UserRole;
      countryCode: CountryCode;
      phone?: string | null;
      isAgentActive?: boolean;
    }

    interface Request {
      user?: User;
      countryCode?: CountryCode;
      tenantId?: string;
    }
  }
}
