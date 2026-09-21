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
    },
  });

  return {
    invoices: invoicesQuery.data || [],
    isLoadingInvoices: invoicesQuery.isLoading,
    stateExpenses: stateExpensesMutation.mutateAsync,
    isStatingExpenses: stateExpensesMutation.isPending,
  };
}

export function useAccountingSummary(params?: { timeframe?: string }) {
  const { country } = useTenant();

  return useQuery({
    queryKey: ['accounting-summary', country, params?.timeframe],
    queryFn: () => accountingService.getAccountingSummary({
      countryCode: country,
      timeframe: params?.timeframe,
    }),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => accountingService.stateJobExpenses(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}
