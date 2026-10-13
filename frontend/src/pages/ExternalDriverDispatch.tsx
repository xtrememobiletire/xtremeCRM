import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  MapPin,
  Car,
  Navigation,
  CheckCircle,
  XCircle,
  Truck,
  Phone,
  Copy,
  Check,
  Zap,
  Calendar,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { jobService } from '../services/jobService';
import { getNavigationUrl } from '../utils/navigation';
import { formatCurrency, centsToDollars } from '../utils/currency';

/**
 * Render the public route-token work order with navigation, customer payment
 * information, and accept/decline/progress actions; reload after status updates.
 */
export default function ExternalDriverDispatch() {
  const { token } = useParams<{ token: string }>();

  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Anti-dispute collection verification checkbox
  const [hasCollectedCash, setHasCollectedCash] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  /**
   * Load the token-selected job, or do nothing without a token; caught request
   * errors become the page's error state.
   */
  const fetchJob = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const data = await jobService.getPublicExternalJob(token);
      setJob(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Dispatch link invalid, expired, or revoked.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [token]);

  /**
   * Stop the click and request a clipboard copy of the service address, if present;
   * show copied feedback for two seconds without awaiting the clipboard result.
   */
  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!job?.serviceAddress) return;
    navigator.clipboard.writeText(job.serviceAddress);
    setCopied(true);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Submit a token action, then reload the job. Completion requires collection
   * confirmation when customer payment is due and sends the job total as cash cents.
   * Decline sends the entered reason; request failures are shown as error toasts.
   */
  const handleAction = async (action: 'ACCEPT' | 'DECLINE' | 'EN_ROUTE' | 'ON_SCENE' | 'COMPLETE') => {
    if (!token) return;

    if (action === 'COMPLETE' && isCustomerDue && !hasCollectedCash) {
      toast.error('Please verify you have collected the required payment from the customer.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = { action };

      if (action === 'DECLINE') {
        payload.reason = declineReason.trim() || 'Unavailable';
      } else if (action === 'COMPLETE') {
        payload.cashCollectedCents = isCustomerDue ? (job?.totalCents || 0) : 0;
      }

      await jobService.updatePublicExternalJobStatus(token, payload);
      toast.success(
        action === 'ACCEPT'
          ? 'Assignment accepted! Please head to the location.'
          : action === 'DECLINE'
          ? 'Assignment declined. Dispatch has been notified.'
          : action === 'EN_ROUTE'
          ? 'Status updated: En Route to roadside scene.'
          : action === 'ON_SCENE'
          ? 'Status updated: Arrived on scene.'
          : 'Work order marked COMPLETED! Thank you.'
      );

      setShowDeclineModal(false);
      await fetchJob();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update job status');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xs border border-slate-200">
          <Truck className="w-8 h-8 text-blue-600 animate-pulse mx-auto mb-3" />
          <h2 className="text-sm font-bold text-slate-800">Loading Work Order...</h2>
          <p className="text-xs text-slate-500 mt-1">Connecting to live dispatch link</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xs border border-slate-200">
          <XCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">Unavailable Work Order</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {error || 'This link has expired, was completed, or was revoked by dispatch.'}
          </p>
          <div className="mt-5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
            Please contact dispatch directly if you believe this is an error.
          </div>
        </div>
      </div>
    );
  }

  const currencySymbol = job.currency === 'GBP' ? '£' : job.countryCode === 'CA' ? 'CA$' : '$';
  const payoutDollars = centsToDollars(job.contractorPayoutFeeCents || 0);
  const payoutFormatted = formatCurrency(payoutDollars, currencySymbol);

  const totalDollars = centsToDollars(job.totalCents || 0);
  const totalFormatted = formatCurrency(totalDollars, currencySymbol);

  const isPrepaid = job.paymentStatus === 'PAID' || job.paymentStatus === 'SETTLED';
  const isCustomerDue = !isPrepaid && (job.totalCents || 0) > 0;

  /**
   * Return the portal status, prioritizing completion, scene, and route markers
   * before acceptance/denial; missing or unrecognized state defaults to PENDING.
   */
  const getEffectiveStatus = (j: any): 'PENDING' | 'ACCEPTED' | 'EN_ROUTE' | 'ON_SCENE' | 'COMPLETED' | 'DECLINED' => {
    if (!j) return 'PENDING';
    if (j.status === 'COMPLETED' || j.dispositionNotes === 'COMPLETED') return 'COMPLETED';
    if (j.dispositionNotes === 'ON_SCENE' || j.dispositionNotes === 'ARRIVED') return 'ON_SCENE';
    if (j.dispositionNotes === 'EN_ROUTE') return 'EN_ROUTE';
    if (j.externalDispatchStatus === 'ACCEPTED') return 'ACCEPTED';
    if (j.externalDispatchStatus === 'DENIED') return 'DECLINED';
    return 'PENDING';
  };

  const status = getEffectiveStatus(job);
  const isCompleted = status === 'COMPLETED';
  const isEnRoute = status === 'EN_ROUTE';
  const isOnScene = status === 'ON_SCENE';
  const isAccepted = status === 'ACCEPTED';
  const isPending = status === 'PENDING';

  const isUrgent = job.urgency === 'URGENT' || job.urgency === 'EMERGENCY' || job.urgency === 'HIGH';
  const customerName = job.customer?.fullName || job.recipientName || 'Customer';
  const customerPhone = job.customer?.phone || job.recipientPhone;

  // Smart Navigation URL based on device OS
  const navUrl = getNavigationUrl({
    latitude: job.latitude,
    longitude: job.longitude,
    address: job.serviceAddress,
  });

  const encodedAddress = encodeURIComponent(job.serviceAddress || '');
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  const appleMapsUrl = `https://maps.apple.com/?q=${encodedAddress}`;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-4">
      <div className="max-w-md mx-auto space-y-3">
        {/* Top Dispatch Brand Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">
              X
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 tracking-tight block">
                XTREME MOBILE TIRE
              </span>
              <span className="text-[10px] text-slate-500">
                {job.externalCompanyName || 'External Contractor'}
              </span>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isCompleted
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : isOnScene
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : isEnRoute
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : isAccepted
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {isCompleted ? 'COMPLETED' : status.replace('_', ' ')}
          </span>
        </div>

        {/* Technician-Job-Card Style Unified Work Order Container */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col justify-between gap-4">
          <div>
            {/* Header: Code + Urgency Tag + Timing */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                  #{job.jobCode}
                </span>
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
                  {status === 'DECLINED' ? (
                    <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                      Declined
                    </span>
                  ) : job.driverEtaMinutes ? (
                    `ETA ~${job.driverEtaMinutes}m`
                  ) : (
                    'Immediate'
                  )}
                </span>
              </div>
            </div>

            {/* Customer & Phone + Contractor Payout Fee */}
            <div className="pt-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{customerName}</h3>
                {customerPhone ? (
                  <a
                    href={`tel:${customerPhone}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 mt-0.5 transition"
                  >
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{customerPhone}</span>
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 mt-0.5 block">Customer phone on file</span>
                )}
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] text-slate-400 font-medium block">Agreed Payout</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block font-mono">
                  {payoutFormatted}
                </span>
              </div>
            </div>

            {/* Anti-Dispute Customer Payment Banner */}
            <div className="mt-3">
              {isPrepaid ? (
                <div className="py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                  <span className="font-semibold text-emerald-800">Customer Balance:</span>
                  <span className="font-bold text-emerald-700">
                    {currencySymbol}0.00 (Prepaid in Full — Do Not Collect)
                  </span>
                </div>
              ) : (
                <div className="py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
                    <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                    <span>Collect from Customer:</span>
                  </div>
                  <span className="font-black font-mono text-amber-950 text-sm">
                    {totalFormatted}
                  </span>
                </div>
              )}
            </div>

            {/* Address & GPS Navigation link (Matching TechnicianJobCard) */}
            <div className="mt-2.5 p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/60 flex items-start justify-between gap-2">
              <a
                href={navUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-1.5 text-xs text-slate-800 hover:text-blue-700 transition font-medium group flex-1"
                title="Open GPS Navigation"
              >
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <span className="line-clamp-2 underline decoration-slate-300 underline-offset-2">
                  {job.serviceAddress || 'No address specified'}
                </span>
              </a>

              <button
                type="button"
                onClick={handleCopyAddress}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition shrink-0 cursor-pointer"
                title="Copy address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Quick 1-Tap Maps Chooser */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Navigation size={12} className="text-blue-600" />
                <span>Google Maps</span>
              </a>
              <a
                href={appleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Navigation size={12} className="text-slate-600" />
                <span>Apple Maps</span>
              </a>
            </div>

            {/* Vehicle & Tires (Matching TechnicianJobCard) */}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-800 truncate">
                  {job.vehicle
                    ? `${job.vehicle.year || ''} ${job.vehicle.make} ${job.vehicle.model}`.trim()
                    : 'Vehicle on file'}
                </span>
              </div>
              {job.vehicle?.tireSize && (
                <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0 ml-2">
                  {job.vehicle.tireSize}
                </span>
              )}
            </div>

            {/* Problem notes if any */}
            {job.problemNotes && (
              <p className="mt-2 text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                "{job.problemNotes}"
              </p>
            )}
          </div>

          {/* Action Progression Buttons (Matching TechnicianJobCard style & behavior) */}
          <div className="pt-2 border-t border-slate-100">
            {!isCompleted ? (
              <>
                {/* Stage 1: PENDING -> Accept / Decline */}
                {isPending && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleAction('ACCEPT')}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>Accept Job</span>
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setShowDeclineModal(true)}
                      className="py-2.5 px-3.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition cursor-pointer disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                )}

                {/* Stage 2: ACCEPTED -> Mark En Route */}
                {isAccepted && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleAction('EN_ROUTE')}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-black transition cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Truck className="w-4 h-4" />
                    )}
                    <span>Mark En Route</span>
                  </button>
                )}

                {/* Stage 3: EN_ROUTE -> Mark Arrived on Scene */}
                {isEnRoute && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleAction('ON_SCENE')}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                    <span>Mark Arrived on Scene</span>
                  </button>
                )}

                {/* Stage 4: ON_SCENE -> Complete Job */}
                {isOnScene && (
                  <div className="space-y-2.5">
                    {/* Interactive Cash Collection Checkbox */}
                    {isCustomerDue && (
                      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-300 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={hasCollectedCash}
                          onChange={(e) => setHasCollectedCash(e.target.checked)}
                          className="mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="font-bold text-amber-950 text-[11px] leading-snug">
                          I have collected the exact amount of {totalFormatted} from the customer.
                        </span>
                      </label>
                    )}

                    <button
                      type="button"
                      disabled={submitting || (isCustomerDue && !hasCollectedCash)}
                      onClick={() => handleAction('COMPLETE')}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      <span>Complete Job</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-1">
                <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto" />
                <div className="text-xs font-bold text-emerald-900">Work Order Completed</div>
                <p className="text-[11px] text-emerald-700">
                  Your service completion has been verified. Payout fee of <strong>{payoutFormatted}</strong> will be processed.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decline Reason Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Decline Assignment</h3>
            <p className="text-xs text-slate-500">Provide a quick reason for dispatch:</p>
            <input
              type="text"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Too far, out of stock"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAction('DECLINE')}
                disabled={submitting}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 cursor-pointer"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
