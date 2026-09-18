import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService, type CustomerResponse } from '../services/customerService';

export function useCustomers(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery<CustomerResponse>({
    queryKey: ['customers', params],
    queryFn: () => customerService.getCustomers(params),
    staleTime: 10000,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => customerService.createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
