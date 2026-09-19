import { Search, Filter } from 'lucide-react';
import { JOB_STATUSES, JOB_URGENCIES } from '../../constants/statuses';

interface JobFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  urgency: string;
  onUrgencyChange: (value: string) => void;
}

export default function JobFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  urgency,
  onUrgencyChange,
}: JobFiltersProps) {
  return (
    <div className="card-surface p-3 sm:p-4 mb-4 flex flex-col sm:flex-row items-center gap-3">
      {/* Search Input */}
      <div className="relative flex-1 w-full">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by job #, customer phone, name, or vehicle..."
          className="input-base pl-9 py-1.5 text-xs sm:text-sm"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="flex items-center gap-1.5 w-1/2 sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="select-base py-1.5 text-xs font-medium cursor-pointer"
          >
            <option value="">All Statuses</option>
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="w-1/2 sm:w-auto">
          <select
            value={urgency}
            onChange={(e) => onUrgencyChange(e.target.value)}
            className="select-base py-1.5 text-xs font-medium cursor-pointer"
          >
            <option value="">All Urgencies</option>
            {JOB_URGENCIES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
