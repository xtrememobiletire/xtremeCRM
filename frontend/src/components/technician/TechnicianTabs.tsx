export type TechnicianTabType = 'PENDING' | 'ACTIVE';

interface TechnicianTabsProps {
  activeTab: TechnicianTabType;
  onChangeTab: (tab: TechnicianTabType) => void;
  pendingCount: number;
  activeCount: number;
}

export default function TechnicianTabs({
  activeTab,
  onChangeTab,
  pendingCount,
  activeCount,
}: TechnicianTabsProps) {
  const tabs = [
    {
      id: 'PENDING' as const,
      label: 'Pending',
      count: pendingCount,
      highlight: pendingCount > 0,
    },
    {
      id: 'ACTIVE' as const,
      label: 'Active',
      count: activeCount,
      highlight: false,
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              isSelected
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center ${
                  isSelected
                    ? tab.highlight
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-100 text-slate-800'
                    : tab.highlight
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
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
