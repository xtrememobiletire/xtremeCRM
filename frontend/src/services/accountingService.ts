import { api } from '../utils/api';

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  countryCode: 'CA' | 'US' | 'UK';
  currency: 'CAD' | 'USD' | 'GBP';
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE';
  totalCents: number;
  subtotalCents: number;
  taxAmountCents: number;
  issueDate: string;
  dueDate: string;
  customer?: { fullName?: string };
  fleet?: { name?: string };
}

export interface JobReconciliationRecord {
  id: string;
  jobNumber: string;
  customerName: string;
  customer?: {
    id: string;
    fullName: string;
    phone?: string;
    email?: string;
  } | null;
  vehicle?: {
    id: string;
    year: number;
    make: string;
    model: string;
    licensePlate: string;
    tireSize?: string;
  } | null;
  serviceAddress?: string;
  serviceItems?: Array<{
    id: string;
    serviceName: string;
    unitPriceCents: number;
    quantity: number;
  }>;
  date: string;
  revenueCents: number;
  costCents: number;
  materialCostCents: number;
  repairerFeeCents: number;
  otherExpenseCents: number;
  expenseNotes?: string;
  itPlatformFeeCents: number;
  profitCents: number;
  netAfterItRoyaltyCents: number;
  marginPercent: number;
  paymentStatus: string;
  paymentMethod?: string;
  expenseStatedBy?: {
    id: string;
    fullName: string;
  } | null;
  expenseStatedAt?: string;
}

export interface ReconciliationResponse {
  success: boolean;
  data: JobReconciliationRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const accountingService = {
  async getReconciliationJobs(params?: {
    countryCode?: string;
    timeframe?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<ReconciliationResponse> {
    const res = await api.get('/accounting/reconciliation', { params });
    return res.data;
  },

  async stateJobExpenses(payload: {
    jobId: string;
    materialCostCents: number;
    repairerFeeCents: number;
    otherExpenseCents?: number;
    expenseNotes?: string;
  }) {
    const res = await api.post('/accounting/job-expenses', payload);
    return res.data.data;
  },

  async getInvoices(params?: { countryCode?: string }): Promise<InvoiceItem[]> {
    const res = await api.get('/invoices', { params });
    return res.data.data || [];
  },

  async generateInvoice(jobId: string) {
    const res = await api.post('/invoices/generate', { jobId });
    return res.data.data;
  },

  async getAccountingSummary(params?: { countryCode?: string; timeframe?: string }) {
    const res = await api.get('/accounting/summary', { params });
    return res.data.data;
  },

  async getCashLedger(params?: { driverId?: string }) {
    const res = await api.get('/accounting/cash-ledger', { params });
    return res.data.data || [];
  },

  async verifyCashTransaction(id: string) {
    const res = await api.patch(`/accounting/cash-ledger/${id}/verify`);
    return res.data.data;
  },
};
