import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  History as HistoryIcon, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Car, 
  Phone, 
  Calendar,
  ChevronDown,
  Check
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { useJobs } from '../hooks/useJobs';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { formatCurrency, centsToDollars } from '../utils/currency';
import { formatDate } from '../utils/date';
import EmptyState from '../components/ui/EmptyState';

export type TimeframeFilter = 'THIS_MONTH' | 'THIS_YEAR' | 'LAST_7_DAYS' | 'TODAY' | 'LIFETIME';

const timeframeLabels: Record<TimeframeFilter, string> = {
  THIS_MONTH: 'This Month',
  THIS_YEAR: 'This Year',
  LAST_7_DAYS: 'Last 7 Days',
  TODAY: 'Today',
  LIFETIME: 'Lifetime',
};

const isWithinTimeframe = (dateStr: string | null | undefined, tf: TimeframeFilter) => {
  if (tf === 'LIFETIME') return true;
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  const now = new Date();
  if (tf === 'TODAY') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return date >= startOfToday;
  }
  if (tf === 'LAST_7_DAYS') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return date >= sevenDaysAgo;
  }
  if (tf === 'THIS_MONTH') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= startOfMonth;
  }
  if (tf === 'THIS_YEAR') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return date >= startOfYear;
  }
  return true;
};

export default function History() {
  const { user } = useAuth();
  const { currencySymbol } = useTenant();
  const isDriver = user?.role === 'DRIVER';

  const [timeframe, setTimeframe] = useState<TimeframeFilter>('THIS_MONTH');
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING_AUDIT' | 'AUDITED' | 'CANCELLED'>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: jobsResponse, isLoading, refetch } = useJobs({
    limit: 100,
    driverId: isDriver ? user?.id : undefined,
  });

  const rawJobs = jobsResponse?.data || [];
  // Scoped to driver if driver, then filter for completed or cancelled orders
  const scopedJobs = isDriver && user?.id
    ? rawJobs.filter((j: any) => j.driverId === user.id || j.driver?.id === user.id || j.lastDeclinedDriverId === user.id)
    : rawJobs;

  const getJobDate = (job: any) => job.completedAt || job.updatedAt || job.createdAt;

  const timeframeJobs = useMemo(() => {
    return scopedJobs.filter((j: any) => {
      const isDeclinedByMe = isDriver && j.lastDeclinedDriverId === user?.id;
      const isHistoryStatus = j.status === 'COMPLETED' || j.status === 'CANCELLED' || isDeclinedByMe;
      if (!isHistoryStatus) return false;
      return isWithinTimeframe(getJobDate(j), timeframe);
    });
  }, [scopedJobs, timeframe, isDriver, user?.id]);

  const isJobAudited = (job: any): boolean => {
    return Boolean(job.isAudited || job.auditedById || job.expenseStatedById);
  };

  const completedJobs = useMemo(() => {
    return timeframeJobs.filter((j: any) => j.status === 'COMPLETED');
  }, [timeframeJobs]);

  const auditedJobs = useMemo(() => {
    return completedJobs.filter((j: any) => isJobAudited(j) && (j.repairerFeeCents || 0) > 0);
  }, [completedJobs]);

  const pendingAuditJobs = useMemo(() => {
    return completedJobs.filter((j: any) => !isJobAudited(j) || !(j.repairerFeeCents && j.repairerFeeCents > 0));
  }, [completedJobs]);

  const cancelledJobs = useMemo(() => {
    return timeframeJobs.filter((j: any) => j.status === 'CANCELLED' || (isDriver && j.lastDeclinedDriverId === user?.id));
  }, [timeframeJobs, isDriver, user?.id]);

  const auditedEarnedCents = useMemo(() => {
    return auditedJobs.reduce((sum: number, j: any) => sum + (j.repairerFeeCents || 0), 0);
  }, [auditedJobs]);

  const displayedJobs = useMemo(() => {
    if (filterTab === 'PENDING_AUDIT') return pendingAuditJobs;
    if (filterTab === 'AUDITED') return auditedJobs;
    if (filterTab === 'CANCELLED') return cancelledJobs;
    return timeframeJobs;
  }, [filterTab, timeframeJobs, pendingAuditJobs, auditedJobs, cancelledJobs]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="History"
        subtitle={isDriver ? "Technician earnings audit ledger, past roadside dispatches, and proof receipts" : "View completed orders, past customer dispatches, and recorded labor compensation"}
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

      {/* Total Audited Earnings Container with Custom In-DOM Dropdown on Top Right */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs sm:text-sm font-medium text-slate-500">
            Total Audited Earnings
          </span>

          {/* Clean Custom Popover Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 transition cursor-pointer select-none"
              aria-expanded={isDropdownOpen}
            >
              <span>{timeframeLabels[timeframe]}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-xl border border-slate-200/90 shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                {(['THIS_MONTH', 'THIS_YEAR', 'LAST_7_DAYS', 'TODAY', 'LIFETIME'] as TimeframeFilter[]).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => {
                      setTimeframe(tf);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                      timeframe === tf
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>{timeframeLabels[tf]}</span>
                    {timeframe === tf && <Check className="w-3.5 h-3.5 text-slate-900" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4">
          <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(centsToDollars(auditedEarnedCents), currencySymbol)}
          </div>
          <div className="text-xs font-normal text-slate-500">
            {auditedJobs.length} audited of {completedJobs.length} completed dispatches{' '}
            {pendingAuditJobs.length > 0 && `(${pendingAuditJobs.length} awaiting audit)`}
          </div>
        </div>
      </div>

      {/* Status Drill-Down Filter Strip */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto select-none">
        <button
          type="button"
          onClick={() => setFilterTab('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            filterTab === 'ALL'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          All ({timeframeJobs.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('AUDITED')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            filterTab === 'AUDITED'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          Audited ({auditedJobs.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('PENDING_AUDIT')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            filterTab === 'PENDING_AUDIT'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          Pending Audit ({pendingAuditJobs.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('CANCELLED')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            filterTab === 'CANCELLED'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          Cancelled ({cancelledJobs.length})
        </button>
      </div>

      {/* Main Content Area: 100% Container Cards */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 h-64 animate-pulse flex items-center justify-center text-slate-400">
          Loading history records...
        </div>
      ) : displayedJobs.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No orders found"
          description={isDriver ? "No dispatches matching the selected audit criteria." : "Completed or archived roadside service orders will automatically appear here."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {displayedJobs.map((job: any) => {
            const method = job.paymentMethod || 'CASH';
            const isAudited = isJobAudited(job);
            const feeCents = job.repairerFeeCents || 0;

            return (
              <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-lg">
                      #{job.jobCode || job.jobNumber}
                    </span>
                    <span className="font-bold text-slate-800 text-xs">
                      {job.customer?.fullName || job.recipientName || 'Customer'}
                    </span>
                    {job.customer?.phone && (
                      <a href={`tel:${job.customer.phone}`} className="text-[11px] font-mono text-blue-600 hover:underline flex items-center gap-1">
                        <Phone size={10} />
                        <span>{job.customer.phone}</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar size={11} />
                      <span>{formatDate(job.completedAt || job.createdAt)}</span>
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      job.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </div>

                {/* Body: Location, Vehicle, and Payment Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Service Location</span>
                    <p className="text-slate-700 font-medium truncate mt-0.5 flex items-start gap-1" title={job.serviceAddress || 'Address on file'}>
                      <MapPin size={12} className="text-red-500 shrink-0 mt-0.5" />
                      <span className="truncate">{job.serviceAddress || 'Roadside Location'}</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Vehicle & Tire</span>
                    <p className="text-slate-800 font-semibold mt-0.5 flex items-center gap-1.5">
                      <Car size={12} className="text-slate-400 shrink-0" />
                      <span>{job.vehicle ? `${job.vehicle.year || ''} ${job.vehicle.make} ${job.vehicle.model}`.trim() : 'Standard Vehicle'}</span>
                    </p>
                    {job.vehicle?.tireSize && (
                      <span className="text-[10px] font-mono text-slate-500">
                        Tire: <strong>{job.vehicle.tireSize}</strong>
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Settlement & Method</span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        method === 'CASH'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : method === 'POS'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-purple-50 text-purple-800 border-purple-200'
                      }`}>
                        {method.replace('_', ' ')}
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {formatCurrency(centsToDollars(job.totalCents || job.cashCollectedCents || 0), currencySymbol)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer: Payout audit badge */}
                {job.status === 'COMPLETED' && (
                  <div className="pt-2 border-t border-slate-100 text-xs flex items-center justify-between">
                    {isAudited && feeCents > 0 ? (
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        <span>Job Earning: {formatCurrency(centsToDollars(feeCents), currencySymbol)} (Audited)</span>
                      </span>
                    ) : (
                      <span className="font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-flex items-center gap-1.5" title="Technician fee awaiting accountant audit">
                        <Clock size={12} className="text-slate-500" />
                        <span>Fee Pending (Awaiting Audit)</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
