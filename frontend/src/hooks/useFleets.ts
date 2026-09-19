import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fleetService } from '../services/fleetService';

export function useFleets() {
  return useQuery({
    queryKey: ['fleets'],
    queryFn: fleetService.getFleets,
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
