import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService, type CustomerResponse } from '../services/customerService';
import { useTenant } from '../context/TenantContext';

export function useCustomers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  countryCode?: string;
}) {
  const { country } = useTenant();
  const effectiveCountry = params?.countryCode || country;
  const effectiveParams = {
    ...params,
    countryCode: effectiveCountry,
  };

  return useQuery<CustomerResponse>({
    queryKey: ['customers', effectiveCountry, effectiveParams],
    queryFn: () => customerService.getCustomers(effectiveParams),
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
