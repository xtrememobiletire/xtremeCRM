import { Globe } from 'lucide-react';

export type SupportedCountry = 'CA' | 'US' | 'UK';

interface CountrySiloSelectorProps {
  country: SupportedCountry;
  onChange: (country: SupportedCountry) => void;
  stepNumber?: number | string;
  label?: string;
  subtitle?: string;
  className?: string;
}

const COUNTRIES: Array<{ code: SupportedCountry; label: string }> = [
  { code: 'CA', label: '🇨🇦 Canada (CAD)' },
  { code: 'US', label: '🇺🇸 United States (USD)' },
  { code: 'UK', label: '🇬🇧 United Kingdom (GBP)' },
];

export default function CountrySiloSelector({
  country,
  onChange,
  stepNumber = 1,
  label = 'Operating Country / Currency Silo',
  subtitle = 'Cross-Border Dispatch Silo',
  className = '',
}: CountrySiloSelectorProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          {stepNumber !== undefined && (
            <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] font-mono flex items-center justify-center font-bold shrink-0">
              {stepNumber}
            </span>
          )}
          <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{label}</span>
        </span>
        {subtitle && <span className="text-[11px] font-mono text-slate-400">{subtitle}</span>}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {COUNTRIES.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => onChange(c.code)}
            className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              country === c.code
                ? 'border-red-600 bg-red-50 text-red-700 shadow-2xs'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span>{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
