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

export function useAccountingSummary(params?: { timeframe?: string; startDate?: string; endDate?: string }) {
  const { country } = useTenant();

  return useQuery({
    queryKey: ['accounting-summary', country, params?.timeframe, params?.startDate, params?.endDate],
    queryFn: () => accountingService.getAccountingSummary({
      countryCode: country,
      timeframe: params?.timeframe,
    }),
  });
}

export function useReconciliationJobs(params?: {
  timeframe?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const { country } = useTenant();

  return useQuery({
    queryKey: ['reconciliation-jobs', country, params?.timeframe, params?.search, params?.page],
    queryFn: () =>
      accountingService.getReconciliationJobs({
        countryCode: country,
        timeframe: params?.timeframe,
        search: params?.search,
        startDate: params?.startDate,
        endDate: params?.endDate,
        page: params?.page,
        limit: params?.limit,
      }),
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
