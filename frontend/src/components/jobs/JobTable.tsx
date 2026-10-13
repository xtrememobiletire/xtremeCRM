import { Eye, UserCheck, AlertCircle, Clock, Zap, XCircle } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';

const formatDeclineReason = (reason?: string) => {
  if (!reason) return 'Declined';
  const clean = reason.replace(/^DECLINED_/, '').toUpperCase();
  if (clean === 'BUSY') return 'Busy';
  if (clean === 'OUT_OF_AREA') return 'Out of Area';
  return 'Other';
};

interface JobTableProps {
  jobs: any[];
  onViewJob: (job: any) => void;
  onAssignDriver: (job: any) => void;
}

export default function JobTable({ jobs, onViewJob, onAssignDriver }: JobTableProps) {
  const { user } = useAuth();
  const isDriver = user?.role === 'DRIVER';
  const { currencySymbol } = useTenant();

  if (!jobs || jobs.length === 0) {
    return null;
  }

  return (
    <div className="table-container">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className="table-th">Job # / Date</th>
            <th className="table-th">Customer</th>
            <th className="table-th">Vehicle & Tire</th>
            {!isDriver && <th className="table-th">Driver Assigned</th>}
            <th className="table-th">Status</th>
            <th className="table-th">Urgency</th>
            <th className="table-th text-right">Total</th>
            <th className="table-th text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="table-td whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-red-600 text-xs">{job.jobNumber}</span>
                  {(job as any).isTestService && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                      TRIAL RUN
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">{formatDate(job.createdAt)}</div>
                {job.arrivalWindowStart && job.arrivalWindowEnd ? (
                  <div className="text-[10px] text-blue-700 font-semibold flex items-center gap-1 mt-0.5" title="Customer Promised Window">
                    <Clock className="w-2.5 h-2.5 shrink-0" />
                    <span>{new Date(job.arrivalWindowStart).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – {new Date(job.arrivalWindowEnd).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                ) : job.estimatedArrivalAt ? (
                  <div className="text-[10px] text-blue-700 font-semibold flex items-center gap-1 mt-0.5" title="Customer Promised ETA">
                    <Clock className="w-2.5 h-2.5 shrink-0" />
                    <span>Promised ~{new Date(job.estimatedArrivalAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                ) : null}
              </td>
              <td className="table-td">
                {(job as any).isTestService && (job as any).lead?.companyName ? (
                  <div>
                    <div className="font-semibold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                      <span>{(job as any).lead.companyName}</span>
                      <span className="px-1 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Prospect
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {(job as any).lead.contactPerson ? `${(job as any).lead.contactPerson} • ` : ''}
                      {(job as any).lead.phone || job.recipientPhone || ''}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                      {job.customer?.fullName || job.customer?.name || job.recipientName || 'Walk-in'}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {job.customer?.phone || job.recipientPhone || ''}
                    </div>
                  </>
                )}
              </td>
              <td className="table-td">
                <div className="text-xs font-semibold text-slate-800">
                  {job.vehicle ? `${job.vehicle.year || ''} ${job.vehicle.make} ${job.vehicle.model}`.trim() : 'N/A'}
                </div>
                {job.vehicle?.tireSize && (
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-600">
                    {job.vehicle.tireSize}
                  </span>
                )}
              </td>
              {!isDriver && (
                <td className="table-td whitespace-nowrap">
                  {(() => {
                    const isCompleted = job.status === 'COMPLETED' || job.status === 'CANCELLED';
                    const isExternalJob = job.driverType === 'EXTERNAL' || Boolean(job.externalDispatchToken);
                    const hasActiveDriver = (job.driver || job.assignedDriver || (job.driverId && isExternalJob)) && job.externalDispatchStatus !== 'DENIED';

                    if (hasActiveDriver) {
                      return (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isExternalJob ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                            <span className="truncate max-w-[170px]">
                              {isExternalJob ? (
                                <span className="inline-flex items-center gap-1">
                                  <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">EXT</span>
                                  <strong className="text-slate-900">{job.externalCompanyName || job.driver?.fullName || 'Contractor'}</strong>
                                </span>
                              ) : (
                                job.driver?.fullName || 
                                job.assignedDriver?.fullName || 
                                `${job.driver?.firstName || ''} ${job.driver?.lastName || ''}`.trim() || 
                                'Assigned Technician'
                              )}
                            </span>
                          </div>
                          {(job.driverEtaMinutes || job.driverEstimatedArrivalAt) && (
                            <div className="text-[10px] font-mono text-emerald-700 font-semibold flex items-center gap-1 pl-3" title="Technician Driving ETA">
                              <Zap className="w-2.5 h-2.5 text-emerald-600" />
                              <span>
                                {job.driverEtaMinutes ? `Drive ETA: ~${job.driverEtaMinutes}m` : `Arrives ~${new Date(job.driverEstimatedArrivalAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (isCompleted) {
                      return (
                        <span className="text-xs text-slate-400 italic">
                          {job.driver?.fullName || job.assignedDriver?.fullName || 'Unassigned'}
                        </span>
                      );
                    }

                    return (
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => onAssignDriver(job)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                        >
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                          <span>Assign</span>
                        </button>
                        {(job.driverDeclineReason || job.externalDispatchStatus === 'DENIED') && (
                          <div>
                            <button
                              type="button"
                              onClick={() => onViewJob(job)}
                              title={`Declined by ${job.lastDeclinedDriver?.fullName || job.externalCompanyName || 'Contractor'} • Reason: ${formatDeclineReason(job.driverDeclineReason || 'Declined')} (Click to view)`}
                              className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 inline-flex items-center gap-1 hover:bg-rose-100 cursor-pointer transition shadow-2xs"
                            >
                              <XCircle className="w-2.5 h-2.5 text-rose-500" />
                              <span>
                                {job.lastDeclinedDriver?.fullName ? `${job.lastDeclinedDriver.fullName.split(' ')[0]}: ` : job.externalCompanyName ? `${job.externalCompanyName}: ` : ''}
                                {formatDeclineReason(job.driverDeclineReason || 'Declined')}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </td>
              )}
              <td className="table-td whitespace-nowrap">
                {(() => {
                  const showDecline = Boolean(job.driverDeclineReason) || job.externalDispatchStatus === 'DENIED';

                  return (
                    <StatusBadge 
                      status={showDecline ? 'DECLINED' : job.status} 
                      label={showDecline ? `Declined (${formatDeclineReason(job.driverDeclineReason || 'Declined')})` : undefined}
                      title={
                        showDecline
                          ? `Declined by ${job.lastDeclinedDriver?.fullName || job.externalCompanyName || 'Contractor'} • Reason: ${formatDeclineReason(job.driverDeclineReason || 'Declined')} (Click to view)`
                          : job.status === 'CANCELLED'
                          ? 'Cancelled work order (Click to view)'
                          : undefined
                      }
                      onClick={showDecline || job.status === 'CANCELLED' ? () => onViewJob(job) : undefined}
                    />
                  );
                })()}
              </td>
              <td className="table-td whitespace-nowrap">
                <StatusBadge status={job.urgency} />
              </td>
              <td className="table-td text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                {(job as any).isTestService && (centsToDollars(job.totalAmount) === 0 || Number(job.totalAmount) === 0) ? (
                  <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    $0.00 (Complimentary)
                  </span>
                ) : (
                  formatCurrency(centsToDollars(job.totalAmount), currencySymbol)
                )}
              </td>
              <td className="table-td text-center whitespace-nowrap">
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => onViewJob(job)}
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="View Job Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {!isDriver && (
                    <button
                      type="button"
                      disabled={job.status === 'COMPLETED' || job.status === 'CANCELLED'}
                      onClick={() => onAssignDriver(job)}
                      className={`p-1.5 rounded-lg transition ${
                        job.status === 'COMPLETED' || job.status === 'CANCELLED'
                          ? 'text-slate-300 cursor-not-allowed opacity-50'
                          : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer'
                      }`}
                      title={
                        job.status === 'COMPLETED'
                          ? 'Job completed • Driver assignment locked'
                          : job.status === 'CANCELLED'
                          ? 'Job cancelled • Driver assignment locked'
                          : 'Assign / Reassign Driver'
                      }
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
