export type CountryCode = 'CA' | 'US' | 'UK';
export type CurrencyCode = 'CAD' | 'USD' | 'GBP';

export type UserRole =
  | 'ADMIN'
  | 'GENERAL_MANAGER'
  | 'DEVELOPER'
  | 'CALL_AGENT'
  | 'DISPATCHER'
  | 'DRIVER'
  | 'ACCOUNTANT'
  | 'VIRTUAL_ASSISTANT'
  | 'FLEET_MANAGER'
  | 'CUSTOMER_MEMBER';

export type LeadStage =
  | 'VA_OUTREACH'
  | 'AGENT_CALLBACK'
  | 'DISPATCHER_REVIEW'
  | 'ADMIN_APPROVAL'
  | 'CONVERTED'
  | 'DISQUALIFIED';

export type DisqualificationReason =
  | 'NO_FLEET_VEHICLES'
  | 'OUT_OF_SERVICE_AREA'
  | 'NOT_INTERESTED'
  | 'COMPETITOR_LOCKED'
  | 'PRICING_MISMATCH'
  | 'UNRESPONSIVE'
  | 'OTHER';

export type JobStatus =
  | 'PENDING'
  | 'UNVERIFIED_PUBLIC'
  | 'ASSIGNED'
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
