import { api } from '../utils/api';

export const InvoiceType = {
  JOB: 'JOB',
  FLEET: 'FLEET',
  MEMBER: 'MEMBER',
  CUSTOMER: 'CUSTOMER',
  CUSTOM: 'CUSTOM',
} as const;
export type InvoiceType = (typeof InvoiceType)[keyof typeof InvoiceType];
export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'VOID' | 'CANCELLED';

export interface InvoiceItemDetail {
  id: string;
  itemDetails: string;
  unitPriceCents: number;
  quantity: number;
}

export interface InvoicePaymentRecord {
  id: string;
  amountCents: number;
  paymentMethod: string;
  referenceId?: string;
  notes?: string;
  recordedAt: string;
  recordedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  countryCode: 'CA' | 'US' | 'UK';
  currency: 'CAD' | 'USD' | 'GBP';
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  subtotalCents: number;
  taxRatePercent?: number | null;
  isTaxExempt: boolean;
  taxAmountCents: number;
  depositCents: number;
  discountCents: number;
  totalCents: number;
  amountPaidCents: number;
  balanceDueCents: number;
  paidAt?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  customer?: {
    id: string;
    fullName: string;
    phone?: string;
    email?: string;
  } | null;
  fleet?: {
    id: string;
    name?: string;
    companyName?: string;
    phone?: string;
    email?: string;
    paymentTerms?: string;
  } | null;
  createdBy?: {
    id: string;
    fullName: string;
  };
  items: InvoiceItemDetail[];
  jobs?: Array<{
    id: string;
    jobCode: string;
    status: string;
    serviceAddress: string;
    completedAt?: string;
    totalCents: number;
    paymentStatus?: string;
  }>;
  payments?: InvoicePaymentRecord[];
  createdAt: string;
}

export interface InvoicesResponse {
  data: InvoiceRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface FleetBillingSummary {
  fleet: {
    id: string;
    name?: string;
    companyName?: string;
    fleetCode?: string;
    paymentTerms?: string;
    creditLimitCents?: number;
    countryCode: string;
    discountPercent?: number;
  };
  invoices?: InvoiceRecord[];
  outstandingInvoices?: InvoiceRecord[];
  outstandingBalanceCents?: number;
  totalOutstandingCents?: number;
  unbilledJobs?: Array<{
    id: string;
    jobCode: string;
    completedAt?: string;
    serviceAddress?: string;
    totalCents?: number;
    currency?: string;
    vehicle?: {
      year?: number;
      make?: string;
      model?: string;
      licensePlate?: string;
      tireSize?: string;
    };
  }>;
  unbilledCompletedJobs?: Array<{
    id: string;
    jobCode: string;
    completedAt?: string;
    serviceAddress?: string;
    totalCents?: number;
    currency?: string;
    vehicle?: {
      year?: number;
      make?: string;
      model?: string;
      licensePlate?: string;
      tireSize?: string;
    };
  }>;
  unbilledTotalCents?: number;
  totalUnbilledCents?: number;
  combinedTotalReceivableCents?: number;
}

export const invoiceService = {
  /**
   * Fetch invoices with optional account/status/search filters and pagination.
   * @returns The API envelope with the data array and meta pagination.
   * @throws The API request error on rejection.
   */
  async getInvoices(params?: {
    countryCode?: string;
    status?: string;
    invoiceType?: string;
    fleetId?: string;
    customerId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<InvoicesResponse> {
    const res = await api.get('/invoices', { params });
    return res.data;
  },

  /**
   * Fetch an invoice with items, account details, linked jobs, and payment history.
   * @throws The API request error, including HTTP 404 for a missing invoice.
   */
  async getInvoiceById(id: string): Promise<InvoiceRecord> {
    const res = await api.get(`/invoices/${id}`);
    return res.data.data;
  },

  /**
   * Create a manual invoice with prices, discounts, and deposits in cents and tax
   * as a percentage. The server chooses issueDate; payload.issueDate is ignored.
   * @throws The API request error on rejection.
   */
  async createInvoice(payload: {
    invoiceType: InvoiceType;
    customerId?: string;
    fleetId?: string;
    countryCode?: string;
    issueDate?: string;
    dueDate?: string;
    items: Array<{ itemDetails: string; unitPriceCents: number; quantity: number }>;
    taxRatePercent?: number | null;
    isTaxExempt?: boolean;
    discountCents?: number;
    depositCents?: number;
    notes?: string;
  }): Promise<InvoiceRecord> {
    const res = await api.post('/invoices', payload);
    return res.data.data;
  },

  /**
   * Fetch an existing job invoice or create and link one using optional tax,
   * line-item, due-date, discount, and deposit-credit settings. Prices/discounts are
   * in cents; creditDeposit defaults to true on the server.
   * @throws The API request error, including HTTP 404 for a missing job.
   */
  async generateInvoiceFromJob(
    jobId: string,
    payload?: {
      taxRatePercent?: number | null;
      isTaxExempt?: boolean;
      creditDeposit?: boolean;
      dueDate?: string;
      paymentTerms?: string;
      notes?: string;
      discountCents?: number;
      lineItems?: Array<{ itemDetails?: string; description?: string; unitPriceCents: number; quantity: number }>;
    }
  ): Promise<InvoiceRecord> {
    const res = await api.post('/invoices/generate', { jobId, ...(payload || {}) });
    return res.data.data;
  },

  /**
   * Invoice the selected completed, unbilled jobs belonging to the fleet; the
   * server ignores other IDs, applies the fleet discount, and links eligible jobs.
   * @throws The API request error, including rejection when no jobs are eligible.
   */
  async generateFleetConsolidatedInvoice(payload: {
    fleetId: string;
    jobIds: string[];
    taxRatePercent?: number | null;
    isTaxExempt?: boolean;
    dueDate?: string;
    notes?: string;
  }): Promise<InvoiceRecord> {
    const res = await api.post('/invoices/consolidated', payload);
    return res.data.data;
  },

  /**
   * Record a payment in cents and update the invoice and linked jobs' payment status.
   * @returns The API payload { pmt, updatedInvoice }.
   * @throws The API request error, including HTTP 404 for a missing invoice.
   */
  async recordPayment(
    invoiceId: string,
    payload: {
      amountCents: number;
      paymentMethod: string;
      referenceId?: string;
      notes?: string;
    }
  ): Promise<InvoiceRecord> {
    const res = await api.post(`/invoices/${invoiceId}/payments`, payload);
    return res.data.data;
  },

  /**
   * Allocate a payment in cents to outstanding fleet invoices by earliest due date.
   * @returns The API payload { settledCount, allocatedCents }; excess funds are unallocated.
   * @throws The API request error, including rejection when no invoices are eligible.
   */
  async recordFleetLumpSumPayment(payload: {
    fleetId: string;
    amountCents: number;
    paymentMethod: string;
    referenceId?: string;
    notes?: string;
  }): Promise<{ message: string; remainingUnallocatedCents: number; updatedInvoices: InvoiceRecord[] }> {
    const res = await api.post('/invoices/payments/lump-sum', payload);
    return res.data.data;
  },

  /**
   * Fetch JSON template data with regional billing details and formatted totals.
   * @throws The API request error, including HTTP 404 for a missing invoice.
   */
  async getInvoicePdfData(id: string): Promise<any> {
    const res = await api.get(`/invoices/${id}/pdf`);
    return res.data.data;
  },

  /**
   * Fetch fleet billing data with totals in cents; PARTIAL invoices are excluded.
   * @returns The API payload with fleet, unbilledJobs, unbilledTotalCents, invoices,
   * and outstandingBalanceCents.
   * @throws The API request error, including HTTP 404 for a missing fleet.
   */
  async getFleetBillingSummary(fleetId: string): Promise<FleetBillingSummary> {
    const res = await api.get(`/fleets/${fleetId}/billing-summary`);
    return res.data.data;
  },
};
