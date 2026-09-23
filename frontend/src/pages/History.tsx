import { useState } from 'react';
import { 
  History as HistoryIcon, 
  RefreshCw, 
  CheckCircle2, 
  DollarSign
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import JobTable from '../components/jobs/JobTable';
import { useJobs } from '../hooks/useJobs';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { formatCurrency, centsToDollars } from '../utils/currency';
import JobDetailModal from '../components/pages/jobs/JobDetailModal';
import EmptyState from '../components/ui/EmptyState';

export default function History() {
  const { user } = useAuth();
  const { currencySymbol } = useTenant();
  const isDriver = user?.role === 'DRIVER';

  const [selectedJob, setSelectedJob] = useState<any>(null);

  const { data: jobsResponse, isLoading, refetch } = useJobs({
    limit: 100,
    driverId: isDriver ? user?.id : undefined,
  });

  const rawJobs = jobsResponse?.data || [];
  // Scoped to driver if driver, then filter for completed or cancelled orders
  const scopedJobs = isDriver && user?.id
    ? rawJobs.filter((j: any) => j.driverId === user.id || j.driver?.id === user.id)
    : rawJobs;

  const historyJobs = scopedJobs.filter(
    (j: any) => j.status === 'COMPLETED' || j.status === 'CANCELLED'
  );

  // Calculate total earnings from completed jobs for driver
  const totalEarnedCents = historyJobs
    .filter((j: any) => j.status === 'COMPLETED')
    .reduce((sum: number, j: any) => sum + (j.repairerFeeCents || 0), 0);

  const completedCount = historyJobs.filter((j: any) => j.status === 'COMPLETED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="History"
        subtitle="View completed orders, past customer dispatches, and recorded labor compensation"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="btn-secondary px-3 py-2 cursor-pointer"
              title="Refresh history"
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed Orders</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{completedCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">Successfully serviced tickets</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Labor Earned</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">
            {formatCurrency(centsToDollars(totalEarnedCents), currencySymbol)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Technician direct labor compensation</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total History Records</span>
            <HistoryIcon className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{historyJobs.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Archived work orders</p>
        </div>
      </div>

      {/* History Table in Previous Shape */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 h-64 animate-pulse flex items-center justify-center text-slate-400">
          Loading history records...
        </div>
      ) : historyJobs.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No orders in history"
          description="Completed or archived roadside service orders will automatically appear here."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <JobTable
            jobs={historyJobs}
            onViewJob={setSelectedJob}
            onAssignDriver={() => {}}
          />
        </div>
      )}

      {/* Ticket Detail Modal */}
      <JobDetailModal
        isOpen={Boolean(selectedJob)}
        onClose={() => setSelectedJob(null)}
        job={selectedJob}
      />
    </div>
  );
}
