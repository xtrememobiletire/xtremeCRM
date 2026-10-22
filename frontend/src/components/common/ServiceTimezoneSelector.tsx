import React from 'react';
import { Globe } from 'lucide-react';

interface ServiceTimezoneSelectorProps {
  value: string;
  onChange: (tz: string) => void;
  label?: string;
  className?: string;
}

const COMMON_TIMEZONES = [
  { value: 'America/Toronto', label: 'Eastern Time (Toronto / Montreal / Ottawa)' },
  { value: 'America/New_York', label: 'Eastern Time (New York / Miami / Atlanta)' },
  { value: 'America/Chicago', label: 'Central Time (Chicago / Dallas / Winnipeg)' },
  { value: 'America/Denver', label: 'Mountain Time (Denver / Calgary / Edmonton)' },
  { value: 'America/Edmonton', label: 'Mountain Time (Alberta / Edmonton)' },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver / BC)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles / Seattle / Portland)' },
  { value: 'America/Halifax', label: 'Atlantic Time (Halifax / Nova Scotia)' },
  { value: 'America/St_Johns', label: 'Newfoundland Time (St. John\'s)' },
  { value: 'Europe/London', label: 'UK Time (London / Manchester / Edinburgh)' },
];

export const ServiceTimezoneSelector: React.FC<ServiceTimezoneSelectorProps> = ({
  value,
  onChange,
  label = 'Service Location Timezone',
  className = '',
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span>{label}</span>
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer shadow-2xs"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
          {!COMMON_TIMEZONES.some((t) => t.value === value) && (
            <option value={value}>{value}</option>
          )}
        </select>
      </div>
    </div>
  );
};
