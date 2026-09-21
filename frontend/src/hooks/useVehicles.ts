import { useQuery } from '@tanstack/react-query';
import { vehicleService } from '../services/vehicleService';
import { useTenant } from '../context/TenantContext';

export function useVehicles(params?: { countryCode?: string }) {
  const { country } = useTenant();
  const effectiveCountry = params?.countryCode || country;

  return useQuery({
    queryKey: ['vehicles', effectiveCountry],
    queryFn: () => vehicleService.getVehicles({ countryCode: effectiveCountry }),
  });
}
