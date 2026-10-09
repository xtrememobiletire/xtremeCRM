import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  MapPin, 
  RefreshCw, 
  Truck,
  Users,
  Compass
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import JobMap from '../components/maps/JobMap';
import FleetMap from '../components/maps/FleetMap';
import CustomerMap from '../components/maps/CustomerMap';
import { mapService, type MapJob } from '../services/mapService';
import { useTenant } from '../context/TenantContext';
import { useSocket } from '../context/SocketContext';

type DispatchTab = 'jobs' | 'fleets' | 'customers';

export default function Dispatch() {
  const { country } = useTenant();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<DispatchTab>('jobs');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedJob, setSelectedJob] = useState<MapJob | null>(null);

  // 1. Fetch Jobs with coordinates
  const {
    data: jobs = [],
    isLoading: isJobsLoading,
    refetch: refetchJobs,
  } = useQuery({
    queryKey: ['dispatch-map-jobs', country],
    queryFn: () => mapService.getJobs({ countryCode: country }),
    staleTime: 1000 * 30,
  });

  // 2. Fetch Fleets with coordinates
  const {
    data: fleets = [],
    refetch: refetchFleets,
  } = useQuery({
    queryKey: ['dispatch-map-fleets', country],
    queryFn: () => mapService.getFleets({ countryCode: country }),
    enabled: activeTab === 'fleets',
    staleTime: 1000 * 60,
  });

  // 3. Fetch Customers with coordinates
  const {
    data: customers = [],
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ['dispatch-map-customers', country],
    queryFn: () => mapService.getCustomers(country),
    enabled: activeTab === 'customers',
    staleTime: 1000 * 60,
  });

  // Socket updates for real-time dispatch map
  useEffect(() => {
    if (!socket) return;
    const handleJobChange = () => {
      refetchJobs();
    };
    socket.on('job:created', handleJobChange);
    socket.on('job:assigned', handleJobChange);
    socket.on('job:status_updated', handleJobChange);
    return () => {
      socket.off('job:created', handleJobChange);
      socket.off('job:assigned', handleJobChange);
      socket.off('job:status_updated', handleJobChange);
    };
  }, [socket, refetchJobs]);

  // Filter jobs by search and status
  const filteredJobs = jobs.filter((job) => {
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? job.status === 'ASSIGNED' || job.status === 'IN_PROGRESS' || job.status === 'PENDING'
        : job.status === statusFilter;

    const term = search.toLowerCase().trim();
    if (!term) return matchesStatus;

    const matchesSearch =
      job.jobCode.toLowerCase().includes(term) ||
      (job.serviceAddress && job.serviceAddress.toLowerCase().includes(term)) ||
      (job.customer?.fullName && job.customer.fullName.toLowerCase().includes(term)) ||
      (job.vehicle?.licensePlate && job.vehicle.licensePlate.toLowerCase().includes(term)) ||
      (job.driver?.fullName && job.driver.fullName.toLowerCase().includes(term));

    return matchesStatus && matchesSearch;
  });

  const activeJobsCount = jobs.filter(
    (j) => j.status === 'ASSIGNED' || j.status === 'IN_PROGRESS' || j.status === 'PENDING'
  ).length;
  const urgentCount = jobs.filter((j) => j.urgency === 'URGENT' && j.status !== 'COMPLETED').length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Mapbox Live Dispatch"
          subtitle="Real-time geographic coordination, fleet telemetry & roadside routing"
        />

        <div className="flex items-center gap-2">
          {/* Layer Selector */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('jobs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'jobs'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-red-600" />
              <span>Jobs ({jobs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('fleets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'fleets'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>Fleets ({fleets.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Customers ({customers.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (activeTab === 'jobs') refetchJobs();
              if (activeTab === 'fleets') refetchFleets();
              if (activeTab === 'customers') refetchCustomers();
            }}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="Refresh Map Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI ribbon for jobs */}
      {activeTab === 'jobs' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Geocoded</span>
            <span className="text-xl font-black text-slate-900">{jobs.length}</span>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block">Active Roadside</span>
            <span className="text-xl font-black text-amber-600">{activeJobsCount}</span>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 block">Urgent Breakdown</span>
            <span className="text-xl font-black text-red-600">{urgentCount}</span>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">Region Silo</span>
            <span className="text-xl font-black text-emerald-600">{country || 'ALL'}</span>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      {activeTab === 'jobs' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Interactive Mapbox Canvas (lg: 8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <JobMap
              jobs={filteredJobs}
              selectedJobId={selectedJob?.id}
              onSelectJob={(j) => setSelectedJob(j)}
              height="620px"
            />
          </div>

          {/* Job Dispatch Feed & Search (lg: 4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col h-[620px] overflow-hidden">
            {/* Search and Filters Header */}
            <div className="p-3.5 border-b border-slate-100 space-y-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by code, customer, plate..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Status pills */}
              <div className="flex flex-wrap gap-1">
                {(['ALL', 'ACTIVE', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition cursor-pointer ${
                      statusFilter === s
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
              {isJobsLoading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading Mapbox jobs...</div>
              ) : filteredJobs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No jobs match search criteria</div>
              ) : (
                filteredJobs.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  return (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className={`p-3 rounded-xl cursor-pointer transition border text-left space-y-1.5 ${
                        isSelected
                          ? 'bg-red-50/60 border-red-200 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          #{job.jobCode}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            job.status === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-600'
                              : job.status === 'IN_PROGRESS'
                              ? 'bg-emerald-100 text-emerald-700'
                              : job.status === 'ASSIGNED'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-800 line-clamp-1">
                        {job.customer?.fullName || job.recipientName || 'Customer'}
                      </p>

                      <p className="text-[11px] text-slate-500 flex items-start gap-1 line-clamp-1">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                        <span>{job.serviceAddress}</span>
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-100/80">
                        <span>
                          {job.vehicle
                            ? `${job.vehicle.year || ''} ${job.vehicle.make || ''} ${job.vehicle.model || ''}`
                            : 'Vehicle on file'}
                        </span>
                        {job.driver ? (
                          <span className="text-emerald-600 font-semibold">🧑‍🔧 {job.driver.fullName}</span>
                        ) : (
                          <span className="text-amber-500 font-medium">Unassigned</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'fleets' ? (
        <div className="space-y-4">
          <FleetMap fleets={fleets} height="650px" />
        </div>
      ) : (
        <div className="space-y-4">
          <CustomerMap customers={customers} height="650px" />
        </div>
      )}
    </div>
  );
}
