import { RefreshCw, Wrench, ShieldCheck } from 'lucide-react';
import type { User } from '../../context/AuthContext';

interface TechnicianHeaderProps {
  user: User | null;
  pendingCount: number;
  activeCount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export default function TechnicianHeader({
  user,
  pendingCount,
  activeCount,
  isRefreshing,
  onRefresh,
}: TechnicianHeaderProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Wrench className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {user?.fullName || 'Field Technician'}
            </h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              On Duty
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {activeCount > 0 ? (
              <span>{activeCount} job in progress</span>
            ) : pendingCount > 0 ? (
              <span className="text-amber-700 font-semibold">{pendingCount} new dispatch awaiting accept</span>
            ) : (
              <span>Queue is up to date</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
          title="Refresh assignments"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
