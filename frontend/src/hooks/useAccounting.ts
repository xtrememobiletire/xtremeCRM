import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingService } from '../services/accountingService';

export function useAccounting() {
  const queryClient = useQueryClient();

  const invoicesQuery = useQuery({
    queryKey: ['invoices'],
    queryFn: accountingService.getInvoices,
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

export function useAccountingSummary() {
  return useQuery({
    queryKey: ['accounting-summary'],
    queryFn: async () => {
      return {
        grossRevenueCents: 138000,
        directCostCents: 48500,
        netProfitCents: 89500,
      };
    },
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
