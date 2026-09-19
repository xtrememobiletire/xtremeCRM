import { useQuery } from '@tanstack/react-query';
import { vehicleService } from '../services/vehicleService';

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: vehicleService.getVehicles,
  });
}
