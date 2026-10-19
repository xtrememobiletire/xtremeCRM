import { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Copy, 
  Check, 
  Zap, 
  Calendar, 
  Car, 
  CheckCircle,
  Truck,
  Navigation,
  Wrench,
  Info
} from 'lucide-react';
import { getNavigationUrl } from '../../utils/navigation';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { formatJobWindowDual, resolveJobTimezone } from '../../utils/date';
import { toast } from 'sonner';

interface TechnicianJobCardProps {
  job: any;
  tabType: 'PENDING' | 'ACTIVE' | 'CANCELLED';
  currencySymbol: string;
  isUpdating: boolean;
  onAccept: (jobId: string) => void;
  onDecline: (job: any) => void;
  onProgressStage: (jobId: string, nextStatus: string) => void;
  onOpenPayment: (job: any) => void;
  onOpenChat?: (job: any) => void;
  onOpenMap?: (job: any) => void;
  onViewDetails?: (job: any) => void;
}

export default function TechnicianJobCard({
  job,
  tabType,
  currencySymbol,
  isUpdating,
  onAccept,
  onDecline,
  onProgressStage,
  onOpenPayment,
  onOpenChat: _onOpenChat,
  onOpenMap,
  onViewDetails,
}: TechnicianJobCardProps) {
  const [copied, setCopied] = useState(false);

  const isUrgent = job.urgency === 'URGENT' || job.urgency === 'EMERGENCY' || job.urgency === 'HIGH';
  const hasFee = Boolean(job.repairerFeeCents && job.repairerFeeCents > 0);
  const feeDollars = hasFee ? centsToDollars(job.repairerFeeCents) : null;

  const rawServices = job.serviceItems || job.services || job.lineItems || [];
  const services: Array<{ serviceName: string; quantity?: number; category?: string }> = Array.isArray(rawServices)
    ? rawServices.map((item: any) =>
        typeof item === 'string'
          ? { serviceName: item, quantity: 1 }
          : {
              serviceName: item.serviceName || item.name || 'Service',
              quantity: item.quantity || 1,
              category: item.category,
            }
      )
    : job.serviceType
    ? String(job.serviceType)
        .split(',')
        .map((s) => ({ serviceName: s.trim(), quantity: 1 }))
    : [];

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!job.serviceAddress) return;
    navigator.clipboard.writeText(job.serviceAddress);
    setCopied(true);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = job.customer?.phone || job.recipientPhone;
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    toast.success('Phone number copied to clipboard');
  };

  const navUrl = getNavigationUrl({
    latitude: job.serviceLatitude,
    longitude: job.serviceLongitude,
    address: job.serviceAddress,
  });

  // Calculate current active progress stage
  const currentStage: 'ASSIGNED' | 'ACCEPTED' | 'EN_ROUTE' | 'ON_SCENE' = (() => {
    const disp = job.dispositionNotes;
    if (disp === 'ON_SCENE' || disp === 'ARRIVED') return 'ON_SCENE';
    if (disp === 'EN_ROUTE') return 'EN_ROUTE';
    if (disp === 'ACCEPTED') return 'ACCEPTED';
    if (job.status === 'IN_PROGRESS') return 'ON_SCENE';
    return 'ASSIGNED';
  })();

  const customerName = job.customer?.fullName || job.customer?.name || job.recipientName || 'Customer';
  const customerPhone = job.customer?.phone || job.recipientPhone;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition">
      {/* Header: Code + Urgency Tag + Timing */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onViewDetails?.(job)}
              className={`font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 flex items-center gap-1.5 transition ${
                onViewDetails ? 'hover:bg-slate-200 hover:border-slate-300 cursor-pointer' : ''
              }`}
              title={onViewDetails ? 'Click to view full job details' : undefined}
            >
              <span>#{job.jobCode || job.jobNumber}</span>
              {onViewDetails && <Info className="w-3 h-3 text-slate-400" />}
            </button>
            {isUrgent ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                <Zap className="w-2.5 h-2.5 text-amber-600" />
                Roadside
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full">
                <Calendar className="w-2.5 h-2.5 text-blue-600" />
                Scheduled
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-700">
              {tabType === 'CANCELLED' ? (
                <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">Declined</span>
              ) : job.driverEtaMinutes && job.driverEtaMinutes <= 180 ? (
                `ETA ~${job.driverEtaMinutes}m`
              ) : (() => {
                const jobTz = resolveJobTimezone(job);
                const windowInfo = (job.arrivalWindowStart || job.estimatedArrivalAt)
                  ? formatJobWindowDual(job.arrivalWindowStart || job.estimatedArrivalAt, job.arrivalWindowEnd, jobTz)
                  : null;
                return windowInfo?.customerWindow || 'Immediate';
              })()}
            </span>
          </div>
        </div>

        {/* Customer & Phone */}
        <div className="pt-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{customerName}</h3>
            {customerPhone && (
              <button
                type="button"
                onClick={handleCopyPhone}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 mt-0.5 transition cursor-pointer"
                title="Click to copy phone number"
              >
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{customerPhone}</span>
              </button>
            )}
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] text-slate-400 font-medium block">Tech Fee</span>
            {hasFee ? (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                {formatCurrency(feeDollars!, currencySymbol)}
              </span>
            ) : (
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 inline-block" title="Technician fee stated during audit in Accounting">
                Fee Pending Audit
              </span>
            )}
          </div>
        </div>

        {/* Address & GPS Navigation link */}
        <div className="mt-2.5 p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/60 flex items-start justify-between gap-2">
          <a
            href={navUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-1.5 text-xs text-slate-800 hover:text-blue-700 transition font-medium group flex-1"
            title="Open in Apple Maps / Google Maps"
          >
            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
            <span className="line-clamp-2 underline decoration-slate-300 underline-offset-2">
              {job.serviceAddress || 'No address specified'}
            </span>
          </a>

          <button
            type="button"
            onClick={handleCopyAddress}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer shrink-0"
            title="Copy address"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Vehicle & Tires */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5">
          <div className="flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-800 truncate max-w-[160px] sm:max-w-none">
              {job.vehicle ? `${job.vehicle.year || ''} ${job.vehicle.make} ${job.vehicle.model}`.trim() : 'Vehicle on file'}
            </span>
          </div>
          {job.vehicle?.tireSize && (
            <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {job.vehicle.tireSize}
            </span>
          )}
        </div>

        {/* Services to Resolve */}
        {services.length > 0 ? (
          <div className="mt-2.5 p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                <Wrench className="w-3 h-3 text-amber-600" />
                <span>Services to Resolve ({services.length})</span>
              </div>
              {onViewDetails && (
                <button
                  type="button"
                  onClick={() => onViewDetails(job)}
                  className="text-[10px] font-bold text-amber-800 hover:text-amber-950 underline underline-offset-2 cursor-pointer"
                >
                  Full Details →
                </button>
              )}
            </div>
            <div className="mt-1.5 space-y-1">
              {services.map((si, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span className="truncate">{si.serviceName}</span>
                  <span className="font-mono text-[10px] font-bold text-amber-900 bg-amber-100/90 border border-amber-200/60 px-1.5 py-0.5 rounded ml-2 shrink-0">
                    Qty: {si.quantity || 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200/60 text-xs flex items-center justify-between text-slate-500">
            <div className="flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[11px] font-medium text-slate-700">Roadside Assistance / General Dispatch</span>
            </div>
            {onViewDetails && (
              <button
                type="button"
                onClick={() => onViewDetails(job)}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2 cursor-pointer shrink-0"
              >
                Details
              </button>
            )}
          </div>
        )}

        {/* Problem notes if any */}
        {job.problemNotes && (
          <p className="mt-2 text-[11px] text-slate-500 line-clamp-1 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100">
            "{job.problemNotes}"
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-2 border-t border-slate-100">
        {tabType === 'PENDING' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onAccept(job.id)}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition cursor-pointer disabled:opacity-50 shadow-xs text-center flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Accept Job</span>
            </button>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onDecline(job)}
              className="py-2.5 px-3.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              Decline
            </button>
            {onOpenMap && (
              <button
                type="button"
                onClick={() => onOpenMap(job)}
                className="py-2.5 px-3 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="View Map & Location"
              >
                <Navigation className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Map</span>
              </button>
            )}
          </div>
        )}

        {tabType === 'ACTIVE' && (
          <div className="flex items-center gap-2">
            {currentStage === 'ASSIGNED' || currentStage === 'ACCEPTED' ? (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onProgressStage(job.id, 'EN_ROUTE')}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />
                <span>Mark En Route</span>
              </button>
            ) : currentStage === 'EN_ROUTE' ? (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onProgressStage(job.id, 'ON_SCENE')}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                <span>Mark Arrived on Scene</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onOpenPayment(job)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Complete Job</span>
              </button>
            )}

            {onOpenMap && (
              <button
                type="button"
                onClick={() => onOpenMap(job)}
                className="py-2.5 px-3 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="Extend Map & Live Tracking"
              >
                <Navigation className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Map</span>
              </button>
            )}
          </div>
        )}

        {tabType === 'CANCELLED' && (
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span className="font-semibold text-slate-600">Declined & Returned</span>
            {job.driverDeclineReason && (
              <span 
                className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]"
                title={`Declined reason: ${job.driverDeclineReason}`}
              >
                {job.driverDeclineReason === 'OUT_OF_AREA' ? 'Out of Area' : job.driverDeclineReason === 'BUSY' ? 'Busy' : 'Other'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
