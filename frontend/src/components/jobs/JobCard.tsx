import { MapPin, Phone, Car, UserCheck, Eye, MessageSquare } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { useTenant } from '../../context/TenantContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

interface JobCardProps {
  job: any;
  onViewJob: (job: any) => void;
  onAssignDriver: (job: any) => void;
}

export default function JobCard({ job, onViewJob, onAssignDriver }: JobCardProps) {
  const { user } = useAuth();
  const isDriver = user?.role === 'DRIVER';
  const { currencySymbol } = useTenant();
  const { openChatJob } = useSocket();

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
        <div className="space-y-1">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Price</span>
            <div className="text-base font-mono font-bold text-slate-900">
              {formatCurrency(centsToDollars(job.totalAmount), currencySymbol)}
            </div>
          </div>
          <div>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
              job.paymentStatus === 'VERIFIED_PAID' || job.paymentStatus === 'PAID_PENDING_VERIFICATION'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : job.paymentStatus === 'PARTIAL'
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-rose-100 text-rose-800 border border-rose-200'
            }`}>
              {job.paymentStatus === 'VERIFIED_PAID' ? '✓ Paid' :
               job.paymentStatus === 'PAID_PENDING_VERIFICATION' ? 'Paid*' :
               job.paymentStatus === 'PARTIAL' ? (
                 <>
                   <span className="text-amber-600">●</span>
                   <span>Partial</span>
                 </>
               ) :
               'Unpaid'}
            </span>
            {job.depositAmountCents > 0 && (
              <div className="text-[9px] text-emerald-600 font-mono font-semibold mt-0.5">
                {formatCurrency(centsToDollars(job.depositAmountCents), currencySymbol)} deposit
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isDriver && (
            <button
              type="button"
              onClick={() => onAssignDriver(job)}
              className="btn-secondary px-2.5 py-1.5 text-xs cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Assign</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              openChatJob({
                id: job.id,
                jobCode: job.jobCode || job.jobNumber,
                driverName: job.driver?.fullName || job.assignedDriver?.fullName || 'Technician',
              });
            }}
            className="btn-secondary px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-200"
            title="Open Chat"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Chat</span>
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
