import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Layers, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  PhoneCall
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
  onStartDistribution?: () => void;
  onOpenUpload?: () => void;
  batch?: BatchStatsSummary | null;
}

export default function LeadCommandCenter({
  country,
  isAdminOrGm,
  isDispatcher = false,
  onSelectTab,
  onOpenUpload,
  batch = null,
}: LeadCommandCenterProps) {
  const [timeframe, setTimeframe] = useState<TimeframePeriod>('ALL_TIME');
  const isAuthorized = isAdminOrGm || isDispatcher;

  // Query global/regional pipeline stats if not strictly scoped to a batch
  const { data: statsResponse, isLoading } = useQuery({
    queryKey: ['lead-stats', country, timeframe],
    queryFn: async () => {
      const res = await api.get(`/leads/stats?countryCode=${country}&timeframe=${timeframe}`);
      return res.data?.data;
    },
    enabled: isAuthorized && !batch,
    refetchInterval: 15000,
  });

  if (!isAuthorized) return null;

  const stats = statsResponse || {
    total: 0,
    unassigned: 0,
    inProgress: 0,
    called: 0,
    converted: 0,
    disqualified: 0,
    conversionRate: 0,
    disqualificationRate: 0,
  };

  // If batch is provided, metrics are batch-specific; otherwise regional/global
  const totalCount = batch ? Number(batch.totalLeads || 0) : (stats.total || 0);
  const unassignedCount = batch ? Number(batch.unassignedLeads || 0) : (stats.unassigned || 0);
  const calledCount = batch ? Number(batch.heldLeads || 0) : (stats.called || stats.inProgress || 0);
  const convertedCount = batch ? Number(batch.completedLeads || 0) : (stats.converted || 0);
  const disqualifiedCount = stats.disqualified || 0;

  return (
    <div className="space-y-3">
      {/* Sleek Header Bar */}
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

      {/* 4 Professional KPI Metric Cards - Unified Single Color Scheme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Card 1: Total Ingested Leads */}
        <div 
          onClick={() => onSelectTab('all')}
          className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs transition cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Total Ingested Leads
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {isLoading && !batch ? <span className="text-slate-300">...</span> : totalCount}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
              <Layers className="w-4 h-4 text-slate-600" />
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              <strong className="text-slate-900 font-mono font-bold">{unassignedCount}</strong> unassigned idle
            </span>
            {isAdminOrGm && onOpenUpload && (
              <span className="text-[11px] font-semibold text-slate-500 group-hover:text-red-600 transition">
                View Pool →
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Whom We Called */}
        <div 
          onClick={() => onSelectTab('called')}
          className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs transition cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Whom We Called
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {isLoading && !batch ? <span className="text-slate-300">...</span> : calledCount}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
              <PhoneCall className="w-4 h-4 text-slate-600" />
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              <strong className="text-slate-900 font-mono font-bold">{calledCount}</strong> in calling queue
            </span>
            <span className="text-[11px] font-semibold text-slate-500 group-hover:text-red-600 transition">
              Inspect →
            </span>
          </div>
        </div>

        {/* Card 3: Disqualified Leads */}
        <div 
          onClick={() => onSelectTab('disqualified')}
          className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs transition cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Disqualified Leads
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {isLoading && !batch ? <span className="text-slate-300">...</span> : disqualifiedCount}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 text-rose-600 border border-slate-100">
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Review reason audits</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 group-hover:text-red-600 transition">
              <span>Audit</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Converted to Fleet */}
        <div 
          onClick={() => onSelectTab('converted')}
          className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs transition cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Converted to Fleet
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {isLoading && !batch ? <span className="text-slate-300">...</span> : convertedCount}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 text-emerald-600 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="text-emerald-700 font-semibold font-mono">
              Won Commercial Fleets
            </span>
            <span className="text-[11px] font-semibold text-slate-500 group-hover:text-red-600 transition">
              View Fleets →
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
