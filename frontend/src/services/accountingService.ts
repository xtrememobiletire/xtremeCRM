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

  async getInvoices(): Promise<InvoiceItem[]> {
    const res = await api.get('/accounting/invoices');
    return res.data.data || [];
  },

  async generateInvoice(jobId: string) {
    const res = await api.post('/accounting/invoices/generate', { jobId });
    return res.data.data;
  },
};
