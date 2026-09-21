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

export const accountingService = {
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
