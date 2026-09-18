import { MapPin, Phone, Car, UserCheck, Eye } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { useTenant } from '../../context/TenantContext';

interface JobCardProps {
  job: any;
  onViewJob: (job: any) => void;
  onAssignDriver: (job: any) => void;
}

export default function JobCard({ job, onViewJob, onAssignDriver }: JobCardProps) {
  const { currencySymbol } = useTenant();

  return (
    <div className="card-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-red-600 text-xs">{job.jobNumber}</span>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={job.urgency} />
          <StatusBadge status={job.status} />
        </div>
      </div>

      <div className="space-y-1">
        <h4 className="font-bold text-slate-900 text-sm">{job.customer?.name || 'Customer'}</h4>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <Phone className="w-3.5 h-3.5 text-slate-400" />
          <span>{job.customer?.phone}</span>
        </div>
      </div>

      <div className="p-2.5 bg-slate-50 rounded-lg text-xs space-y-1">
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <Car className="w-3.5 h-3.5 text-slate-400" />
          <span>{job.vehicle ? `${job.vehicle.year || ''} ${job.vehicle.make} ${job.vehicle.model}`.trim() : 'No Vehicle'}</span>
        </div>
        {job.vehicle?.tireSize && (
          <div className="text-[11px] font-mono text-slate-500 pl-5">
            Tire Size: {job.vehicle.tireSize}
          </div>
        )}
        {job.locationAddress && (
          <div className="flex items-start gap-1.5 text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
            <MapPin className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
            <span className="truncate">{job.locationAddress}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Price</span>
          <div className="text-base font-mono font-bold text-slate-900">
            {formatCurrency(centsToDollars(job.totalAmount), currencySymbol)}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onAssignDriver(job)}
            className="btn-secondary px-2.5 py-1.5 text-xs"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Assign</span>
          </button>
          <button
            type="button"
            onClick={() => onViewJob(job)}
            className="btn-primary px-2.5 py-1.5 text-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Details</span>
          </button>
        </div>
      </div>
    </div>
  );
}
