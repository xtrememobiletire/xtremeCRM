export type JobLifecycleTabType = 'ACTIVE' | 'COMPLETED';

interface JobLifecycleTabsProps {
  activeTab: JobLifecycleTabType;
  onChangeTab: (tab: JobLifecycleTabType) => void;
  activeCount?: number;
  completedCount?: number;
  activeLabel?: string;
  completedLabel?: string;
  showCount?: boolean;
}

export default function JobLifecycleTabs({
  activeTab,
  onChangeTab,
  activeCount,
  completedCount,
  activeLabel = 'Active Orders',
  completedLabel = 'Completed',
  showCount = false,
}: JobLifecycleTabsProps) {
  const tabs = [
    {
      id: 'ACTIVE' as const,
      label: activeLabel,
      count: activeCount,
    },
    {
      id: 'COMPLETED' as const,
      label: completedLabel,
      count: completedCount,
    },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto select-none">
      {tabs.map((tab) => {
        const isSelected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              isSelected
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <span>{tab.label}</span>
            {showCount && typeof tab.count === 'number' && tab.count > 0 && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full min-w-5 text-center ${
                  isSelected
                    ? tab.id === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-900 text-white'
                    : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
