import { useState } from 'react';
import { 
  Layers, 
  Search, 
  UploadCloud, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  TableProperties
} from 'lucide-react';
import BatchContainerCard, { type BatchItem } from './BatchContainerCard';

interface ManagementBatchDashboardProps {
  batches: BatchItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onInspectBatch: (batchId: string) => void;
  onOpenUpload: () => void;
  onOpenGlobalLedger: () => void;
  onStartBatch?: (batchId: string) => void;
  onCloseBatch?: (batchId: string) => void;
  onDistributeBatch?: (batchId: string) => void;
  isAdmin?: boolean;
}

export default function ManagementBatchDashboard({
  batches,
  isLoading,
  onRefresh,
  onInspectBatch,
  onOpenUpload,
  onOpenGlobalLedger,
  onStartBatch,
  onCloseBatch,
  onDistributeBatch,
  isAdmin = false,
}: ManagementBatchDashboardProps) {
  const [selectedStatus, setSelectedStatus] = useState<'ACTIVE' | 'SCHEDULED' | 'COMPLETED'>('ACTIVE');
  const [countryFilter, setCountryFilter] = useState<'ALL' | 'CA' | 'US' | 'UK'>('ALL');
  const [search, setSearch] = useState('');

  // Counts across status tabs
  const activeCount = batches.filter((b) => b.status === 'ACTIVE').length;
  const scheduledCount = batches.filter((b) => b.status === 'SCHEDULED').length;
  const completedCount = batches.filter((b) => b.status === 'COMPLETED').length;

  // Filtered batch list
  const filteredBatches = batches.filter((b) => {
    if (b.status !== selectedStatus) return false;
    if (countryFilter !== 'ALL' && b.countryCode !== countryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return b.batchName.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="text-red-600" size={18} />
            <span>Campaign Batches Dashboard</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organized outbound day batches across all target regional operating windows.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <UploadCloud size={14} />
              <span>Upload Spreadsheet</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenGlobalLedger}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer"
            title="Inspect all leads across all batches"
          >
            <TableProperties size={14} />
            <span>Global Master Ledger</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition cursor-pointer"
            title="Refresh Batches"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedStatus('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              selectedStatus === 'ACTIVE'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Active Batches</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 border border-slate-200 text-slate-700">
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('SCHEDULED')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              selectedStatus === 'SCHEDULED'
                ? 'bg-white text-amber-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={12} className="text-amber-500" />
            <span>Scheduled</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 border border-slate-200 text-slate-700">
              {scheduledCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('COMPLETED')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              selectedStatus === 'COMPLETED'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 size={12} className="text-slate-500" />
            <span>Previous / Completed</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 border border-slate-200 text-slate-700">
              {completedCount}
            </span>
          </button>
        </div>

        {/* Region & Search Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs font-semibold text-slate-600">
            {(['ALL', 'CA', 'US', 'UK'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setCountryFilter(r)}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                  countryFilter === r
                    ? 'bg-slate-900 text-white font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                {r === 'ALL' ? 'All Regions' : r === 'CA' ? '🇨🇦 CA' : r === 'US' ? '🇺🇸 US' : '🇬🇧 UK'}
              </button>
            ))}
          </div>

          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search batch name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>
      </div>

      {/* Batch Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl">
          Loading campaign batches...
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
          <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-700">
            No {selectedStatus.toLowerCase()} batches found
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {selectedStatus === 'ACTIVE'
              ? 'There are currently no active day batches running. Upload a spreadsheet or activate a scheduled batch to begin.'
              : selectedStatus === 'SCHEDULED'
              ? 'No batches scheduled for future release. When you upload leads with future release dates, they will appear here.'
              : 'No completed or closed batches recorded yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatches.map((b) => (
            <BatchContainerCard
              key={b.id}
              batch={b}
              onInspect={onInspectBatch}
              onStart={onStartBatch}
              onClose={onCloseBatch}
              onDistribute={onDistributeBatch}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
