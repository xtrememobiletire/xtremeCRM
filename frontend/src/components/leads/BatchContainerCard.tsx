import { 
  Play, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Send,
  XSquare
} from 'lucide-react';

export interface BatchItem {
  id: string;
  batchName: string;
  countryCode: 'CA' | 'US' | 'UK';
  status: 'ACTIVE' | 'SCHEDULED' | 'COMPLETED' | string;
  scheduledDate: string | null;
  totalLeads: number;
  unassignedLeads: number;
  heldLeads: number;
  completedLeads: number;
  createdAt: string;
}

interface BatchContainerCardProps {
  batch: BatchItem;
  onInspect: (batchId: string) => void;
  onStart?: (batchId: string) => void;
  onClose?: (batchId: string) => void;
  onDistribute?: (batchId: string) => void;
  isAdmin?: boolean;
}

export default function BatchContainerCard({
  batch,
  onInspect,
  onStart,
  onClose,
  onDistribute,
  isAdmin = false,
}: BatchContainerCardProps) {
  const isScheduled = batch.status === 'SCHEDULED';
  const isActive = batch.status === 'ACTIVE';
  const isCompleted = batch.status === 'COMPLETED';

  const total = Number(batch.totalLeads) || 0;
  const unassigned = Number(batch.unassignedLeads) || 0;
  const held = Number(batch.heldLeads) || 0;
  const completed = Number(batch.completedLeads) || 0;

  const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const flagEmoji = batch.countryCode === 'US' ? '🇺🇸' : batch.countryCode === 'UK' ? '🇬🇧' : '🇨🇦';

  return (
    <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-2xs hover:shadow-xs transition flex flex-col justify-between gap-3.5">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
              <span>{flagEmoji}</span>
              <span>{batch.countryCode}</span>
            </span>

            {isActive && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Campaign
              </span>
            )}
            {isScheduled && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                <Clock size={11} className="text-slate-500" />
                Scheduled
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                <CheckCircle2 size={11} className="text-slate-500" />
                Completed
              </span>
            )}
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            {new Date(batch.createdAt).toLocaleDateString()}
          </span>
        </div>

        <h3 className="text-sm font-bold text-slate-900 truncate" title={batch.batchName}>
          {batch.batchName}
        </h3>

        {batch.scheduledDate && (
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
            <Clock size={11} className="text-slate-400" />
            <span>Target: {new Date(batch.scheduledDate).toLocaleString()}</span>
          </p>
        )}
      </div>

      {/* Progress & Metrics */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
          <span>Campaign Progress</span>
          <span className="font-mono text-slate-900 font-bold">{completedPct}% exhausted</span>
        </div>

        {/* Sleek Minimal Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            style={{ width: `${completedPct}%` }} 
            className="h-full bg-red-600 transition-all duration-300 rounded-full" 
          />
        </div>

        {/* Unified Neutral Counter Tiles */}
        <div className="grid grid-cols-4 gap-1.5 pt-1 text-center font-mono">
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/60">
            <div className="text-[10px] uppercase font-medium text-slate-500">Total</div>
            <div className="text-xs font-bold text-slate-900 mt-0.5">{total}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/60">
            <div className="text-[10px] uppercase font-medium text-slate-500">Uncalled</div>
            <div className="text-xs font-bold text-slate-900 mt-0.5">{unassigned}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/60">
            <div className="text-[10px] uppercase font-medium text-slate-500">In Calling</div>
            <div className="text-xs font-bold text-slate-900 mt-0.5">{held}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/60">
            <div className="text-[10px] uppercase font-medium text-slate-500">Done</div>
            <div className="text-xs font-bold text-slate-900 mt-0.5">{completed}</div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onInspect(batch.id)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer shadow-2xs"
        >
          <span>Inspect Leads</span>
          <ArrowRight size={13} />
        </button>

        {isAdmin && isScheduled && onStart && (
          <button
            type="button"
            onClick={() => onStart(batch.id)}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer border border-slate-200"
            title="Start Batch Immediately"
          >
            <Play size={13} />
          </button>
        )}

        {isAdmin && isActive && onDistribute && unassigned > 0 && (
          <button
            type="button"
            onClick={() => onDistribute(batch.id)}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer border border-slate-200"
            title="Distribute to Online VAs"
          >
            <Send size={13} />
          </button>
        )}

        {isAdmin && isActive && onClose && (
          <button
            type="button"
            onClick={() => onClose(batch.id)}
            className="p-2 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-bold transition cursor-pointer"
            title="Close / Complete Batch Early"
          >
            <XSquare size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
