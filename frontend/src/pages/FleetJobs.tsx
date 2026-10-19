import { useState, useMemo, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Truck, 
  Plus, 
  Search, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  MapPin,
  UserCheck,
  Building2,
  Sparkles,
  Zap,
  Eye
} from 'lucide-react';

const FleetJobDetailModal = lazy(() => import('../components/pages/jobs/FleetJobDetailModal'));
const AssignDriverModal = lazy(() => import('../components/pages/jobs/AssignDriverModal'));
const CreateFleetJobModal = lazy(() => import('../components/pages/jobs/CreateFleetJobModal'));
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/common/Pagination';
import StatusBadge from '../components/ui/StatusBadge';
import JobLifecycleTabs from '../components/common/JobLifecycleTabs';
import { jobService } from '../services/jobService';
import { fleetService } from '../services/fleetService';
import { useTenant } from '../context/TenantContext';
import { formatDate, formatJobWindowDual, resolveJobTimezone, formatTimeInTz } from '../utils/date';

export default function FleetJobs() {
  const { country: tenantCountry } = useTenant();
  const [lifecycleTab, setLifecycleTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [selectedCountry, setSelectedCountry] = useState<string>(tenantCountry || 'CA');
  const [selectedFleetId, setSelectedFleetId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [assignJob, setAssignJob] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  const effectiveStatus = lifecycleTab === 'COMPLETED'
    ? 'COMPLETED'
    : (statusFilter === 'ALL' ? 'ACTIVE' : statusFilter);

  // 1. Fetch Fleet Work Orders
  const { 
    data: jobsResponse, 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['fleet-jobs', selectedCountry, selectedFleetId, effectiveStatus, search, page],
    queryFn: () => jobService.getJobs({
      page,
      limit: 25,
      countryCode: selectedCountry,
      status: effectiveStatus,
      search: search || undefined,
      fleetId: selectedFleetId || undefined,
      isFleetJob: 'true' as any,
    } as any),
    refetchInterval: 15000,
  });

  // 2. Fetch Fleets for filter dropdown
  const { data: fleets = [] } = useQuery({
    queryKey: ['fleets-filter', selectedCountry],
    queryFn: async () => {
      const res = await fleetService.getFleets({ countryCode: selectedCountry });
      return res?.data || [];
    },
  });

  const rawJobs = (jobsResponse?.data || []).filter(
    (j: any) => {
      if (!j.fleetId && !j.isTestService) return false;
      if (lifecycleTab === 'ACTIVE' && j.status === 'COMPLETED') return false;
      if (lifecycleTab === 'COMPLETED' && j.status !== 'COMPLETED') return false;
      return true;
    }
  );
  const meta = jobsResponse?.pagination || { page: 1, totalPages: 1, total: 0 };

  const liveSelectedJob = useMemo(
    () => rawJobs.find((j: any) => j.id === selectedJob?.id) || selectedJob,
    [rawJobs, selectedJob]
  );

  // Dedicated regional summary counters across all fleet jobs (independent of current tab filter)
  const { data: summaryResponse } = useQuery({
    queryKey: ['fleet-jobs-summary', selectedCountry, selectedFleetId],
    queryFn: () => jobService.getJobs({
      page: 1,
      limit: 100,
      countryCode: selectedCountry,
      fleetId: selectedFleetId || undefined,
      isFleetJob: 'true' as any,
    } as any),
    staleTime: 15000,
    refetchInterval: 15000,
  });

  const summaryJobs = useMemo(() => {
    return (summaryResponse?.data || []).filter(
      (j: any) => Boolean(j.fleetId || j.isTestService)
    );
  }, [summaryResponse]);

  // Calculate high-level summary counters
  const counters = useMemo(() => {
    const total = summaryResponse?.pagination?.total ?? summaryJobs.length;
    const pending = summaryJobs.filter((j: any) => ['PENDING', 'UNVERIFIED_PUBLIC'].includes(j.status)).length;
    const inProgress = summaryJobs.filter((j: any) => ['ASSIGNED', 'IN_PROGRESS'].includes(j.status)).length;
    const completed = summaryJobs.filter((j: any) => j.status === 'COMPLETED').length;
    return {
      total,
      pending,
      inProgress,
      completed,
    };
  }, [summaryJobs, summaryResponse]);

  return (
    <div className="space-y-6">
      {/* Header with Country Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
              <Truck size={22} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Fleet Operations & Commercial Work Orders
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Dedicated B2B fleet dispatching, scheduled maintenance, and prospective trial jobs
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Regional Country Filter Pills */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            {(['CA', 'US', 'UK'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setSelectedCountry(c);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  selectedCountry === c
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="btn-primary px-3.5 py-2 text-xs flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus size={16} />
            <span>New Fleet Job</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Fleet Orders</div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">{counters.total}</div>
        </div>
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 shadow-xs">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={14} />
            <span>Pending Dispatch</span>
          </div>
          <div className="text-2xl font-black font-mono text-amber-900 mt-1">{counters.pending}</div>
        </div>
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 shadow-xs">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
            <Truck size={14} />
            <span>In Progress</span>
          </div>
          <div className="text-2xl font-black font-mono text-blue-900 mt-1">{counters.inProgress}</div>
        </div>
        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 shadow-xs">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            <span>Completed</span>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-900 mt-1">{counters.completed}</div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <JobLifecycleTabs
            activeTab={lifecycleTab}
            onChangeTab={(tab) => {
              setLifecycleTab(tab);
              setStatusFilter(tab === 'COMPLETED' ? 'COMPLETED' : 'ALL');
              setPage(1);
            }}
            activeLabel="Active Fleet Jobs"
            completedLabel="Completed"
          />

          {/* Status Dropdown */}
          <div className="relative min-w-[170px]">
            <select
              value={lifecycleTab === 'COMPLETED' ? 'COMPLETED' : (statusFilter === 'ACTIVE' ? 'ALL' : statusFilter)}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'COMPLETED') {
                  setLifecycleTab('COMPLETED');
                  setStatusFilter('COMPLETED');
                } else if (val === 'ALL') {
                  setLifecycleTab('ACTIVE');
                  setStatusFilter('ALL');
                } else {
                  setLifecycleTab('ACTIVE');
                  setStatusFilter(val);
                }
                setPage(1);
              }}
              className="w-full text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer"
            >
              {lifecycleTab === 'COMPLETED' ? (
                <>
                  <option value="COMPLETED">Completed Orders</option>
                  <option value="ALL">← Back to Active Orders</option>
                </>
              ) : (
                <>
                  <option value="ALL">All Active Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed Orders →</option>
                </>
              )}
            </select>
          </div>

          {/* Fleet Account Dropdown */}
          <div className="relative min-w-[200px]">
            <select
              value={selectedFleetId}
              onChange={(e) => {
                setSelectedFleetId(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs py-1.5 px-3 pr-8 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              <option value="">All Fleet Accounts</option>
              {fleets.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.fleetCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search code, address, unit..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer shrink-0"
            title="Refresh Orders"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Fleet Work Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Loading {selectedCountry} fleet jobs...</div>
        ) : rawJobs.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No Fleet Work Orders Found"
              description={`There are currently no active or historical fleet jobs matching your filters for region ${selectedCountry}.`}
              action={
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Create Fleet Work Order</span>
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px] tracking-wider">
                  <th className="py-3 px-4">Job Code</th>
                  <th className="py-3 px-4">Fleet / Account</th>
                  <th className="py-3 px-4">Vehicle / Unit</th>
                  <th className="py-3 px-4">Service Location</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rawJobs.map((job: any) => {
                  const isTrial = Boolean(job.isTestService);
                  const fleetName = job.fleet?.name || job.lead?.companyName || (isTrial ? (job.recipientName || 'Prospective Fleet (Trial)') : 'Commercial Account');
                  const fleetCode = job.fleet?.fleetCode || (isTrial ? 'TRIAL' : 'B2B');
                  const unitNumber = job.vehicle?.unitNumber;

                  const jobTz = resolveJobTimezone(job);
                  const windowInfo = (job.arrivalWindowStart || job.estimatedArrivalAt)
                    ? formatJobWindowDual(job.arrivalWindowStart || job.estimatedArrivalAt, job.arrivalWindowEnd, jobTz)
                    : null;

                  return (
                    <tr 
                      key={job.id} 
                      className="hover:bg-slate-50/60 transition group cursor-pointer"
                      onClick={() => setSelectedJob(job)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{job.jobCode || job.jobNumber}</span>
                          {isTrial && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-sans font-bold text-[10px] flex items-center gap-1">
                              <Sparkles size={10} />
                              Trial
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono font-normal">{formatDate(job.createdAt)}</div>
                        {windowInfo && (
                          <div className="mt-1 space-y-0.5 font-normal">
                            <div className="text-[10px] text-blue-700 font-bold flex items-center gap-1" title={`Customer Local Promised Window (${jobTz})`}>
                              <Clock className="w-2.5 h-2.5 shrink-0 text-blue-600" />
                              <span>{windowInfo.customerWindow}</span>
                            </div>
                            <div className="text-[9px] text-slate-500 font-mono flex items-center gap-1 pl-3.5 flex-wrap">
                              <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-medium" title="Pakistan Shift Time">
                                {windowInfo.pktWindow}
                              </span>
                              {windowInfo.statusBadge && (
                                <span className={`px-1 py-0.2 rounded font-bold ${windowInfo.isOverdue ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700'}`}>
                                  • {windowInfo.statusBadge}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 size={13} className="text-slate-400" />
                          <span>{fleetName}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 font-semibold">{fleetCode}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {job.vehicle?.year} {job.vehicle?.make} {job.vehicle?.model}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {unitNumber ? `Unit: ${unitNumber}` : job.vehicle?.tireSize || '11R22.5'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="truncate font-medium text-slate-800 flex items-center gap-1.5">
                          <MapPin size={13} className="text-red-500 shrink-0" />
                          <span className="truncate">{job.serviceAddress || job.locationAddress}</span>
                        </div>
                        {job.problemNotes && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {job.problemNotes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {job.driver ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                              <UserCheck size={13} className="text-emerald-600" />
                              <span>{job.driver.fullName}</span>
                            </div>
                            {(job.driverEtaMinutes || job.driverEstimatedArrivalAt) && (
                              <div className="text-[10px] font-mono text-emerald-700 font-semibold flex items-center gap-1 pl-4" title="Technician Driving ETA">
                                <Zap className="w-2.5 h-2.5 text-emerald-600" />
                                <span>
                                  {job.driverEtaMinutes && job.driverEtaMinutes <= 180
                                    ? `Drive ETA: ~${job.driverEtaMinutes}m`
                                    : job.driverEtaMinutes
                                    ? `Out of Region (~${Math.round(job.driverEtaMinutes * 0.75)} km)`
                                    : `Arrives ~${formatTimeInTz(job.driverEstimatedArrivalAt, jobTz)}`}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssignJob(job);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>Dispatch Driver</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {!job.driverId && (job.status === 'PENDING' || job.status === 'UNVERIFIED_PUBLIC') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssignJob(job);
                            }}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition cursor-pointer"
                          >
                            Assign Driver
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(job);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer shadow-2xs"
                          title="View Fleet Work Order Details"
                        >
                          <Eye size={13} className="text-slate-500" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              totalCount={meta.total}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedJob && (
        <Suspense fallback={null}>
          <FleetJobDetailModal
            isOpen={Boolean(selectedJob)}
            onClose={() => setSelectedJob(null)}
            job={liveSelectedJob}
          />
        </Suspense>
      )}

      {assignJob && (
        <Suspense fallback={null}>
          <AssignDriverModal
            isOpen={Boolean(assignJob)}
            onClose={() => {
              setAssignJob(null);
              refetch();
            }}
            job={assignJob}
          />
        </Suspense>
      )}

      {isCreateOpen && (
        <Suspense fallback={null}>
          <CreateFleetJobModal
            isOpen={isCreateOpen}
            onClose={() => {
              setIsCreateOpen(false);
              refetch();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
