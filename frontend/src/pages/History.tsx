import { useState, useMemo } from 'react';
import { 
  History as HistoryIcon, 
  RefreshCw, 
  CheckCircle2, 
  DollarSign,
  Clock,
  MapPin,
  Car,
  Eye,
  MessageSquare,
  Phone,
  Calendar,
  Image as ImageIcon,
  XCircle,
  Table as TableIcon,
  LayoutGrid
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import JobTable from '../components/jobs/JobTable';
import { useJobs } from '../hooks/useJobs';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { formatCurrency, centsToDollars } from '../utils/currency';
import { formatDate } from '../utils/date';
import JobDetailModal from '../components/pages/jobs/JobDetailModal';
import JobChatModal from '../components/dispatch/JobChatModal';
import EmptyState from '../components/ui/EmptyState';

export default function History() {
  const { user } = useAuth();
  const { currencySymbol } = useTenant();
  const isDriver = user?.role === 'DRIVER';

  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING_AUDIT' | 'AUDITED' | 'CANCELLED'>('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);
  const [chatJob, setChatJob] = useState<any>(null);

  const { data: jobsResponse, isLoading, refetch } = useJobs({
    limit: 100,
    driverId: isDriver ? user?.id : undefined,
  });

  const rawJobs = jobsResponse?.data || [];
  // Scoped to driver if driver, then filter for completed or cancelled orders
  const scopedJobs = isDriver && user?.id
    ? rawJobs.filter((j: any) => j.driverId === user.id || j.driver?.id === user.id)
    : rawJobs;

  const historyJobs = useMemo(() => {
    return scopedJobs.filter(
      (j: any) => j.status === 'COMPLETED' || j.status === 'CANCELLED'
    );
  }, [scopedJobs]);

  const isJobAudited = (job: any): boolean => {
    return Boolean(job.isAudited || job.auditedById || job.expenseStatedById);
  };

  const completedJobs = useMemo(() => {
    return historyJobs.filter((j: any) => j.status === 'COMPLETED');
  }, [historyJobs]);

  const auditedJobs = useMemo(() => {
    return completedJobs.filter((j: any) => isJobAudited(j));
  }, [completedJobs]);

  const pendingAuditJobs = useMemo(() => {
    return completedJobs.filter((j: any) => !isJobAudited(j));
  }, [completedJobs]);

  const auditedEarnedCents = useMemo(() => {
    return auditedJobs.reduce((sum: number, j: any) => sum + (j.repairerFeeCents || 0), 0);
  }, [auditedJobs]);

  const pendingAuditCents = useMemo(() => {
    return pendingAuditJobs.reduce((sum: number, j: any) => sum + (j.repairerFeeCents || 4500), 0);
  }, [pendingAuditJobs]);

  const totalEarnedCents = auditedEarnedCents + pendingAuditCents;

  const displayedJobs = useMemo(() => {
    if (!isDriver) return historyJobs;
    if (filterTab === 'PENDING_AUDIT') return pendingAuditJobs;
    if (filterTab === 'AUDITED') return auditedJobs;
    if (filterTab === 'CANCELLED') return historyJobs.filter((j: any) => j.status === 'CANCELLED');
    return historyJobs;
  }, [isDriver, filterTab, historyJobs, pendingAuditJobs, auditedJobs]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
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

      {/* Summary KPI Strip */}
      {isDriver ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Completed Orders</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-slate-900">{completedJobs.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Successfully serviced tickets</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Job Earnings</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-600">
              {formatCurrency(centsToDollars(totalEarnedCents), currencySymbol)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Combined audited & pending labor</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Audited Earnings</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-600">
              {formatCurrency(centsToDollars(auditedEarnedCents), currencySymbol)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Accountant verified • Approved</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending Audit Earnings</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-600">
              {formatCurrency(centsToDollars(pendingAuditCents), currencySymbol)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Estimated payout awaiting audit</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Completed Orders</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-slate-900">{completedJobs.length}</p>
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
      )}

      {/* Driver View Control Strip */}
      {isDriver && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer ${
                filterTab === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Records ({historyJobs.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('PENDING_AUDIT')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'PENDING_AUDIT'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100'
              }`}
            >
              <Clock size={12} />
              <span>Pending Audit ({pendingAuditJobs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('AUDITED')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'AUDITED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 size={12} />
              <span>Audited Payouts ({auditedJobs.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              className={`p-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition ${
                viewMode === 'CARDS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Cards View"
            >
              <LayoutGrid size={14} />
              <span className="hidden md:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition ${
                viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon size={14} />
              <span className="hidden md:inline">Table</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
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
      ) : isDriver && viewMode === 'CARDS' ? (
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

                {/* Footer: Payout audit badge, proof button, chat logs */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {job.status === 'COMPLETED' && (
                      isAudited ? (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span>Job Earning: {formatCurrency(centsToDollars(feeCents), currencySymbol)} (Audited)</span>
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-flex items-center gap-1.5">
                          <Clock size={12} className="text-amber-600" />
                          <span>Job Earning: {formatCurrency(centsToDollars(feeCents || 4500), currencySymbol)} (Pending Audit)</span>
                        </span>
                      )
                    )}

                    {job.receiptUrl && (
                      <button
                        type="button"
                        onClick={() => setViewingReceiptUrl(job.receiptUrl || null)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-200 transition cursor-pointer"
                        title="View Roadside Proof Slip"
                      >
                        <Eye size={12} />
                        <span>View Proof Slip</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedJob(job)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200 transition cursor-pointer"
                    >
                      <span>View Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatJob(job)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200 transition cursor-pointer"
                      title="View Chat Logs"
                    >
                      <MessageSquare size={12} />
                      <span>Chat Logs</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <JobTable
            jobs={displayedJobs}
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

      {/* Two-Way Job Chat Modal */}
      {chatJob && (
        <JobChatModal
          isOpen={!!chatJob}
          onClose={() => setChatJob(null)}
          jobId={chatJob.id}
          jobCode={chatJob.jobCode || chatJob.jobNumber}
          driverName="Dispatcher / HQ"
        />
      )}

      {/* Proof Receipt Image Preview Modal */}
      {viewingReceiptUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4" 
          onClick={() => setViewingReceiptUrl(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full p-4 space-y-3 shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ImageIcon size={16} className="text-emerald-600" />
                <span>Roadside Payment Proof Receipt</span>
              </span>
              <button 
                type="button" 
                onClick={() => setViewingReceiptUrl(null)} 
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center max-h-[70vh]">
              <img src={viewingReceiptUrl} alt="Payment Receipt" className="max-h-[65vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
