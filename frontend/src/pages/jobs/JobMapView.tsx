import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, RefreshCw, MapPin } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import JobMap from '../../components/maps/JobMap';
import { mapService, type MapJob } from '../../services/mapService';
import { useTenant } from '../../context/TenantContext';

export default function JobMapView() {
  const { country } = useTenant();
  const [search, setSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ['jobs-map-view', country],
    queryFn: () => mapService.getJobs({ countryCode: country }),
  });

  const filtered = jobs.filter((j) => {
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? j.status === 'ASSIGNED' || j.status === 'IN_PROGRESS' || j.status === 'PENDING'
        : j.status === statusFilter;

    const term = search.toLowerCase().trim();
    if (!term) return matchesStatus;

    const matchesSearch =
      j.jobCode.toLowerCase().includes(term) ||
      (j.serviceAddress && j.serviceAddress.toLowerCase().includes(term)) ||
      (j.customer?.fullName && j.customer.fullName.toLowerCase().includes(term));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Job Service Map"
          subtitle="Spatial view of all roadside emergency and scheduled service tickets"
        />
        <button
          type="button"
          onClick={() => refetch()}
          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Map Canvas (8 cols) */}
        <div className="lg:col-span-8">
          <JobMap
            jobs={filtered}
            selectedJobId={selectedJobId}
            onSelectJob={(j: MapJob) => setSelectedJobId(j.id)}
            height="620px"
          />
        </div>

        {/* Directory Sidebar (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col h-[620px] overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by job code, address..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
              />
            </div>

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

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading service jobs...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No jobs found</div>
            ) : (
              filtered.map((j) => {
                const isSelected = selectedJobId === j.id;
                return (
                  <div
                    key={j.id}
                    onClick={() => setSelectedJobId(j.id)}
                    className={`p-3 rounded-xl cursor-pointer transition border text-left space-y-1 ${
                      isSelected
                        ? 'bg-red-50/60 border-red-200 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900">#{j.jobCode}</span>
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {j.status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800">{j.customer?.fullName || j.recipientName || 'Customer'}</p>
                    <p className="text-[11px] text-slate-500 flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                      <span>{j.serviceAddress}</span>
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
