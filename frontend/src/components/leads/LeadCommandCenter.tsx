import { useQuery } from '@tanstack/react-query';
import { 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Wrench, 
  FileCheck, 
  PlayCircle,
  ArrowRight
} from 'lucide-react';
import { api } from '../../utils/api';

interface LeadCommandCenterProps {
  country: string;
  isAdminOrGm: boolean;
  onSelectTab: (tab: 'va' | 'callbacks' | 'dispatcher' | 'admin' | 'disqualified') => void;
  onStartDistribution?: () => void;
  onOpenUpload?: () => void;
}

export default function LeadCommandCenter({
  country,
  isAdminOrGm,
  onSelectTab,
  onStartDistribution,
  onOpenUpload,
}: LeadCommandCenterProps) {
  const { data: statsResponse } = useQuery({
    queryKey: ['lead-stats', country],
    queryFn: async () => {
      const res = await api.get(`/leads/stats?countryCode=${country}`);
      return res.data?.data;
    },
    enabled: isAdminOrGm,
    refetchInterval: 15000,
  });

  if (!isAdminOrGm) return null;

  const stats = statsResponse || {
    total: 0,
    unassigned: 0,
    inProgress: 0,
    dispatcherReview: 0,
    testService: 0,
    adminApproval: 0,
    converted: 0,
    disqualified: 0,
    vaWorkloads: [],
  };

  const unassignedCount = stats.unassigned || 0;
  const adminApprovalCount = stats.adminApproval || 0;
  const dispatcherReviewCount = (stats.dispatcherReview || 0) + (stats.testService || 0);

  return (
    <div className="space-y-4 mb-6">
      {/* TIER 1: CRITICAL ACTION ALERTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Unassigned Leads Card */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          unassignedCount > 0 
            ? 'bg-amber-50/70 border-amber-200 text-amber-950 shadow-xs' 
            : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${
                unassignedCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
              }`}>
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Unassigned Outreach Pool
                </span>
                <div className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">
                  {unassignedCount} <span className="text-xs font-semibold text-slate-500">leads idle</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600">
              {unassignedCount > 0 ? 'Ready for auto-distribution' : 'Pool fully distributed'}
            </span>
            {unassignedCount > 0 && onStartDistribution ? (
              <button
                type="button"
                onClick={onStartDistribution}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Distribute</span>
              </button>
            ) : onOpenUpload ? (
              <button
                type="button"
                onClick={onOpenUpload}
                className="text-xs font-bold text-slate-700 hover:text-slate-900 underline cursor-pointer"
              >
                + Import More
              </button>
            ) : null}
          </div>
        </div>

        {/* Pending GM Contract Signoff Card */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          adminApprovalCount > 0 
            ? 'bg-purple-50/70 border-purple-200 text-purple-950 shadow-xs' 
            : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${
                adminApprovalCount > 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
              }`}>
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Pending GM Onboarding Signoff
                </span>
                <div className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">
                  {adminApprovalCount} <span className="text-xs font-semibold text-slate-500">awaiting signoff</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600">
              {adminApprovalCount > 0 ? 'Trial completed, needs conversion' : 'No pending contract signoffs'}
            </span>
            <button
              type="button"
              onClick={() => onSelectTab('admin')}
              className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 transition cursor-pointer"
            >
              <span>Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dispatch Feasibility & Trials Card */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 ${
          dispatcherReviewCount > 0 
            ? 'bg-blue-50/70 border-blue-200 text-blue-950 shadow-xs' 
            : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${
                dispatcherReviewCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
              }`}>
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Dispatcher Feasibility & Trials
                </span>
                <div className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">
                  {dispatcherReviewCount} <span className="text-xs font-semibold text-slate-500">in review/test</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600">
              {stats.testService || 0} active trial work orders
            </span>
            <button
              type="button"
              onClick={() => onSelectTab('dispatcher')}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 transition cursor-pointer"
            >
              <span>View Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* TIER 2: PIPELINE OVERVIEW & VA WORKLOAD STATUS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3.5 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Pipeline Health & Concurrency</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 uppercase font-mono">
                {country} Region
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Total database leads ingested: <strong className="text-slate-800">{stats.total}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-500">In Active Outreach:</span>
              <span className="font-bold text-slate-900">{stats.inProgress || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Converted:</span>
              <span className="font-bold text-emerald-950">{stats.converted || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Disqualified:</span>
              <span className="font-bold text-rose-950">{stats.disqualified || 0}</span>
            </div>
          </div>
        </div>

        {/* VA Concurrency Grid (1-Cap Workload) */}
        <div className="mt-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-2 flex items-center justify-between">
            <span>Active VA Outreach Load (1-Cap Focus Mode)</span>
            <span className="text-slate-400 font-normal normal-case">
              {stats.vaWorkloads?.length || 0} agents active
            </span>
          </div>

          {stats.vaWorkloads && stats.vaWorkloads.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {stats.vaWorkloads.map((va: any) => {
                const count = va.activeCount || 0;
                const isFull = count >= 1;
                return (
                  <div 
                    key={va.id}
                    className={`p-2.5 rounded-xl border text-xs transition ${
                      isFull 
                        ? 'bg-slate-50 border-slate-300 text-slate-700' 
                        : count > 0 
                        ? 'bg-blue-50/50 border-blue-200 text-blue-900' 
                        : 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <div className="font-bold truncate" title={va.fullName}>
                      {va.fullName}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-slate-500">Slots:</span>
                      <span className="font-mono font-bold">
                        {count}/1
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-200 h-1 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFull ? 'bg-amber-500' : count > 0 ? 'bg-blue-600' : 'bg-emerald-500'
                        }`} 
                        style={{ width: `${Math.min(100, (count / 5) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic py-2">
              No prospecting agents registered or online in {country} region.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
