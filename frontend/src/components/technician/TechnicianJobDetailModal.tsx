// frontend/src/components/technician/TechnicianJobDetailModal.tsx
import React from 'react';
import {
  X,
  Wrench,
  Car,
  DollarSign,
  MapPin,
  Phone,
  FileText,
  ShieldAlert,
  User,
  Receipt,
} from 'lucide-react';
import { formatCurrency, centsToDollars } from '../../utils/currency';

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
  onOpenPaymentModal,
  currencySymbol = '$',
}) => {
  if (!isOpen || !job) return null;

  // Parse services list safely (supports array of strings, array of objects, or comma-separated string)
  const rawServices = job.services || job.serviceItems || job.lineItems || [];
  const serviceList: Array<{ name: string; price?: number }> = Array.isArray(rawServices)
    ? rawServices.map((item: any) =>
        typeof item === 'string'
          ? { name: item }
          : {
              name: item.serviceName || item.name || 'Service',
              price: item.price !== undefined ? Number(item.price) : undefined,
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
    'No special instructions provided.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">
                #{job.jobCode || job.jobNumber || job.id.slice(0, 8)}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-bold uppercase bg-white/10 text-slate-200 rounded-md">
                {job.status}
              </span>
            </div>
            <h2 className="text-base font-bold mt-1">Complete Job &amp; Service Breakdown</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 1. Customer & Location Section */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <User className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{customerName}</span>
              </div>
              {customerPhone && (
                <a
                  href={`tel:${customerPhone}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100"
                >
                  <Phone className="w-3 h-3" />
                  {customerPhone}
                </a>
              )}
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-600 pt-1 border-t border-slate-200/70">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{locationAddress}</span>
            </div>
          </div>

          {/* 2. Services Requested & Itemized Breakdown */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Wrench className="w-4 h-4 text-amber-600" />
              <span>Requested Services Breakdown</span>
            </div>

            <div className="divide-y divide-slate-100">
              {serviceList.map((srv, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">{srv.name}</span>
                  {srv.price && srv.price > 0 ? (
                    <span className="font-bold text-slate-900">
                      {formatCurrency(srv.price, currencySymbol)}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
                      Included
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Vehicle & Tire Specifications */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase">
                <Car className="w-3.5 h-3.5 text-blue-500" />
                <span>Vehicle</span>
              </div>
              <p className="text-xs font-bold text-slate-800 mt-1">{vehicleLabel}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase">
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tire / Rim Spec</span>
              </div>
              <p className="text-xs font-bold text-slate-800 mt-1">{tireSize}</p>
            </div>
          </div>

          {/* 4. Dispatcher Notes / Special Instructions */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
              <FileText className="w-3.5 h-3.5" />
              <span>Dispatcher &amp; Job Notes</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">{jobNotes}</p>
          </div>

          {/* 5. Financial & End Payment Summary */}
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider">
                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                Financial Summary
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-[11px] font-bold text-emerald-300">
                Payment: {paymentStatus}
              </span>
            </div>

            {techFee > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                <span>Technician Payout / Fee:</span>
                <span className="font-semibold text-emerald-400">
                  {formatCurrency(techFee, currencySymbol)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-white/15 pt-2.5">
              <span className="text-sm font-bold text-slate-200">Total Job Amount to Collect:</span>
              <span className="text-xl font-extrabold text-emerald-400">
                {formatCurrency(totalAmount, currencySymbol)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer with End Payment / Complete Trigger */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            Close Details
          </button>

          {onOpenPaymentModal && job.status !== 'COMPLETED' && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPaymentModal(job);
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              Proceed to End Payment &amp; Complete Job
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicianJobDetailModal;
