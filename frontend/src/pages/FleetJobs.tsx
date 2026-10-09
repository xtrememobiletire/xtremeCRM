import { useState, useMemo } from 'react';
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
  Sparkles
} from 'lucide-react';
import FleetJobDetailModal from '../components/pages/jobs/FleetJobDetailModal';
import AssignDriverModal from '../components/pages/jobs/AssignDriverModal';
import CreateJobModal from '../components/pages/jobs/CreateJobModal';
import EmptyState from '../components/ui/EmptyState';
import { jobService } from '../services/jobService';
import { fleetService } from '../services/fleetService';
import { useTenant } from '../context/TenantContext';

export default function FleetJobs() {
  const { country: tenantCountry } = useTenant();
  const [selectedCountry, setSelectedCountry] = useState<string>(tenantCountry || 'CA');
  const [selectedFleetId, setSelectedFleetId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [assignJob, setAssignJob] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  // 1. Fetch Fleet Work Orders
  const { 
    data: jobsResponse, 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['fleet-jobs', selectedCountry, selectedFleetId, statusFilter, search, page],
    queryFn: () => jobService.getJobs({
      page,
      limit: 25,
      countryCode: selectedCountry,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search: search || undefined,
      fleetId: selectedFleetId || undefined,
      isFleetJob: 'true' as any,
    } as any),
  });

  // 2. Fetch Fleets for filter dropdown
  const { data: fleets = [] } = useQuery({
    queryKey: ['fleets-filter', selectedCountry],
    queryFn: async () => {
      const res = await fleetService.getFleets({ countryCode: selectedCountry });
      return res?.data || [];
    },
  });

  const rawJobs = jobsResponse?.data || [];
  const meta = jobsResponse?.pagination || { page: 1, totalPages: 1, total: 0 };

  // Calculate high-level summary counters
  const counters = useMemo(() => {
    return {
      total: meta.total,
      pending: rawJobs.filter((j: any) => j.status === 'PENDING').length,
      inProgress: rawJobs.filter((j: any) => ['ASSIGNED', 'IN_PROGRESS'].includes(j.status)).length,
      completed: rawJobs.filter((j: any) => j.status === 'COMPLETED').length,
    };
  }, [rawJobs, meta.total]);

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
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Pills */}
          {(['ALL', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === s
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}

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
                  const fleetName = job.fleet?.name || (isTrial ? 'Prospective Fleet (Trial)' : 'Commercial Account');
                  const fleetCode = job.fleet?.fleetCode || (isTrial ? 'TRIAL' : 'B2B');
                  const unitNumber = job.vehicle?.unitNumber;

                  return (
                    <tr 
                      key={job.id} 
                      className="hover:bg-slate-50/60 transition group cursor-pointer"
                      onClick={() => setSelectedJob(job)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{job.jobCode || job.jobNumber}</span>
                          {isTrial && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-sans font-bold text-[10px] flex items-center gap-1">
                              <Sparkles size={10} />
                              Trial
                            </span>
                          )}
                        </div>
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
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <UserCheck size={13} className="text-emerald-600" />
                            <span>{job.driver.fullName}</span>
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
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full font-bold text-[10px] tracking-wide ${
                            job.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : job.status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800'
                              : job.status === 'ASSIGNED'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        {!job.driverId && job.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssignJob(job);
                            }}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 px-2.5 py-1 rounded-md bg-red-50 hover:bg-red-100 transition cursor-pointer"
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
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md hover:bg-slate-200 transition cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedJob && (
        <FleetJobDetailModal
          isOpen={Boolean(selectedJob)}
          onClose={() => setSelectedJob(null)}
          job={selectedJob}
        />
      )}

      {assignJob && (
        <AssignDriverModal
          isOpen={Boolean(assignJob)}
          onClose={() => {
            setAssignJob(null);
            refetch();
          }}
          job={assignJob}
        />
      )}

      {isCreateOpen && (
        <CreateJobModal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
