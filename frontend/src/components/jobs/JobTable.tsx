import { Eye, UserCheck, AlertCircle, Clock, Zap, XCircle, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from '../ui/StatusBadge';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { formatDate, formatJobWindowDual, resolveJobTimezone, formatTimeInTz } from '../../utils/date';
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

/**
 * Render job rows with driver/decline details and detail/assignment callbacks,
 * or nothing for an empty list. Drivers do not see assignment controls;
 * completed/cancelled jobs have assignment disabled.
 */
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
          {jobs.map((job) => {
            const jobTz = resolveJobTimezone(job);
            const windowInfo = (job.arrivalWindowStart || job.estimatedArrivalAt)
              ? formatJobWindowDual(job.arrivalWindowStart || job.estimatedArrivalAt, job.arrivalWindowEnd, jobTz)
              : null;

            return (
              <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="table-td whitespace-nowrap">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono font-bold text-red-600 text-xs">{job.jobNumber}</span>
                    {(job as any).isTestService && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                        ⚡ TRIAL RUN
                      </span>
                    )}
                    {((job as any).source === 'MEMBER_PORTAL' || (job as any).customer?.customerType === 'MEMBERSHIP') && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300">
                        👑 VIP MEMBER
                      </span>
                    )}
                    {((job as any).fleet || (job as any).fleetId) && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                        🏢 {(job as any).fleet?.fleetCode || 'FLEET'}
                      </span>
                    )}
                    {((job as any).source === 'WEBSITE' || (job as any).source === 'LANDING_PAGE_SELF_BOOK') && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
                        🌐 WEB
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{formatDate(job.createdAt)}</div>
                  {windowInfo && (
                    <div className="mt-1 space-y-0.5">
                      <div className="text-[10px] text-blue-700 font-bold flex items-center gap-1" title={`Customer Local Promised Window (${jobTz})`}>
                        <Clock className="w-2.5 h-2.5 shrink-0 text-blue-600" />
                        <span>{windowInfo.customerWindow}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono flex items-center gap-1 pl-3.5 flex-wrap">
                        <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-medium" title="Pakistan Shift Time">
                          {windowInfo.pktWindow}
                        </span>
                        {windowInfo.statusBadge && (
                          <span className={`px-1 py-0.2 rounded font-bold ${windowInfo.isOverdue ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700'}`}>
                            • {windowInfo.statusBadge}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
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
                    <div className="font-semibold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                      <span>{job.fleet?.name || job.customer?.fullName || job.customer?.name || job.recipientName || 'Walk-in'}</span>
                      {job.customer?.customerType === 'MEMBERSHIP' && (
                        <span className="px-1 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {job.customer.membershipTier || 'Gold'}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {job.fleet && job.recipientName ? `${job.recipientName} • ` : ''}
                      {job.customer?.phone || job.recipientPhone || ''}
                    </div>
                  </>
                )}
              </td>
              <td className="table-td">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {job.vehicle?.licensePlate && (
                    <span className="font-mono font-bold px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-800">
                      {job.vehicle.licensePlate}
                    </span>
                  )}
                  {job.vehicle?.unitNumber && (
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                      U-{job.vehicle.unitNumber}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-slate-800">
                    {job.vehicle ? `${job.vehicle.year || ''} ${job.vehicle.make} ${job.vehicle.model}`.trim() : (job.vehicleMakeModel || 'N/A')}
                  </span>
                </div>
                {job.vehicle?.tireSize && (
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-red-50 border border-red-100 rounded text-[10px] font-mono font-semibold text-red-700">
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
                                <span className="inline-flex items-center gap-1.5 flex-wrap">
                                  {job.externalDispatchToken ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const url = `${window.location.origin}/dispatch/external/${job.externalDispatchToken}`;
                                        navigator.clipboard.writeText(url).then(() => {
                                          toast.success('External dispatch link copied to clipboard');
                                        }).catch(() => {
                                          toast.error('Failed to copy link');
                                        });
                                      }}
                                      title="Click to copy External Contractor portal link"
                                      className="text-[9px] font-black text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-900 px-1.5 py-0.5 rounded border border-blue-200 inline-flex items-center gap-1 cursor-pointer transition shadow-2xs"
                                    >
                                      <span>EXT</span>
                                      <Copy className="w-2.5 h-2.5 text-blue-600" />
                                    </button>
                                  ) : (
                                    <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">EXT</span>
                                  )}
                                  <strong className="text-slate-900">{job.externalCompanyName || job.driver?.fullName || 'Contractor'}</strong>
                                  {job.externalDispatchToken && (
                                    <a
                                      href={`/dispatch/external/${job.externalDispatchToken}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      title="Open External Contractor Portal"
                                      className="text-slate-400 hover:text-blue-600 transition p-0.5"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
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
                                {job.driverEtaMinutes && job.driverEtaMinutes <= 180
                                  ? `Drive ETA: ~${job.driverEtaMinutes}m`
                                  : job.driverEtaMinutes
                                  ? `Out of Region (~${Math.round(job.driverEtaMinutes * 0.75)} km)`
                                  : `Arrives ~${formatTimeInTz(job.driverEstimatedArrivalAt, jobTz)}`}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
