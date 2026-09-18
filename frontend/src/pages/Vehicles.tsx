import { useState } from 'react';
import { Car, Search } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import VehicleTable from '../components/pages/vehicles/VehicleTable';
import EmptyState from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import { useVehicles } from '../hooks/useVehicles';

export default function Vehicles() {
  const [search, setSearch] = useState('');
  const { data: vehiclesResponse, isLoading } = useVehicles();

  const vehicles = (vehiclesResponse?.data || []).filter((v: any) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      v.make?.toLowerCase().includes(query) ||
      v.model?.toLowerCase().includes(query) ||
      v.licensePlate?.toLowerCase().includes(query) ||
      v.tireSize?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vehicle & Tire Specification Database"
        subtitle="Historical tire sizes, wheel bolt patterns, and service records per VIN/Plate"
      />

      <div className="card-surface p-3 flex items-center">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by license plate, make, model, or tire size (e.g. 225/65R17)..."
            className="input-base pl-8 py-1.5 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No vehicles found"
          description="Vehicles are automatically cataloged during job intakes or fleet onboarding."
        />
      ) : (
        <VehicleTable vehicles={vehicles} />
      )}
    </div>
  );
}
