import { MapPin, Phone, Car, UserCheck, Eye, MessageSquare, Clock, Zap } from 'lucide-react';
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
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-red-600 text-xs">{job.jobNumber}</span>
          {(job as any).isTestService && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
              TRIAL RUN
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={job.urgency} />
          <StatusBadge status={job.status} />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <h4 className="font-bold text-slate-900 text-sm">
            {(job as any).lead?.companyName || job.customer?.fullName || job.customer?.name || job.recipientName || 'Customer'}
          </h4>
          {(job as any).isTestService && (
            <span className="px-1 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Prospect
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <Phone className="w-3.5 h-3.5 text-slate-400" />
          <span>{(job as any).lead?.phone || job.customer?.phone || job.recipientPhone}</span>
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
        {(job.serviceAddress || job.locationAddress) && (
          <div className="flex items-start gap-1.5 text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
            <MapPin className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
            <span className="truncate">{job.serviceAddress || job.locationAddress}</span>
          </div>
        )}
      </div>

      {/* Timing Commitment & Driver ETA */}
      {(job.arrivalWindowStart || job.estimatedArrivalAt || job.driverEstimatedArrivalAt || job.driverEtaMinutes) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
          {job.arrivalWindowStart && job.arrivalWindowEnd ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-semibold border border-blue-200" title="Customer Promised Window">
              <Clock className="w-3 h-3 text-blue-600" />
              <span>
                Window: {new Date(job.arrivalWindowStart).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – {new Date(job.arrivalWindowEnd).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            </span>
          ) : job.estimatedArrivalAt ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-semibold border border-blue-200" title="Customer Promised ETA">
              <Clock className="w-3 h-3 text-blue-600" />
              <span>Promised ~{new Date(job.estimatedArrivalAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            </span>
          ) : null}

          {(job.driverEstimatedArrivalAt || job.driverEtaMinutes) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200" title="Technician Driving ETA">
              <Zap className="w-3 h-3 text-emerald-600" />
              <span>
                Tech ETA: {job.driverEtaMinutes ? `~${job.driverEtaMinutes}m` : new Date(job.driverEstimatedArrivalAt!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Price</span>
          <div className="text-base font-mono font-bold text-slate-900">
            {(job as any).isTestService && (centsToDollars(job.totalAmount) === 0 || Number(job.totalAmount) === 0) ? (
              <span className="text-emerald-700 text-xs font-bold">$0.00 (Complimentary)</span>
            ) : (
              formatCurrency(centsToDollars(job.totalAmount), currencySymbol)
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
