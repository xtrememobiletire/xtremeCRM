import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Layers, 
  CheckCircle2, 
  XCircle, 
  PhoneCall,
  Truck,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { api } from '../../utils/api';
import TimeframeSelector, { type TimeframePeriod } from '../ui/TimeframeSelector';

interface BatchStatsSummary {
  id: string;
  batchName: string;
  countryCode: string;
  totalLeads: number;
  unassignedLeads: number;
  heldLeads: number;
  completedLeads: number;
}

interface LeadCommandCenterProps {
  country: string;
  isAdminOrGm: boolean;
  isDispatcher?: boolean;
  onSelectTab: (tab: any) => void;
  batch?: BatchStatsSummary | null;
}

export default function LeadCommandCenter({
  country,
  isAdminOrGm,
  isDispatcher = false,
  onSelectTab,
  batch = null,
}: LeadCommandCenterProps) {
  const [timeframe, setTimeframe] = useState<TimeframePeriod>('ALL_TIME');
  const isAuthorized = isAdminOrGm || isDispatcher;

  const batchId = batch?.id;
  const { data: statsResponse, isLoading } = useQuery({
    queryKey: ['lead-stats', country, timeframe, batchId],
    queryFn: async () => {
      const res = await api.get('/leads/stats', {
        params: {
          countryCode: country,
          timeframe: batch ? undefined : timeframe,
          batchId: batchId || undefined,
        },
      });
      return res.data?.data;
    },
    enabled: isAuthorized,
    refetchInterval: 15000,
  });

  if (!isAuthorized) return null;

  const stats = statsResponse || {
    total: 0,
    unassigned: 0,
    inProgress: 0,
    callbacks: 0,
    dispatcherReview: 0,
    testService: 0,
    adminApproval: 0,
    pendingGmSignoff: 0,
    converted: 0,
    disqualified: 0,
  };

  const unassignedCount = stats.unassigned || 0;
  const inProgressCount = stats.inProgress || 0;
  const callbacksCount = stats.callbacks || 0;
  const dispatcherCount = stats.dispatcherReview || 0;
  const approvalCount = stats.pendingGmSignoff || stats.adminApproval || 0;
  const convertedCount = stats.converted || 0;
  const disqualifiedCount = stats.disqualified || 0;

  return (
    <div className="space-y-3">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
            <Layers className="w-4 h-4 text-slate-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                {batch ? `Batch Metrics: ${batch.batchName}` : 'Lead Performance & Outreach Command'}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700 font-mono">
                {batch ? batch.countryCode : `${country} Region`}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {batch 
                ? 'Outreach indicators and disposition outcomes scoped specifically to this batch.'
                : 'Live outreach indicators and pipeline conversion metrics.'}
            </p>
          </div>
        </div>

        {!batch && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <TimeframeSelector
              value={timeframe}
              onChange={setTimeframe}
              size="sm"
            />
          </div>
        )}
      </div>

      {/* 6 Full Lifecycle KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        
        {/* Card 1: Unassigned Cold Pool */}
        <div 
          onClick={() => onSelectTab('unassigned')}
          className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs transition cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                1. Unassigned
              </span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {isLoading && !batch ? '...' : unassignedCount}
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            Awaiting VA pickup
          </div>
        </div>

        {/* Card 2: In Outreach & Callbacks */}
        <div 
          onClick={() => onSelectTab('assigned')}
          className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs transition cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                2. In Outreach
              </span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {isLoading && !batch ? '...' : inProgressCount}
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
              <PhoneCall className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>VA active calling</span>
            {callbacksCount > 0 && (
              <span className="text-blue-700 font-bold flex items-center gap-0.5">
                <Calendar size={10} />
                <span>{callbacksCount}</span>
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Dispatcher Review */}
        <div 
          onClick={() => onSelectTab('dispatcher')}
          className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs transition cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                3. Dispatch Review
              </span>
              <div className="text-xl font-bold font-mono text-purple-900 mt-1">
                {isLoading && !batch ? '...' : dispatcherCount}
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-purple-700 font-medium">
            Feasibility & Trials
          </div>
        </div>

        {/* Card 4: GM / Admin Approval */}
        <div 
          onClick={() => onSelectTab('approval')}
          className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs transition cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                4. GM Approval
              </span>
              <div className="text-xl font-bold font-mono text-indigo-900 mt-1">
                {isLoading && !batch ? '...' : approvalCount}
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-indigo-700 font-medium">
            Pending Signoff
          </div>
        </div>

        {/* Card 5: Converted Fleets */}
        <div 
          onClick={() => onSelectTab('converted')}
          className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs transition cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                5. Converted
              </span>
              <div className="text-xl font-bold font-mono text-emerald-900 mt-1">
                {isLoading && !batch ? '...' : convertedCount}
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-emerald-700 font-medium">
            Won B2B Fleets
          </div>
        </div>

        {/* Card 6: Disqualified Audit */}
        <div 
          onClick={() => onSelectTab('disqualified')}
          className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs transition cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                6. Disqualified
              </span>
              <div className="text-xl font-bold font-mono text-rose-900 mt-1">
                {isLoading && !batch ? '...' : disqualifiedCount}
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-rose-700 font-medium">
            Audited Drop-offs
          </div>
        </div>

      </div>
    </div>
  );
}
