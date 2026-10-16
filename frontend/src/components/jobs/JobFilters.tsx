import { Search, Filter } from 'lucide-react';
import { JOB_URGENCIES, URGENCIES } from '../../constants/statuses';
import JobLifecycleTabs, { type JobLifecycleTabType } from '../common/JobLifecycleTabs';

interface JobFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  urgency: string;
  onUrgencyChange: (value: string) => void;
  lifecycleTab: JobLifecycleTabType;
  onLifecycleTabChange: (tab: JobLifecycleTabType) => void;
}

export default function JobFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  urgency,
  onUrgencyChange,
  lifecycleTab,
  onLifecycleTabChange,
}: JobFiltersProps) {
  const isCompletedTab = lifecycleTab === 'COMPLETED';

  const handleStatusSelect = (val: string) => {
    if (val === 'COMPLETED') {
      onLifecycleTabChange('COMPLETED');
      onStatusChange('COMPLETED');
    } else if (val === 'ACTIVE' || val === '') {
      onLifecycleTabChange('ACTIVE');
      onStatusChange('');
    } else {
      if (isCompletedTab) {
        onLifecycleTabChange('ACTIVE');
      }
      onStatusChange(val);
    }
  };

  return (
    <div className="card-surface p-3 sm:p-4 mb-4 flex flex-col gap-3">
      {/* Top Bar: Lifecycle Segmented Tabs + Urgency & Status Dropdowns */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <JobLifecycleTabs
          activeTab={lifecycleTab}
          onChangeTab={(tab) => {
            onLifecycleTabChange(tab);
            if (tab === 'COMPLETED') {
              onStatusChange('COMPLETED');
            } else if (status === 'COMPLETED') {
              onStatusChange('');
            }
          }}
          activeLabel="Active Orders"
          completedLabel="Completed"
        />

        <div className="flex items-center gap-2">
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 min-w-[170px]">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={isCompletedTab ? 'COMPLETED' : status}
              onChange={(e) => handleStatusSelect(e.target.value)}
              className="select-base py-1.5 text-xs font-semibold cursor-pointer w-full"
            >
              {isCompletedTab ? (
                <>
                  <option value="COMPLETED">Completed Orders</option>
                  <option value="ACTIVE">← Back to Active Orders</option>
                </>
              ) : (
                <>
                  <option value="">All Active Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="EN_ROUTE">En Route</option>
                  <option value="ON_SCENE">On Scene</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="COMPLETED">Completed Orders →</option>
                </>
              )}
            </select>
          </div>

          {/* Urgency Dropdown */}
          <div className="min-w-[130px]">
            <select
              value={urgency}
              onChange={(e) => onUrgencyChange(e.target.value)}
              className="select-base py-1.5 text-xs font-medium cursor-pointer w-full"
            >
              <option value="">All Urgencies</option>
              {JOB_URGENCIES.map((u) => (
                <option key={u} value={u}>
                  {URGENCIES[u]?.label || u}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Search Input */}
      <div className="relative w-full">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by job #, customer phone, name, or vehicle..."
          className="input-base pl-9 py-1.5 text-xs sm:text-sm"
        />
      </div>
    </div>
  );
}
