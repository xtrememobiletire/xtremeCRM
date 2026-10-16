// frontend/src/components/technician/TechnicianJobDetailModal.tsx
import React from 'react';
import {
  X,
  Wrench,
  Car,
  MapPin,
  Phone,
  FileText,
  User,
} from 'lucide-react';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { toast } from 'sonner';

interface TechnicianJobDetailModalProps {
  isOpen: boolean;
  job: any | null;
  onClose: () => void;
  onOpenPaymentModal?: (job: any) => void;
  currencySymbol?: string;
}

export const TechnicianJobDetailModal: React.FC<TechnicianJobDetailModalProps> = ({
  isOpen,
  job,
  onClose,
  onOpenPaymentModal: _onOpenPaymentModal,
  currencySymbol = '$',
}) => {
  if (!isOpen || !job) return null;

  // Parse services list safely (supports array of strings, array of objects, or comma-separated string)
  const rawServices = job.services || job.serviceItems || job.lineItems || [];
  const serviceList: Array<{ name: string; price?: number; quantity?: number }> = Array.isArray(rawServices)
    ? rawServices.map((item: any) =>
        typeof item === 'string'
          ? { name: item }
          : {
              name: item.serviceName || item.name || 'Service',
              price: item.price !== undefined ? Number(item.price) : undefined,
              quantity: item.quantity || 1,
            }
      )
    : job.serviceType
    ? String(job.serviceType)
        .split(',')
        .map((s) => ({ name: s.trim() }))
    : [{ name: 'Standard Roadside Service' }];

  // Financial calculations
  const totalAmount = job.totalCents
    ? centsToDollars(job.totalCents)
    : Number(
        job.totalAmount ??
          job.quotedPrice ??
          job.estimatedCost ??
          job.amount ??
          0
      );

  const techFee = job.repairerFeeCents
    ? centsToDollars(job.repairerFeeCents)
    : Number(job.techFee ?? job.driverPayout ?? 0);

  const paymentStatus =
    job.paymentStatus || (job.status === 'COMPLETED' ? 'PAID' : 'PENDING');

  // Customer & Location
  const customerName =
    job.customer?.fullName ||
    job.customer?.name ||
    job.recipientName ||
    'Roadside Customer';
  const customerPhone = job.customer?.phone || job.recipientPhone;
  const locationAddress =
    job.locationAddress || job.serviceAddress || 'GPS Coordinates Pinned';

  // Vehicle info extraction
  const vehicleLabel =
    job.vehicleName ||
    [
      job.vehicleYear || job.vehicle?.year,
      job.vehicleMake || job.vehicle?.make,
      job.vehicleModel || job.vehicle?.model,
    ]
      .filter(Boolean)
      .join(' ') ||
    'Standard Vehicle';

  const tireSize = job.tireSize || job.vehicle?.tireSize || 'N/A';
  const jobNotes =
    job.notes ||
    job.description ||
    job.dispatchNotes ||
    job.problemNotes ||
    null;

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!customerPhone) return;
    navigator.clipboard.writeText(customerPhone);
    toast.success('Phone number copied to clipboard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                #{job.jobCode || job.jobNumber || job.id.slice(0, 8)}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-bold uppercase text-slate-600 bg-slate-100 border border-slate-200 rounded-lg">
                {job.status}
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-900 mt-1.5">Job & Service Breakdown</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — single white surface, divide-y sections */}
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="divide-y divide-slate-100">

            {/* 1. Customer & Location */}
            <div className="px-5 py-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{customerName}</span>
                </div>
                {customerPhone && (
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition cursor-pointer"
                    title="Click to copy phone number"
                  >
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span>{customerPhone}</span>
                  </button>
                )}
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{locationAddress}</span>
              </div>
            </div>

            {/* 2. Requested Services */}
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                <span>Requested Services</span>
              </div>
              <div className="divide-y divide-slate-100">
                {serviceList.map((srv, idx) => (
                  <div key={idx} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">{srv.name}</span>
                    <div className="flex items-center gap-2">
                      {(srv.quantity ?? 1) > 1 && (
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          ×{srv.quantity}
                        </span>
                      )}
                      {srv.price && srv.price > 0 ? (
                        <span className="font-bold text-slate-900 text-xs">
                          {formatCurrency(srv.price, currencySymbol)}
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">
                          Included
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Vehicle & Tire */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <Car className="w-3.5 h-3.5 text-slate-400" />
                    <span>Vehicle</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mt-1">{vehicleLabel}</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Tire Size</span>
                  <span className="font-mono text-sm font-bold text-slate-800 mt-1 inline-block">{tireSize}</span>
                </div>
              </div>
            </div>

            {/* 4. Dispatcher Notes (only if notes exist) */}
            {jobNotes && (
              <div className="px-5 py-4 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dispatcher & Job Notes</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{jobNotes}</p>
              </div>
            )}

            {/* 5. Financial Summary */}
            <div className="px-5 py-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Financial Summary</span>
                <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                  paymentStatus === 'PAID' || paymentStatus === 'VERIFIED_PAID'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {paymentStatus}
                </span>
              </div>

              {techFee > 0 && (
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Technician Payout</span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(techFee, currencySymbol)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-900">Total to Collect</span>
                <span className="text-lg font-black text-slate-900">
                  {formatCurrency(totalAmount, currencySymbol)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TechnicianJobDetailModal;
