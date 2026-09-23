import { useState } from 'react';
import { 
  History as HistoryIcon, 
  RefreshCw, 
  MapPin, 
  Phone, 
  Car, 
  CheckCircle2, 
  DollarSign, 
  Eye, 
  Calendar,
  Navigation
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { useJobs } from '../hooks/useJobs';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { formatCurrency, centsToDollars } from '../utils/currency';
import { formatDate } from '../utils/date';
import StatusBadge from '../components/ui/StatusBadge';
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

      {/* History Grid Container */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-slate-200 p-5 h-64 animate-pulse" />
          ))}
        </div>
      ) : historyJobs.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No orders in history"
          description="Completed or archived roadside service orders will automatically appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {historyJobs.map((job: any) => {
            const isCompleted = job.status === 'COMPLETED';
            const leftLineColor = isCompleted ? 'border-l-emerald-500' : 'border-l-slate-400';
            const customerName = job.customer?.name || job.customer?.fullName || 'Walk-in Customer';
            const customerPhone = job.customer?.phone || job.contactPhone || '';
            const serviceAddress = job.serviceAddress || job.locationAddress || '';
            const vehicleText = job.vehicle ? `${job.vehicle.year || ''} ${job.vehicle.make} ${job.vehicle.model}`.trim() : 'No Vehicle';
            const tireSize = job.vehicle?.tireSize || '';

            return (
              <div 
                key={job.id}
                className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between border-l-[6px] ${leftLineColor}`}
              >
                <div className="space-y-4">
                  {/* Top Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="text-left">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {job.jobCode || job.jobNumber}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{formatDate(job.completedAt || job.updatedAt || job.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={job.urgency} />
                      <StatusBadge status={job.status} />
                    </div>
                  </div>

                  {/* Left Aligned Clean Details */}
                  <div className="space-y-3 text-left">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Customer</span>
                      <p className="text-sm font-bold text-slate-900">{customerName}</p>
                      {customerPhone && (
                        <a 
                          href={`tel:${customerPhone}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 font-mono mt-0.5"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{customerPhone}</span>
                        </a>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Vehicle & Tire</span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold mt-0.5">
                        <Car className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{vehicleText}</span>
                      </div>
                      {tireSize && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 border border-slate-200/80 rounded font-mono text-[11px] font-bold text-slate-700">
                          {tireSize}
                        </span>
                      )}
                    </div>

                    {serviceAddress && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Service Location</span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(serviceAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-1.5 text-xs text-slate-700 hover:text-blue-600 mt-0.5"
                        >
                          <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-relaxed">{serviceAddress}</span>
                          <Navigation className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Strip: Financials & Action */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Your Labor Earned</span>
                    <span className="text-sm font-mono font-black text-emerald-600">
                      {formatCurrency(centsToDollars(job.repairerFeeCents || 0), currencySymbol)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedJob(job)}
                    className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            );
          })}
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
