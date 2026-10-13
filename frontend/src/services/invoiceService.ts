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
    companyName: string;
    paymentTerms: string;
    creditLimitCents: number;
    countryCode: string;
  };
  outstandingInvoices: InvoiceRecord[];
  totalOutstandingCents: number;
  unbilledCompletedJobs: Array<{
    id: string;
    jobCode: string;
    completedAt: string;
    serviceAddress: string;
    totalCents: number;
    currency: string;
    vehicle?: {
      year?: number;
      make?: string;
      model?: string;
      licensePlate?: string;
      tireSize?: string;
    };
  }>;
  totalUnbilledCents: number;
  combinedTotalReceivableCents: number;
}

export const invoiceService = {
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

  async getInvoiceById(id: string): Promise<InvoiceRecord> {
    const res = await api.get(`/invoices/${id}`);
    return res.data.data;
  },

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

  async getInvoicePdfData(id: string): Promise<any> {
    const res = await api.get(`/invoices/${id}/pdf`);
    return res.data.data;
  },

  async getFleetBillingSummary(fleetId: string): Promise<FleetBillingSummary> {
    const res = await api.get(`/fleets/${fleetId}/billing-summary`);
    return res.data.data;
  },
};
