import { Phone, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { formatAsYouType, validateAndNormalizePhone } from '../../utils/phone';

interface PhoneInputFieldProps {
  value: string;
  onChange: (formattedValue: string) => void;
  countryCode?: string; // 'CA' | 'US' | 'UK'
  label?: string;
  stepNumber?: number | string;
  required?: boolean;
  placeholder?: string;
  isSearching?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  showVerifiedBadge?: boolean;
  className?: string;
}

export default function PhoneInputField({
  value,
  onChange,
  countryCode = 'CA',
  label = 'Phone Number',
  stepNumber,
  required = true,
  placeholder,
  isSearching = false,
  autoFocus = false,
  disabled = false,
  showVerifiedBadge = true,
  className = '',
}: PhoneInputFieldProps) {
  const normCountry = (countryCode || 'CA').toUpperCase();
  const countryDialText = normCountry === 'UK' ? '+44 (UK)' : normCountry === 'US' ? '+1 (US)' : '+1 (CA)';
  const prefix = normCountry === 'UK' ? '+44' : '+1';
  const defaultPlaceholder = normCountry === 'UK' ? '7123 456789' : '(416) 555-0199';

  const validation = value ? validateAndNormalizePhone(value, normCountry) : null;
  const isError = Boolean(value && validation && !validation.isValid);
  const isValid = Boolean(value && validation && validation.isValid);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAsYouType(e.target.value, normCountry);
    onChange(formatted);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          {stepNumber !== undefined && (
            <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 text-[10px] font-mono flex items-center justify-center font-bold shrink-0">
              {stepNumber}
            </span>
          )}
          <Phone className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span>
            {label} {required && <span className="text-red-500">*</span>}
          </span>
        </label>
        <span className="text-[11px] font-mono text-slate-400">
          Country Dial: <strong className="text-slate-700 font-bold">{countryDialText}</strong>
        </span>
      </div>

      <div
        className={`relative flex rounded-xl border transition-all shadow-2xs overflow-hidden bg-white ${
          isError
            ? 'border-red-400 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500'
            : 'border-slate-200 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500'
        } ${disabled ? 'bg-slate-50 opacity-70 cursor-not-allowed' : ''}`}
      >
        <span className="inline-flex items-center px-3.5 text-xs font-mono font-bold text-slate-600 bg-slate-50 border-r border-slate-200 select-none shrink-0">
          {prefix}
        </span>
        <input
          type="tel"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder || defaultPlaceholder}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          className="w-full px-3.5 py-2.5 text-sm rounded-r-xl font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
        />
        {isSearching && (
          <div className="flex items-center pr-3 shrink-0">
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          </div>
        )}
      </div>

      {isError && validation?.error && (
        <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
          <AlertTriangle size={12} className="shrink-0" />
          <span>{validation.error}</span>
        </p>
      )}

      {isValid && showVerifiedBadge && validation && (
        <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
          <Check size={12} className="shrink-0" />
          <span>Verified format: {validation.normalized}</span>
        </p>
      )}
    </div>
  );
}
