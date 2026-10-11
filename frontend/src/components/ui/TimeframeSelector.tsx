import React from 'react';
import { Calendar, TrendingUp, Globe } from 'lucide-react';

export type TimeframePeriod = 'MONTH' | 'YEAR' | 'ALL_TIME';

export interface TimeframeSelectorProps {
  value: TimeframePeriod;
  onChange: (value: TimeframePeriod) => void;
  className?: string;
  size?: 'sm' | 'md';
}

const TIMEFRAME_OPTIONS: {
  id: TimeframePeriod;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'MONTH',
    label: 'This Month',
    shortLabel: 'Month',
    icon: Calendar,
  },
  {
    id: 'YEAR',
    label: 'This Year',
    shortLabel: 'Year',
    icon: TrendingUp,
  },
  {
    id: 'ALL_TIME',
    label: 'Lifetime',
    shortLabel: 'All-Time',
    icon: Globe,
  },
];

export default function TimeframeSelector({
  value,
  onChange,
  className = '',
  size = 'sm',
}: TimeframeSelectorProps) {
  const isSm = size === 'sm';

  return (
    <div
      role="group"
      aria-label="Select timeframe"
      className={`inline-flex items-center p-1 bg-slate-100/90 hover:bg-slate-100 border border-slate-200 rounded-xl select-none transition-colors ${className}`}
    >
      {TIMEFRAME_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isSelected = value === opt.id;

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex items-center gap-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              isSm ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
            } ${
              isSelected
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Icon
              className={`${isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${
                isSelected ? 'text-red-600' : 'text-slate-400'
              }`}
            />
            <span className="hidden sm:inline">{opt.label}</span>
            <span className="sm:hidden">{opt.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
