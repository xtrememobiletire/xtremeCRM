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
    staleTime: 60000,
    placeholderData: (previousData, previousQuery) => {
      if (previousQuery?.queryKey?.[1] !== effectiveCountry) {
        return undefined;
      }
      return previousData;
    },
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

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => customerService.updateCustomer(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
