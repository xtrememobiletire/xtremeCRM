import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fleetService } from '../services/fleetService';
import { useTenant } from '../context/TenantContext';

export function useFleets(params?: { countryCode?: string }) {
  const { country } = useTenant();
  const effectiveCountry = params?.countryCode || country;

  return useQuery({
    queryKey: ['fleets', effectiveCountry],
    queryFn: () => fleetService.getFleets({ countryCode: effectiveCountry }),
  });
}

export function useCreateFleet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => fleetService.createFleet(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
    },
  });
}
