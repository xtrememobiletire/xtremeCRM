import { 
  Layers, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  UploadCloud 
} from 'lucide-react';
import type { AvailableBatch } from '../../services/leadService';

interface VaBatchHubProps {
  batches: AvailableBatch[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectBatch: (batchId: string | null) => void;
  onOpenUpload?: () => void;
}

export default function VaBatchHub({
  batches,
  isLoading,
  onRefresh,
  onSelectBatch,
  onOpenUpload,
}: VaBatchHubProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-4 py-2">
      {/* Sleek Action Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
            <Layers className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Active Calling Campaigns ({batches.length})
            </h2>
            <p className="text-xs text-slate-500">
              Pick a live operational batch below or pull next lead via Auto-FIFO.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenUpload && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition cursor-pointer shadow-2xs"
              title="Upload leads spreadsheet to an existing batch"
            >
              <UploadCloud size={14} className="text-slate-600" />
              <span>Upload Spreadsheet</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectBatch(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            title="Automatically pull the next lead in FIFO order from any active campaign"
          >
            <span>Auto-FIFO (Any Batch)</span>
            <ArrowRight size={13} />
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition cursor-pointer"
            title="Refresh available campaigns"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Available Active Batches List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers size={16} className="text-slate-500" />
            <span>Active Live Campaigns Ready to Call ({batches.length})</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            Strictly active within operational window
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-3xl">
            Loading active campaigns...
          </div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl">
            <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No active campaigns available right now</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              All active day batches have been exhausted or are awaiting scheduled release by Admin/GM.
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer border border-slate-200"
            >
              <RefreshCw size={12} />
              <span>Check Again</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {batches.map((batch) => {
              const flagEmoji = batch.countryCode === 'US' ? '🇺🇸' : batch.countryCode === 'UK' ? '🇬🇧' : '🇨🇦';
              const regionName = batch.countryCode === 'US' ? 'United States' : batch.countryCode === 'UK' ? 'United Kingdom' : 'Canada';

              return (
                <div
                  key={batch.id}
                  className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                        <span>{flagEmoji}</span>
                        <span>{batch.countryCode}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({regionName})</span>
                      </span>

                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Live Now
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition">
                      {batch.batchName}
                    </h4>

                    <div className="mt-2 text-xs font-semibold text-blue-700 flex items-center gap-1">
                      <span>🚀</span>
                      <strong className="font-mono">{batch.unassignedLeads}</strong>
                      <span>unassigned leads waiting</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectBatch(batch.id)}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-2xs active:scale-[0.98]"
                  >
                    <span>Enter Campaign & Start Dialing</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
