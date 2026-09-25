import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, PhoneCall, Clock, CalendarClock, ShieldAlert, ArrowUpRight, Ban, UserCheck, MessageSquare } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import DriverList from '../components/pages/dispatch/DriverList';
import ProximityDistanceTool from '../components/pages/dispatch/ProximityDistanceTool';
import DriverCashTracker from '../components/pages/dispatch/DriverCashTracker';
import DispatchMap from '../components/pages/dispatch/DispatchMap';
import UrgentQueueAccordion from '../components/pages/dispatch/UrgentQueueAccordion';
import AssignDriverModal from '../components/jobs/AssignDriverModal';
import JobChatModal from '../components/dispatch/JobChatModal';
import { useSocket } from '../context/SocketContext';
import { useTenant } from '../context/TenantContext';
import { jobService } from '../services/jobService';
import { userService } from '../services/userService';
import { api } from '../utils/api';
import { toast } from 'sonner';

interface QueueSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  jobs: any[];
  badge: string;
  onViewJob: (job: any) => void;
  onAssignJob: (job: any) => void;
  onChatJob?: (job: any) => void;
}

function QueueSection({ title, icon: Icon, color, jobs, badge, onViewJob, onAssignJob, onChatJob }: QueueSectionProps) {
  if (!jobs || jobs.length === 0) return null;
  return (
    <div className={`border rounded-xl p-3 ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <h4 className="font-bold text-sm">{title}</h4>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${badge}`}>{jobs.length}</span>
      </div>
      <div className="space-y-1.5">
        {jobs.map((job) => (
          <div
            key={job.id}
            onClick={() => onViewJob(job)}
            className="flex items-center justify-between p-2 bg-white/80 rounded-lg cursor-pointer hover:bg-white transition text-xs"
          >
            <div>
              <span className="font-mono font-bold text-slate-800">{job.jobCode || job.jobNumber}</span>
              <span className="text-slate-500 ml-2">{job.serviceAddress || job.locationAddress || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">{job.customer?.fullName || job.customer?.name || '—'}</span>
              {(job.driver || job.assignedDriver) && onChatJob && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChatJob(job);
                  }}
                  className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold hover:bg-blue-100 flex items-center gap-1"
                >
                  <MessageSquare className="w-2.5 h-2.5" />
                  <span>Chat</span>
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignJob(job);
                }}
                className="text-[10px] px-2 py-0.5 bg-red-600 text-white rounded font-bold hover:bg-red-700"
              >
                Assign
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dispatch() {
  const { country } = useTenant();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { simulateIncomingCall } = useSocket();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assigningJob, setAssigningJob] = useState<any | null>(null);
  const [chatJob, setChatJob] = useState<any | null>(null);
  const prevTriageCount = useRef(0);

  // FR-8.1: Triage queue — UNVERIFIED_PUBLIC jobs, 5s polling
  const { data: triageData } = useQuery({
    queryKey: ['triage-queue', country],
    queryFn: () => jobService.getJobs({ status: 'UNVERIFIED_PUBLIC', countryCode: country, limit: 50 }),
    refetchInterval: 5000,
  });

  // FR-4.1: Urgent queue
  const { data: urgentJobsData } = useQuery({
    queryKey: ['urgent-dispatch-jobs', country],
    queryFn: () => jobService.getJobs({ urgency: 'EMERGENCY', countryCode: country, limit: 20 }),
    refetchInterval: 15000,
  });

  // FR-4.1: Standard queue
  const { data: standardJobsData } = useQuery({
    queryKey: ['standard-dispatch-jobs', country],
    queryFn: () => jobService.getJobs({ urgency: 'STANDARD', countryCode: country, limit: 20 }),
    refetchInterval: 30000,
  });

  // FR-4.1: Future queue
  const { data: futureJobsData } = useQuery({
    queryKey: ['future-dispatch-jobs', country],
    queryFn: () => jobService.getJobs({ urgency: 'FUTURE', countryCode: country, limit: 20 }),
    refetchInterval: 60000,
  });

  const { data: apiDrivers = [] } = useQuery({
    queryKey: ['dispatch-drivers'],
    queryFn: () => userService.getDrivers(),
  });

  const triageJobs = (triageData?.data || []).filter(j => j.status === 'UNVERIFIED_PUBLIC');
  const urgentJobs = (urgentJobsData?.data || []).filter(j => j.status !== 'COMPLETED' && j.status !== 'CANCELLED');
  const standardJobs = (standardJobsData?.data || []).filter(j => j.status !== 'COMPLETED' && j.status !== 'CANCELLED');
  const futureJobs = (futureJobsData?.data || []).filter(j => j.status !== 'COMPLETED' && j.status !== 'CANCELLED');

  const handlePromoteTriage = async (job: any) => {
    try {
      await api.patch(`/jobs/${job.id}/status`, { status: 'PENDING', urgency: 'EMERGENCY' });
      toast.success(`Job #${job.jobCode || job.jobNumber} promoted to Urgent Roadside Queue`);
      queryClient.invalidateQueries({ queryKey: ['triage-queue', country] });
      queryClient.invalidateQueries({ queryKey: ['urgent-dispatch-jobs', country] });
    } catch {
      toast.error('Failed to promote job');
    }
  };

  const handleDismissTriage = async (job: any) => {
    try {
      await jobService.recordDisposition({
        callerPhone: job.customer?.phone || job.recipientPhone || 'N/A',
        disposition: 'IR',
        reason: 'Dismissed / Spam / Unreachable from Triage',
        countryCode: country,
      });
      await api.patch(`/jobs/${job.id}/status`, { status: 'CANCELLED' });
      toast.info(`Public booking #${job.jobCode || job.jobNumber} dismissed`);
      queryClient.invalidateQueries({ queryKey: ['triage-queue', country] });
    } catch {
      toast.error('Failed to dismiss job');
    }
  };

  // FR-8.1: Auditory chime when new triage jobs appear
  useEffect(() => {
    if (triageJobs.length > prevTriageCount.current && prevTriageCount.current > 0) {
      try { new Audio('/chime.mp3').play().catch(() => {}); } catch {}
    }
    prevTriageCount.current = triageJobs.length;
  }, [triageJobs.length]);

  const driversList = apiDrivers.length > 0
    ? apiDrivers.map((d, i) => ({
        id: d.id,
        name: d.fullName,
        phone: d.phone || '+1 (416) 555-0100',
        status: d.isAgentActive ? 'AVAILABLE' : 'OFFLINE',
        vehicle: `Unit #${String(i + 1).padStart(2, '0')} (Service Van)`,
        currentJob: undefined,
        location: `${country} Service Hub`,
      }))
    : [];

  const filteredDrivers = driversList.filter((drv) => {
    const matchesSearch = !search || drv.name.toLowerCase().includes(search.toLowerCase()) || drv.vehicle.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || drv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Dispatch Operations"
        subtitle={`Roster monitoring, proximity routing, and driver coordination for ${country} Region`}
        badge={
          <span className="badge-brand inline-flex items-center gap-1">
            <Radio className="w-3 h-3 text-red-600 animate-pulse" />
            <span>Telemetry Connected</span>
          </span>
        }
        actions={
          <button
            type="button"
            onClick={() => simulateIncomingCall('+14165550199', 'Roadside Unit #04 - Marcus')}
            className="btn-secondary"
          >
            <PhoneCall size={14} className="text-emerald-600" />
            <span>Softphone Radio Test</span>
          </button>
        }
      />

      {/* FR-8.1: Triage Queue with 1-Click Actions */}
      {triageJobs.length > 0 && (
        <div className="border border-orange-300 bg-orange-50/90 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-600" />
              <h4 className="font-bold text-sm text-orange-950">Triage Queue — Unverified Public Bookings</h4>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-600 text-white animate-pulse">
                {triageJobs.length} Pending Triage
              </span>
            </div>
            <span className="text-[11px] text-orange-700 font-semibold">5s Live Polling Active</span>
          </div>

          <div className="space-y-2">
            {triageJobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-xl border border-orange-200/80 shadow-2xs gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded">
                      {job.jobCode || job.jobNumber}
                    </span>
                    <span className="font-bold text-slate-800">
                      {job.customer?.fullName || job.customer?.name || job.recipientName || 'Public Web Booking'}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {job.customer?.phone || job.recipientPhone || ''}
                    </span>
                  </div>
                  <div className="text-slate-600 flex items-center gap-1 truncate">
                    <span>Breakdown Address:</span>
                    <strong className="text-slate-800 truncate">{job.serviceAddress || job.locationAddress || 'Address not specified'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePromoteTriage(job)}
                    className="btn-primary py-1 px-2.5 text-[11px] bg-red-600 hover:bg-red-700 inline-flex items-center gap-1"
                    title="Promote to urgent roadside dispatch queue"
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    <span>Promote Urgent</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssigningJob(job)}
                    className="btn-secondary py-1 px-2 text-[11px] inline-flex items-center gap-1 text-slate-700 hover:bg-slate-100"
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Assign</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissTriage(job)}
                    className="btn-secondary py-1 px-2 text-[11px] inline-flex items-center gap-1 text-rose-600 hover:bg-rose-50 border-rose-200"
                    title="Dismiss as spam or customer unreachable"
                  >
                    <Ban className="w-3 h-3" />
                    <span>Dismiss</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/jobs?id=${job.id}`)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                    title="View Job Details"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FR-4.1: Urgent Queue */}
      {urgentJobs.length > 0 && (
        <UrgentQueueAccordion
          urgentJobs={urgentJobs}
          onAssignDriver={(job) => setAssigningJob(job)}
          onViewJob={(job) => navigate(`/jobs?id=${job.id}`)}
          onChatDriver={(job) => setChatJob(job)}
        />
      )}

      {/* FR-4.1: Standard Queue */}
      <QueueSection
        title="Standard Jobs"
        icon={Clock}
        color="border-yellow-300 bg-yellow-50"
        jobs={standardJobs}
        badge="bg-yellow-600 text-white"
        onViewJob={(job) => navigate(`/jobs?id=${job.id}`)}
        onAssignJob={(job) => setAssigningJob(job)}
        onChatJob={(job) => setChatJob(job)}
      />

      {/* FR-4.1: Future Queue */}
      <QueueSection
        title="Future / Scheduled Bookings"
        icon={CalendarClock}
        color="border-blue-200 bg-blue-50"
        jobs={futureJobs}
        badge="bg-blue-600 text-white"
        onViewJob={(job) => navigate(`/jobs?id=${job.id}`)}
        onAssignJob={(job) => setAssigningJob(job)}
        onChatJob={(job) => setChatJob(job)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">
              Mobile Service Units ({filteredDrivers.length})
            </h3>
            <span className="text-xs text-slate-500">
              {filteredDrivers.filter((d) => d.status === 'AVAILABLE').length} Available Now
            </span>
          </div>

          <DriverList
            drivers={filteredDrivers}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />

          <DispatchMap country={country} />
        </div>

        <div className="space-y-6">
          <ProximityDistanceTool />
          <DriverCashTracker />
        </div>
      </div>

      {assigningJob && (
        <AssignDriverModal
          isOpen={!!assigningJob}
          onClose={() => setAssigningJob(null)}
          job={assigningJob}
        />
      )}

      {chatJob && (
        <JobChatModal
          isOpen={!!chatJob}
          onClose={() => setChatJob(null)}
          jobId={chatJob.id}
          jobCode={chatJob.jobCode || chatJob.jobNumber}
          driverName={chatJob.driver?.fullName || chatJob.assignedDriver?.fullName || 'Roadside Technician'}
        />
      )}
    </div>
  );
}
