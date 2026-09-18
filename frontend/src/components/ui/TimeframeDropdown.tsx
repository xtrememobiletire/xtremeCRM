import { Calendar } from 'lucide-react';

interface TimeframeDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options?: { label: string; value: string }[];
  className?: string;
}

const defaultOptions = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

export default function TimeframeDropdown({
  value,
  onChange,
  options = defaultOptions,
  className = '',
}: TimeframeDropdownProps) {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Calendar className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-base pl-8 pr-7 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
