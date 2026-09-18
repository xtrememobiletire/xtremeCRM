import { Truck, MapPin } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

interface DriverCardProps {
  driver: {
    id: string;
    name: string;
    phone: string;
    status: string;
    vehicle: string;
    currentJob?: string;
    location?: string;
    batteryLevel?: number;
    cashCollectedCents?: number;
  };
  onSelect?: () => void;
}

export default function DriverCard({ driver, onSelect }: DriverCardProps) {
  return (
    <div 
      onClick={onSelect}
      className="card-surface p-4 space-y-3 cursor-pointer hover:border-red-400 transition"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
            <Truck size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">{driver.name}</h4>
            <p className="text-[11px] text-slate-500 font-mono">{driver.phone}</p>
          </div>
        </div>
        <StatusBadge status={driver.status} />
      </div>

      <div className="text-xs bg-slate-50 p-2 rounded-lg space-y-1">
        <div className="flex justify-between text-slate-600">
          <span>Assigned Rig:</span>
          <strong className="text-slate-800">{driver.vehicle}</strong>
        </div>
        {driver.currentJob && (
          <div className="flex justify-between text-slate-600 border-t border-slate-200/60 pt-1">
            <span>Active Job:</span>
            <strong className="text-red-600 font-mono">{driver.currentJob}</strong>
          </div>
        )}
      </div>

      {driver.location && (
        <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
          <MapPin size={12} className="text-red-500 shrink-0" />
          <span className="truncate">{driver.location}</span>
        </div>
      )}
    </div>
  );
}
