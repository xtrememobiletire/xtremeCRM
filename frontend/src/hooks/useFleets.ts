import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fleetService } from '../services/fleetService';
import { useTenant } from '../context/TenantContext';

export function useFleets(params?: { countryCode?: string; status?: string; search?: string }) {
  const { country } = useTenant();
  const effectiveCountry = params?.countryCode || country;

  return useQuery({
    queryKey: ['fleets', effectiveCountry, params?.status, params?.search],
    queryFn: () =>
      fleetService.getFleets({
        countryCode: effectiveCountry,
        status: params?.status,
        search: params?.search,
      }),
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

export function useApproveFleet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fleetService.approveFleet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
    },
  });
}

export function useUpdateFleet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => fleetService.updateFleet(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
    },
  });
}

export function useDeleteFleet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fleetService.deleteFleet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
    },
  });
}
