import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, MapPin, UserCheck, MessageSquare } from 'lucide-react';
import { formatCurrency, centsToDollars } from '../../../utils/currency';
import { useTenant } from '../../../context/TenantContext';

interface UrgentQueueAccordionProps {
  urgentJobs: any[];
  onAssignDriver: (job: any) => void;
  onViewJob: (job: any) => void;
  onChatDriver?: (job: any) => void;
}

export default function UrgentQueueAccordion({
  urgentJobs,
  onAssignDriver,
  onViewJob,
  onChatDriver,
}: UrgentQueueAccordionProps) {
  const { currencySymbol } = useTenant();
  const [expandedJobId, setExpandedJobId] = useState<string | null>(urgentJobs[0]?.id || null);

  if (!urgentJobs || urgentJobs.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-50/50 border border-red-200 rounded-2xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Urgent Roadside Queue</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse">
                {urgentJobs.length} Urgent
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Immediate roadside breakdowns awaiting urgent technician arrival</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {urgentJobs.map((job) => {
          const isExpanded = expandedJobId === job.id;
          return (
            <div
              key={job.id}
              className="bg-white border border-red-100 rounded-xl overflow-hidden shadow-xs transition hover:border-red-300"
            >
              <button
                type="button"
                onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                className="w-full p-3 text-left flex items-center justify-between gap-3 bg-white hover:bg-red-50/20 transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono font-bold text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md shrink-0">
                    {job.jobNumber || job.jobCode}
                  </span>
                  <div className="truncate">
                    <span className="text-xs font-bold text-slate-800">
                      {job.customer?.fullName || job.customer?.name || job.recipientName || 'Stranded Motorist'}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-2 truncate">
                      {job.vehicle ? `${job.vehicle.year || ''} ${job.vehicle.make} ${job.vehicle.model}` : 'Vehicle'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {formatCurrency(centsToDollars(job.totalAmount ?? job.totalCents ?? 0), currencySymbol)}
                  </span>
                  {job.driver ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                      {job.driver.fullName}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Unassigned
                    </span>
                  )}
                  {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="p-3.5 bg-slate-50 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1 sm:col-span-2">
                    <div className="flex items-start gap-1.5 text-slate-700 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                      <span>{job.locationAddress || job.serviceAddress || 'Roadside breakdown'}</span>
                    </div>
                    {job.problemNotes && (
                      <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                        <strong className="text-red-700">Problem: </strong>{job.problemNotes}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="badge-brand text-[10px]">
                        Tire: {job.vehicle?.tireSize || '225/65R17'}
                      </span>
                      {job.vehicle?.licensePlate && (
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                          Plate: {job.vehicle.licensePlate}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
                    <div className="text-[11px] text-slate-500">
                      <div>Status: <strong className="text-slate-800">{job.status}</strong></div>
                      <div>Contact: <strong className="text-slate-800">{job.recipientPhone || job.customer?.phone || 'N/A'}</strong></div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onAssignDriver(job)}
                        className="btn-primary py-1.5 px-2.5 text-xs flex-1 justify-center"
                      >
                        <UserCheck size={13} />
                        <span>{job.driver ? 'Reassign' : 'Assign Driver'}</span>
                      </button>
                      {job.driver && onChatDriver && (
                        <button
                          type="button"
                          onClick={() => onChatDriver(job)}
                          className="btn-secondary py-1.5 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Chat with assigned driver"
                        >
                          <MessageSquare size={13} />
                          <span>Chat</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onViewJob(job)}
                        className="btn-secondary py-1.5 px-2.5 text-xs"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
