import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService, type InvoiceType } from '../services/invoiceService';
import { useTenant } from '../context/TenantContext';

export interface UseInvoicesParams {
  countryCode?: string;
  status?: string;
  invoiceType?: string;
  fleetId?: string;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useInvoices(params?: UseInvoicesParams) {
  const { country } = useTenant();
  const effectiveCountry = params?.countryCode !== undefined ? params.countryCode : country;

  return useQuery({
    queryKey: ['invoices', { ...params, countryCode: effectiveCountry }],
    queryFn: () =>
      invoiceService.getInvoices({
        ...params,
        countryCode: effectiveCountry === 'ALL' ? undefined : effectiveCountry,
      }),
  });
}

export function useInvoice(id: string | null | undefined) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceService.getInvoiceById(id!),
    enabled: !!id,
  });
}

export function useFleetBillingSummary(fleetId: string | null | undefined) {
  return useQuery({
    queryKey: ['fleet-billing-summary', fleetId],
    queryFn: () => invoiceService.getFleetBillingSummary(fleetId!),
    enabled: !!fleetId,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
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
    }) => invoiceService.createInvoice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-invoices'] });
    },
  });
}

export function useGenerateJobInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      options,
    }: {
      jobId: string;
      options?: {
        taxRatePercent?: number | null;
        isTaxExempt?: boolean;
        creditDeposit?: boolean;
        dueDate?: string;
        paymentTerms?: string;
        notes?: string;
        discountCents?: number;
        lineItems?: Array<{ itemDetails?: string; description?: string; unitPriceCents: number; quantity: number }>;
      };
    }) => invoiceService.generateInvoiceFromJob(jobId, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-ledger'] });
    },
  });
}

export function useGenerateFleetConsolidatedInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      fleetId: string;
      jobIds: string[];
      taxRatePercent?: number | null;
      isTaxExempt?: boolean;
      dueDate?: string;
      notes?: string;
    }) => invoiceService.generateFleetConsolidatedInvoice(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-billing-summary', variables.fleetId] });
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceId,
      payload,
    }: {
      invoiceId: string;
      payload: {
        amountCents: number;
        paymentMethod: string;
        referenceId?: string;
        notes?: string;
      };
    }) => invoiceService.recordPayment(invoiceId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['fleet-billing-summary'] });
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-ledger'] });
    },
  });
}

export function useRecordFleetLumpSumPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      fleetId: string;
      amountCents: number;
      paymentMethod: string;
      referenceId?: string;
      notes?: string;
    }) => invoiceService.recordFleetLumpSumPayment(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-billing-summary', variables.fleetId] });
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-ledger'] });
    },
  });
}
