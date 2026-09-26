import { useState, useEffect } from 'react';
import { 
  MapPin, 
  Phone, 
  Navigation, 
  MessageSquare, 
  CheckCircle, 
  Disc, 
  ExternalLink, 
  XCircle,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { jobService, type JobItem } from '../services/jobService';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { formatCurrency, centsToDollars } from '../utils/currency';
import { formatDate } from '../utils/date';
import { toast } from 'sonner';
import JobChatModal from '../components/dispatch/JobChatModal';
import { useUpdateJobStatus } from '../hooks/useJobs';
import { useSocket } from '../context/SocketContext';

export default function TechnicianPortal() {
  const { user } = useAuth();
  const { country, currencySymbol } = useTenant();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [chatJob, setChatJob] = useState<JobItem | null>(null);
  const [cashAmountInput, setCashAmountInput] = useState('');
  const [cashValidationError, setCashValidationError] = useState<string | null>(null);

  const { socket } = useSocket();
  const updateStatusMutation = useUpdateJobStatus();

  // Fetch driver assigned jobs - strictly scoped to this driver without country restriction or background polling
  const { data: jobsResponse, refetch } = useQuery({
    queryKey: ['technician-jobs', user?.id],
    queryFn: () => jobService.getJobs({ limit: 10, driverId: user?.id }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // Socket.io instant sync for driver jobs
  useEffect(() => {
    if (!socket) return;
    const handleJobUpdate = () => refetch();
    socket.on('job:assigned', handleJobUpdate);
    socket.on('job:status_updated', handleJobUpdate);
    socket.on('notification:job_assigned', handleJobUpdate);
    return () => {
      socket.off('job:assigned', handleJobUpdate);
      socket.off('job:status_updated', handleJobUpdate);
      socket.off('notification:job_assigned', handleJobUpdate);
    };
  }, [socket, refetch]);

  const rawJobs = jobsResponse?.data || [];
  // Strict driver isolation: only show jobs where driverId matches current user ID
  const jobs = user?.id
    ? rawJobs.filter((j: any) => j.driverId === user.id || j.driver?.id === user.id)
    : rawJobs;

  // Categorize jobs
  const activeJob = jobs.find(
    (j) => j.status === 'ASSIGNED' || j.status === 'EN_ROUTE' || j.status === 'IN_PROGRESS' || j.status === 'PENDING'
  );
  const completedJobs = jobs.filter((j) => j.status === 'COMPLETED');

  // Pre-fill cash input if job already has charges
  useEffect(() => {
    if (activeJob && (activeJob.status === 'IN_PROGRESS' || activeJob.status === 'EN_ROUTE')) {
      if (!cashAmountInput && activeJob.totalCents && activeJob.totalCents > 0) {
        setCashAmountInput(centsToDollars(activeJob.totalCents).toFixed(2));
      }
    }
  }, [activeJob?.id, activeJob?.status]);

  const handleUpdateStatus = (jobId: string, nextStatus: string, cashAmountCents?: number) => {
    setUpdatingId(jobId);
    updateStatusMutation.mutate(
      { id: jobId, status: nextStatus, cashAmountCents },
      {
        onSuccess: () => {
          toast.success(`Job marked as ${nextStatus.replace('_', ' ').toLowerCase()}`);
          if (nextStatus === 'COMPLETED') {
            setCashAmountInput('');
            setCashValidationError(null);
          }
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to update job status');
        },
        onSettled: () => {
          setUpdatingId(null);
        },
      }
    );
  };

  const handleCompleteWithCash = () => {
    if (!activeJob) return;
    const parsed = parseFloat(cashAmountInput);
    if (isNaN(parsed) || parsed <= 0) {
      setCashValidationError('Cash collected must be greater than 0');
      toast.error('Please enter the cash amount collected');
      return;
    }
    const cents = Math.round(parsed * 100);
    handleUpdateStatus(activeJob.id, 'COMPLETED', cents);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Driver Portal</h1>
          <p className="text-xs text-slate-500 font-medium">Assigned work orders and field dispatch operations</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="btn-secondary text-xs px-3.5 py-1.5 cursor-pointer font-semibold"
        >
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Primary Active Job Card - Modern High-End Styling */}
      {activeJob ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          {/* Card Top Banner - Luxury Slate-900 Header with Emerald Accents */}
          <div className="bg-slate-900 px-5 py-4 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-sm bg-slate-800 text-emerald-400 px-2.5 py-1 rounded-lg border border-slate-700/60">
                #{activeJob.jobCode || activeJob.jobNumber}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                {activeJob.status === 'ASSIGNED' ? 'Pending Acceptance' : 'In Progress'}
              </span>
              {activeJob.urgency && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {activeJob.urgency}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setChatJob(activeJob)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dispatcher Chat</span>
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            {/* Customer & Location Block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Customer Contact
                </span>
                <p className="text-base font-bold text-slate-900">
                  {activeJob.customer?.fullName || activeJob.recipientName || 'Roadside Motorist'}
                </p>
                <div className="pt-1">
                  <a
                    href={`tel:${activeJob.customer?.phone || activeJob.recipientPhone || ''}`}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call: {activeJob.customer?.phone || activeJob.recipientPhone || 'No Phone on file'}</span>
                  </a>
                </div>
              </div>

              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Breakdown Location
                </span>
                <p className="text-xs font-semibold text-slate-800 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{activeJob.serviceAddress || activeJob.locationAddress || 'Address on file'}</span>
                </p>
                <div className="pt-1">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeJob.serviceAddress || '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition"
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    <span>Open in Maps</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              </div>
            </div>

            {/* Vehicle & Tire Specifications */}
            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Vehicle Specification
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {activeJob.vehicle
                      ? `${activeJob.vehicle.year || ''} ${activeJob.vehicle.make || ''} ${activeJob.vehicle.model || ''}`
                      : 'Vehicle information recorded on ticket'}
                    {activeJob.vehicle?.licensePlate && (
                      <span className="ml-2 font-mono text-xs px-2 py-0.5 rounded bg-white border border-slate-300 font-bold text-slate-800">
                        {activeJob.vehicle.licensePlate}
                      </span>
                    )}
                  </p>
                </div>

                {/* Tire Spec Highlight */}
                <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                  <Disc className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block leading-none">Required Tire Spec</span>
                    <strong className="text-sm font-black text-slate-900">
                      {activeJob.vehicle?.tireSize || 'Check on scene'}
                    </strong>
                  </div>
                </div>
              </div>

              {activeJob.problemNotes && (
                <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-700 font-medium">
                  <strong className="text-slate-900">Roadside Notes:</strong> {activeJob.problemNotes}
                </div>
              )}
            </div>

            {/* 2-State Operational Action Flows */}
            {activeJob.status === 'ASSIGNED' || activeJob.status === 'PENDING' ? (
              /* State 1: Accept or Decline Job */
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Review details and accept order to begin roadside response.</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={updatingId === activeJob.id}
                    onClick={() => {
                      const confirmed = window.confirm('Decline this dispatch? Dispatcher will be notified.');
                      if (confirmed) {
                        handleUpdateStatus(activeJob.id, 'CANCELLED');
                      }
                    }}
                    className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Decline</span>
                  </button>

                  <button
                    type="button"
                    disabled={updatingId === activeJob.id}
                    onClick={() => handleUpdateStatus(activeJob.id, 'IN_PROGRESS')}
                    className="flex-1 sm:flex-none py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{updatingId === activeJob.id ? 'Accepting...' : 'Accept Job'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* State 2: Accepted / In-Progress - Complete Job with Required Inline Cash Entry */
              <div className="pt-2 border-t border-slate-100 space-y-4">
                <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                        Cash Amount Collected on Scene <span className="text-emerald-600">*</span>
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Enter cash collected from customer to complete order and update accounting ledger.
                      </p>
                    </div>
                    {cashValidationError && (
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {cashValidationError}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="0.00"
                        value={cashAmountInput}
                        onChange={(e) => {
                          setCashAmountInput(e.target.value);
                          if (cashValidationError) setCashValidationError(null);
                        }}
                        className="w-full pl-8 pr-4 py-2.5 text-base font-bold font-mono text-slate-900 bg-white rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition placeholder:text-slate-300 shadow-2xs"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={updatingId === activeJob.id}
                      onClick={handleCompleteWithCash}
                      className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{updatingId === activeJob.id ? 'Completing...' : 'Complete Job'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={updatingId === activeJob.id}
                      onClick={() => {
                        const confirmed = window.confirm('Cancel this active dispatch? Dispatcher will be notified.');
                        if (confirmed) {
                          handleUpdateStatus(activeJob.id, 'CANCELLED');
                        }
                      }}
                      className="text-slate-500 hover:text-rose-600 transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel dispatch</span>
                    </button>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Payout:</span>
                    <span className="font-bold text-emerald-600">
                      {formatCurrency(centsToDollars(activeJob.repairerFeeCents || 4500), country)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2 shadow-xs">
          <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">All Dispatches Clear</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No active assignments. New roadside calls appear automatically.
          </p>
        </div>
      )}

      {/* Completed Dispatches History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Completed Dispatches History</span>
        </h3>

        {completedJobs.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No completed dispatches logged yet today.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {completedJobs.map((job) => (
              <div key={job.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">#{job.jobCode || job.jobNumber}</span>
                    <span className="font-semibold text-slate-700">{job.customer?.fullName || job.recipientName || 'Customer'}</span>
                    <span className="text-[10px] text-slate-400">{formatDate(job.createdAt)}</span>
                  </div>
                  <p className="text-slate-500 truncate max-w-md">{job.serviceAddress || 'Address on file'}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Earned: {formatCurrency(centsToDollars(job.repairerFeeCents || 0), country)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setChatJob(job)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                    title="View Chat History"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
}
