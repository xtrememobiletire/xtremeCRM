import { useState } from 'react';
import { 
  Phone, 
  MapPin, 
  Car, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  Navigation,
  Loader2 
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import StatusBadge from '../ui/StatusBadge';

interface DriverActiveOrderCardProps {
  job: any;
  onCompleteOrder: (jobId: string, cashAmountCents: number) => Promise<void>;
}

export default function DriverActiveOrderCard({ job, onCompleteOrder }: DriverActiveOrderCardProps) {
  const { currencySymbol } = useTenant();
  
  // Initialize with job total if available or empty string
  const initialCash = job.totalAmount 
    ? (centsToDollars(job.totalAmount)).toFixed(2) 
    : (job.subtotalAmount ? Number(job.subtotalAmount).toFixed(2) : '');

  const [cashCollectedInput, setCashCollectedInput] = useState<string>(initialCash);
  const [validationError, setValidationError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Validate and restrict to max 2 decimal places while typing
  const handleCashChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    // Allow empty string, integers, or floating point numbers with at most 2 decimal digits
    if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
      setCashCollectedInput(value);
      if (validationError) {
        setValidationError('');
      }
    }
  };

  // Format to standard 2 decimals on blur if valid
  const handleBlur = () => {
    const trimmed = cashCollectedInput.trim();
    if (trimmed !== '') {
      const parsed = parseFloat(trimmed);
      if (!isNaN(parsed) && parsed >= 0) {
        setCashCollectedInput(parsed.toFixed(2));
      }
    }
  };

  const handleCompleteClick = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = cashCollectedInput.trim();

    if (!trimmed) {
      setValidationError('Cash collected amount is required');
      return;
    }

    const parsedCash = parseFloat(trimmed);
    if (isNaN(parsedCash) || parsedCash < 0) {
      setValidationError('Please enter a valid positive cash amount');
      return;
    }

    const cashAmountCents = Math.round(parsedCash * 100);

    try {
      setIsSubmitting(true);
      await onCompleteOrder(job.id, cashAmountCents);
    } catch {
      // Error handled by parent toast
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine left border color by urgency
  const isUrgent = job.urgency === 'EMERGENCY' || job.urgency === 'URGENT';
  const leftLineColor = isUrgent ? 'border-l-rose-500' : 'border-l-blue-600';

  const customerName = job.customer?.name || job.customer?.fullName || 'Walk-in Customer';
  const customerPhone = job.customer?.phone || job.contactPhone || '';
  const serviceAddress = job.serviceAddress || job.locationAddress || '';
  const vehicleText = job.vehicle ? `${job.vehicle.year || ''} ${job.vehicle.make} ${job.vehicle.model}`.trim() : 'No Vehicle Specified';
  const tireSize = job.vehicle?.tireSize || '';

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between border-l-[6px] ${leftLineColor}`}>
      {/* Top Header Row */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="text-left">
            <span className="font-mono font-bold text-sm text-red-600 tracking-wide">
              {job.jobCode || job.jobNumber}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-0.5">
              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{formatDate(job.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusBadge status={job.urgency} />
            <StatusBadge status={job.status} />
          </div>
        </div>

        {/* Left Aligned Clean Details */}
        <div className="space-y-3 text-left">
          {/* Customer Info */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Customer</span>
            <p className="text-sm font-bold text-slate-900 leading-snug">{customerName}</p>
            {customerPhone && (
              <a 
                href={`tel:${customerPhone}`}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-mono mt-0.5"
              >
                <Phone className="w-3 h-3" />
                <span>{customerPhone}</span>
              </a>
            )}
          </div>

          {/* Vehicle & Tire Info */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Vehicle & Tire</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold mt-0.5">
              <Car className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{vehicleText}</span>
            </div>
            {tireSize && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 border border-slate-200/80 rounded font-mono text-[11px] font-bold text-slate-700">
                {tireSize}
              </span>
            )}
          </div>

          {/* Service Address */}
          {serviceAddress && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Service Location</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(serviceAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-1.5 text-xs text-slate-700 hover:text-blue-600 mt-0.5 group"
              >
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <span className="line-clamp-2 leading-relaxed">{serviceAddress}</span>
                <Navigation className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
              </a>
            </div>
          )}

          {/* Price / Estimated Bill */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Order Total:</span>
            <span className="text-base font-mono font-black text-slate-900">
              {formatCurrency(centsToDollars(job.totalAmount || job.totalCents || 0), currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action Form: Cash Collected + Complete Order Button */}
      <form onSubmit={handleCompleteClick} className="mt-5 pt-4 border-t border-slate-100 space-y-3">
        {/* Cash Collected Input */}
        <div className="text-left space-y-1">
          <label htmlFor={`cash-${job.id}`} className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cash Collected</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">(2 decimal digits)</span>
          </label>
          <div className="relative rounded-xl shadow-2xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
              {currencySymbol}
            </span>
            <input
              id={`cash-${job.id}`}
              type="text"
              inputMode="decimal"
              value={cashCollectedInput}
              onChange={handleCashChange}
              onBlur={handleBlur}
              placeholder="0.00"
              disabled={isSubmitting}
              className={`w-full pl-8 pr-3 py-2 text-sm font-mono font-bold text-slate-900 bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                validationError 
                  ? 'border-rose-400 focus:ring-rose-200' 
                  : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
              }`}
            />
          </div>
          {validationError && (
            <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{validationError}</span>
            </p>
          )}
        </div>

        {/* Single Action: Complete Order */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-xs transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Completing Order...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-100" />
              <span>Complete Order</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
