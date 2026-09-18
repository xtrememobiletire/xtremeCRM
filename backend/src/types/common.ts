export type CountryCode = 'CA' | 'US' | 'UK';
export type CurrencyCode = 'CAD' | 'USD' | 'GBP';

export type UserRole =
  | 'ADMIN'
  | 'CALL_AGENT'
  | 'DISPATCHER'
  | 'DRIVER'
  | 'ACCOUNTANT'
  | 'VIRTUAL_ASSISTANT'
  | 'FLEET_MANAGER'
  | 'CUSTOMER_MEMBER';

export type JobStatus =
  | 'PENDING'
  | 'UNVERIFIED_PUBLIC'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type JobUrgency = 'URGENT' | 'STANDARD' | 'FUTURE';

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}
