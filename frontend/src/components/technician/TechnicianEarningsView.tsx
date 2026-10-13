import { DollarSign, Calendar, ExternalLink } from 'lucide-react';
import { formatCurrency, centsToDollars } from '../../utils/currency';

interface TechnicianEarningsViewProps {
  completedJobs: any[];
  currencySymbol: string;
}

export default function TechnicianEarningsView({
  completedJobs,
  currencySymbol,
}: TechnicianEarningsViewProps) {
  // Total technician earnings: strictly audited/stated repairerFeeCents only
  const totalEarnedDollars = completedJobs.reduce((sum, j) => {
    const fee = j.repairerFeeCents ? centsToDollars(j.repairerFeeCents) : 0;
    return sum + fee;
  }, 0);

  const auditedCount = completedJobs.filter((j) => Boolean(j.repairerFeeCents && j.repairerFeeCents > 0)).length;

  return (
    <div className="space-y-4">
      {/* Minimal Slim Earnings Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-normal text-slate-600">Total Earnings:</span>
          <span className="text-sm font-medium text-slate-900">
            {formatCurrency(totalEarnedDollars, currencySymbol)}
          </span>
        </div>
        <div className="text-xs font-normal text-slate-500">
          {auditedCount} audited of {completedJobs.length} completed
        </div>
      </div>

      {/* Completed Jobs Cards */}
      {completedJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <DollarSign className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No completed jobs yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Completed jobs will appear here with your earned fees and payment records.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {completedJobs.map((job) => {
            const hasFee = Boolean(job.repairerFeeCents && job.repairerFeeCents > 0);
            const feeDollars = hasFee ? centsToDollars(job.repairerFeeCents) : 0;
            const completedDate = job.completedAt
              ? new Date(job.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
              : job.updatedAt
              ? new Date(job.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
              : 'Completed';

            return (
              <div
                key={job.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between gap-3 hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      #{job.jobCode || job.jobNumber}
                    </span>
                    {hasFee ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        +{formatCurrency(feeDollars, currencySymbol)}
                      </span>
                    ) : (
                      <span 
                        className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200"
                        title="Technician fee not yet stated by accountant"
                      >
                        Pending Audit
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 space-y-1">
                    <div className="text-xs font-bold text-slate-900">
                      {job.customer?.fullName || job.customer?.name || job.recipientName || 'Walk-in'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {job.serviceAddress}
                    </div>
                    {job.vehicle && (
                      <div className="text-[11px] text-slate-600 font-medium">
                        {job.vehicle.year || ''} {job.vehicle.make} {job.vehicle.model}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{completedDate}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {job.paymentMethod && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {job.paymentMethod.replace('_', ' ')}
                      </span>
                    )}
                    {job.receiptUrl && (
                      <a
                        href={job.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-500 hover:text-slate-900 transition"
                        title="View payment receipt slip"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
