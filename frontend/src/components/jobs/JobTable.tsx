import { Eye, UserCheck, AlertCircle } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { useTenant } from '../../context/TenantContext';

interface JobTableProps {
  jobs: any[];
  onViewJob: (job: any) => void;
  onAssignDriver: (job: any) => void;
}

export default function JobTable({ jobs, onViewJob, onAssignDriver }: JobTableProps) {
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
            <th className="table-th">Driver Assigned</th>
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
                <div className="font-mono font-bold text-red-600 text-xs">{job.jobNumber}</div>
                <div className="text-[11px] text-slate-400">{formatDate(job.createdAt)}</div>
              </td>
              <td className="table-td">
                <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                  {job.customer?.name || 'Walk-in'}
                </div>
                <div className="text-[11px] font-mono text-slate-500">{job.customer?.phone}</div>
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
              <td className="table-td whitespace-nowrap">
                {job.driver ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{job.driver.firstName} {job.driver.lastName}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAssignDriver(job)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition"
                  >
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                    <span>Assign</span>
                  </button>
                )}
              </td>
              <td className="table-td whitespace-nowrap">
                <StatusBadge status={job.status} />
              </td>
              <td className="table-td whitespace-nowrap">
                <StatusBadge status={job.urgency} />
              </td>
              <td className="table-td text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                {formatCurrency(centsToDollars(job.totalAmount), currencySymbol)}
              </td>
              <td className="table-td text-center whitespace-nowrap">
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => onViewJob(job)}
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="View Job Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAssignDriver(job)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Assign / Reassign Driver"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
