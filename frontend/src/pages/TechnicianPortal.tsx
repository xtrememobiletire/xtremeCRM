import { useState } from 'react';
import { 
  Wrench, 
  MapPin, 
  Phone, 
  Navigation, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Radio,
  Check,
  Disc,
  ExternalLink
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { jobService, type JobItem } from '../services/jobService';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { useSocket } from '../context/SocketContext';
import { formatCurrency, centsToDollars } from '../utils/currency';
import { formatDate } from '../utils/date';
import { toast } from 'sonner';
import { api } from '../utils/api';
import JobChatModal from '../components/dispatch/JobChatModal';

export default function TechnicianPortal() {
  const { user } = useAuth();
  const { country, currencySymbol } = useTenant();
  const { isConnected } = useSocket();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [chatJob, setChatJob] = useState<JobItem | null>(null);
  const [cashCollectedModal, setCashCollectedModal] = useState<JobItem | null>(null);
  const [cashAmountInput, setCashAmountInput] = useState('');
  const [recordingCash, setRecordingCash] = useState(false);

  // Fetch driver assigned jobs
  const { data: jobsResponse, refetch } = useQuery({
    queryKey: ['technician-jobs', country, user?.id],
    queryFn: () => jobService.getJobs({ limit: 50, countryCode: country }),
    refetchInterval: 10000,
  });

  const jobs = jobsResponse?.data || [];

  // Categorize jobs
  const activeJob = jobs.find(
    (j) => j.status === 'ASSIGNED' || j.status === 'EN_ROUTE' || j.status === 'IN_PROGRESS' || j.status === 'PENDING'
  );
  const completedJobs = jobs.filter((j) => j.status === 'COMPLETED');

  // Calculate driver-only isolated metrics (NFR-4)
  const totalEarningsCents = completedJobs.reduce((sum, j) => sum + (j.repairerFeeCents || 0), 0);

  const handleUpdateStatus = async (jobId: string, nextStatus: string) => {
    try {
      setUpdatingId(jobId);
      await api.patch(`/jobs/${jobId}/status`, { status: nextStatus });
      toast.success(`Status updated to ${nextStatus.replace('_', ' ')}`);
      refetch();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRecordCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashCollectedModal || !cashAmountInput) return;
    try {
      setRecordingCash(true);
      const amountCents = Math.round(parseFloat(cashAmountInput) * 100);
      await api.post('/accounting/driver-cash-ledger', {
        driverId: user?.id,
        amountCents,
        type: 'JOB_COLLECTION',
        jobId: cashCollectedModal.id,
        notes: `Cash collected on scene for Job #${cashCollectedModal.jobCode || cashCollectedModal.jobNumber}`,
      });
      toast.success(`Recorded $${cashAmountInput} cash collected on scene`);
      setCashCollectedModal(null);
      setCashAmountInput('');
      refetch();
    } catch {
      toast.error('Failed to record cash');
    } finally {
      setRecordingCash(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Driver Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Technician Command
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-500" />
                <span>{isConnected ? 'Telemetry Active' : 'Connecting...'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Welcome back, <strong className="text-slate-800">{user?.fullName || 'Technician'}</strong> — Assigned Region: {country} ({currencySymbol})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="btn-secondary text-xs px-3 py-1.5 self-start sm:self-auto"
        >
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Driver-Isolated Performance Metrics (PRD NFR-4) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Active Work Order</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{activeJob ? '1 In Progress' : 'Standing By'}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{activeJob ? `Job #${activeJob.jobCode || activeJob.jobNumber}` : 'Awaiting next dispatch'}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Completed Jobs</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{completedJobs.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Tickets resolved successfully</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Your Labor Payout (DC)</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{formatCurrency(centsToDollars(totalEarningsCents), country)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Direct technician compensation</p>
        </div>
      </div>

      {/* Primary Active Job Card */}
      {activeJob ? (
        <div className="bg-white rounded-2xl border-2 border-red-500/80 shadow-md overflow-hidden">
          {/* Card Top Banner */}
          <div className="bg-red-600 px-4 py-3 text-white flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-sm bg-black/30 px-2 py-0.5 rounded">
                #{activeJob.jobCode || activeJob.jobNumber}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                {activeJob.urgency || 'URGENT'}
              </span>
              <span className="text-xs font-semibold text-red-100">
                Current Status: <strong className="text-white uppercase">{activeJob.status.replace('_', ' ')}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setChatJob(activeJob)}
              className="bg-white text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg text-xs font-black inline-flex items-center gap-1.5 transition shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-red-600" />
              <span>Dispatcher Chat</span>
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            {/* Customer & Location Block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Customer & Contact
                </span>
                <p className="text-base font-bold text-slate-900">
                  {activeJob.customer?.fullName || activeJob.recipientName || 'Roadside Motorist'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={`tel:${activeJob.customer?.phone || activeJob.recipientPhone || ''}`}
                    className="btn-primary py-1.5 px-3 text-xs inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call: {activeJob.customer?.phone || activeJob.recipientPhone || 'No Phone'}</span>
                  </a>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Roadside Breakdown Location
                </span>
                <p className="text-xs font-bold text-slate-800 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{activeJob.serviceAddress || activeJob.locationAddress || 'Address on file'}</span>
                </p>
                <div className="pt-1">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeJob.serviceAddress || '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1.5 text-blue-700 hover:bg-blue-50 border-blue-200"
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    <span>Open Navigation (Google Maps)</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              </div>
            </div>

            {/* Vehicle & Tire Specifications (High Visibility) */}
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                    Vehicle Specification
                  </span>
                  <p className="text-sm font-black text-slate-900">
                    {activeJob.vehicle
                      ? `${activeJob.vehicle.year || ''} ${activeJob.vehicle.make || ''} ${activeJob.vehicle.model || ''}`
                      : 'Vehicle information recorded on ticket'}
                    {activeJob.vehicle?.licensePlate && (
                      <span className="ml-2 font-mono text-xs px-2 py-0.5 rounded bg-white border border-amber-300 font-bold text-slate-800">
                        {activeJob.vehicle.licensePlate}
                      </span>
                    )}
                  </p>
                </div>

                {/* Pre-Registered Tire Size Highlight */}
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-amber-300 shadow-2xs">
                  <Disc className="w-4 h-4 text-red-600 animate-spin" />
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block leading-none">Required Tire Spec</span>
                    <strong className="text-sm font-black text-red-600">
                      {activeJob.vehicle?.tireSize || 'Check with caller'}
                    </strong>
                  </div>
                </div>
              </div>

              {activeJob.problemNotes && (
                <div className="pt-2 border-t border-amber-200/60 text-xs text-amber-950 font-medium">
                  <strong>Roadside Notes:</strong> {activeJob.problemNotes}
                </div>
              )}
            </div>

            {/* One-Click Progression Actions */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {activeJob.status === 'ASSIGNED' && (
                  <button
                    type="button"
                    disabled={updatingId === activeJob.id}
                    onClick={() => handleUpdateStatus(activeJob.id, 'EN_ROUTE')}
                    className="btn-primary py-2.5 px-4 text-xs font-bold bg-amber-600 hover:bg-amber-700 inline-flex items-center gap-2 shadow-xs"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Accept Job & Head Out (En Route)</span>
                  </button>
                )}

                {activeJob.status === 'EN_ROUTE' && (
                  <button
                    type="button"
                    disabled={updatingId === activeJob.id}
                    onClick={() => handleUpdateStatus(activeJob.id, 'IN_PROGRESS')}
                    className="btn-primary py-2.5 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 inline-flex items-center gap-2 shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Arrived on Scene (In Progress)</span>
                  </button>
                )}

                {activeJob.status === 'IN_PROGRESS' && (
                  <button
                    type="button"
                    disabled={updatingId === activeJob.id}
                    onClick={() => handleUpdateStatus(activeJob.id, 'COMPLETED')}
                    className="btn-primary py-2.5 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 inline-flex items-center gap-2 shadow-xs"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Mark Job Completed</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setCashCollectedModal(activeJob)}
                  className="btn-secondary py-2.5 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Record Cash Collected</span>
                </button>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-400 block">Assigned Technician Labor</span>
                <span className="text-base font-black text-emerald-600">
                  {formatCurrency(centsToDollars(activeJob.repairerFeeCents || 4500), country)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="text-base font-bold text-slate-900">All Dispatches Clear</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You currently have no active roadside assignments. When a dispatcher assigns a new ticket, you will receive an instant audio chime and screen alert.
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

      {/* Cash Collection Modal */}
      {cashCollectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Record Cash on Scene</h4>
                  <p className="text-[11px] text-slate-500 font-mono">Job #{cashCollectedModal.jobCode || cashCollectedModal.jobNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCashCollectedModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordCash} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Cash Amount Collected ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 180.00"
                  value={cashAmountInput}
                  onChange={(e) => setCashAmountInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 space-y-1">
                <p>• This will log a positive cash collection in your field envelope.</p>
                <p>• You will remit this physical cash to the dispatcher during shift handover.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCashCollectedModal(null)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingCash}
                  className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  {recordingCash ? 'Saving...' : 'Confirm Cash Collected'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
