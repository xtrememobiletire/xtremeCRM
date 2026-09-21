import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, PhoneCall, Clock, CalendarClock, ShieldAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import DriverList from '../components/pages/dispatch/DriverList';
import ProximityDistanceTool from '../components/pages/dispatch/ProximityDistanceTool';
import DriverCashTracker from '../components/pages/dispatch/DriverCashTracker';
import DispatchMap from '../components/pages/dispatch/DispatchMap';
import UrgentQueueAccordion from '../components/pages/dispatch/UrgentQueueAccordion';
import AssignDriverModal from '../components/jobs/AssignDriverModal';
import { useSocket } from '../context/SocketContext';
import { useTenant } from '../context/TenantContext';
import { jobService } from '../services/jobService';
import { userService } from '../services/userService';

const MOCK_FLEET_DRIVERS = [
  { id: 'drv-1', name: 'Marcus Vance', phone: '+1 (416) 555-0199', status: 'AVAILABLE', vehicle: 'Van #04 (Ford Transit 350)', currentJob: 'JOB-CA-1002', location: 'Hwy 401 Eastbound (Toronto)' },
  { id: 'drv-2', name: 'Devon Lee', phone: '+1 (416) 555-0188', status: 'AVAILABLE', vehicle: 'Rig #08 (RAM 3500 HD)', currentJob: undefined, location: 'Gardiner Expy & Spadina' },
  { id: 'drv-3', name: 'Samir Patel', phone: '+1 (416) 555-0144', status: 'BUSY', vehicle: 'Van #02 (Sprinter High-Roof)', currentJob: 'JOB-CA-1005', location: 'QEW Westbound near Mississauga' },
  { id: 'drv-4', name: 'Tyler Ross', phone: '+1 (416) 555-0133', status: 'BUSY', vehicle: 'Van #07 (Ford Transit)', currentJob: 'JOB-CA-1008', location: '407 ETR & Markham Rd' },
  { id: 'drv-5', name: 'Alex Tremblay', phone: '+1 (514) 555-0122', status: 'OFFLINE', vehicle: 'Service Truck #01', currentJob: undefined, location: 'Depot (Off Shift)' },
];

interface QueueSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  jobs: any[];
  badge: string;
  onViewJob: (job: any) => void;
  onAssignJob: (job: any) => void;
}

function QueueSection({ title, icon: Icon, color, jobs, badge, onViewJob, onAssignJob }: QueueSectionProps) {
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
  const { simulateIncomingCall } = useSocket();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assigningJob, setAssigningJob] = useState<any | null>(null);
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
    : MOCK_FLEET_DRIVERS;

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

      {/* FR-8.1: Triage Queue */}
      <QueueSection
        title="Triage Queue — Unverified Public Bookings"
        icon={ShieldAlert}
        color="border-orange-300 bg-orange-50"
        jobs={triageJobs}
        badge="bg-orange-600 text-white"
        onViewJob={(job) => navigate(`/jobs?id=${job.id}`)}
        onAssignJob={(job) => setAssigningJob(job)}
      />

      {/* FR-4.1: Urgent Queue */}
      {urgentJobs.length > 0 && (
        <UrgentQueueAccordion
          urgentJobs={urgentJobs}
          onAssignDriver={(job) => setAssigningJob(job)}
          onViewJob={(job) => navigate(`/jobs?id=${job.id}`)}
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
    </div>
  );
}
