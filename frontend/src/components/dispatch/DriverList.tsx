import { Search } from 'lucide-react';
import DriverCard from './DriverCard';

interface DriverListProps {
  drivers: any[];
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onSelectDriver?: (driver: any) => void;
}

export default function DriverList({
  drivers,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onSelectDriver,
}: DriverListProps) {
  return (
    <div className="space-y-3">
      <div className="card-surface p-3 flex flex-col sm:flex-row gap-2 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search drivers by name or van..."
            className="input-base pl-8 py-1.5 text-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="select-base py-1.5 text-xs w-full sm:w-auto"
        >
          <option value="">All Driver States</option>
          <option value="AVAILABLE">Available</option>
          <option value="BUSY">Busy</option>
          <option value="OFFLINE">Offline</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {drivers.map((drv) => (
          <DriverCard
            key={drv.id}
            driver={drv}
            onSelect={() => onSelectDriver?.(drv)}
          />
        ))}
      </div>
    </div>
  );
}
