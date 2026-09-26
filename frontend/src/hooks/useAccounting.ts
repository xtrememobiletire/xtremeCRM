import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingService } from '../services/accountingService';
import { useTenant } from '../context/TenantContext';

export function useAccounting() {
  const queryClient = useQueryClient();
  const { country } = useTenant();

  const invoicesQuery = useQuery({
    queryKey: ['invoices', country],
    queryFn: () => accountingService.getInvoices({ countryCode: country }),
  });

  const stateExpensesMutation = useMutation({
    mutationFn: accountingService.stateJobExpenses,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
    },
  });

  return {
    invoices: invoicesQuery.data || [],
    isLoadingInvoices: invoicesQuery.isLoading,
    stateExpenses: stateExpensesMutation.mutateAsync,
    isStatingExpenses: stateExpensesMutation.isPending,
  };
}

export function useAccountingSummary(params?: { countryCode?: string; timeframe?: string; startDate?: string; endDate?: string }) {
  const { country } = useTenant();
  const effectiveCountry = params?.countryCode || country;

  return useQuery({
    queryKey: ['accounting-summary', effectiveCountry, params?.timeframe, params?.startDate, params?.endDate],
    queryFn: () => accountingService.getAccountingSummary({
      countryCode: effectiveCountry,
      timeframe: params?.timeframe,
    }),
  });
}

export function useReconciliationJobs(params?: {
  countryCode?: string;
  timeframe?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const { country } = useTenant();
  const effectiveCountry = params?.countryCode || country;

  return useQuery({
    queryKey: ['reconciliation-jobs', effectiveCountry, params?.timeframe, params?.search, params?.page],
    queryFn: () =>
      accountingService.getReconciliationJobs({
        countryCode: effectiveCountry,
        status: 'COMPLETED',
        timeframe: params?.timeframe,
        search: params?.search,
        startDate: params?.startDate,
        endDate: params?.endDate,
        page: params?.page,
        limit: params?.limit,
      }),
  });
}

export function useDeveloperProfit() {
  return useQuery({
    queryKey: ['developer-profit'],
    queryFn: () => accountingService.getDeveloperProfit(),
    staleTime: 10000,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => accountingService.stateJobExpenses(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useVerifyJobPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => accountingService.verifyJobPayment(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['cash-ledger'] });
    },
  });
}
