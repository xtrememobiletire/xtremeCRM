import { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  DollarSign,
  Loader2,
  X,
  Building,
  MapPin,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { jobService } from '../../services/jobService';
import PhoneInputField from '../common/PhoneInputField';
import AddressAutocompleteInput, { type GeocodeLocation } from '../common/AddressAutocompleteInput';
import { MAPBOX_TOKEN } from '../../constants/mapboxConfig';

interface ExternalDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  initialContractor?: {
    name?: string;
    phone?: string;
    address?: string;
  };
  onUpdated?: (updatedJob?: any) => void;
}

/**
 * Render contractor details, payout, road ETA, and public link controls when open;
 * completed/cancelled jobs disable generation and revocation actions.
 */
export default function ExternalDispatchModal({
  isOpen,
  onClose,
  job,
  initialContractor,
  onUpdated,
}: ExternalDispatchModalProps) {
  const queryClient = useQueryClient();

  const [feeInput, setFeeInput] = useState<string>('120.00');
  const [companyName, setCompanyName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [depotAddress, setDepotAddress] = useState<string>('');
  const [depotCoords, setDepotCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [isCalculatingEta, setIsCalculatingEta] = useState<boolean>(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const isCompletedJob = job?.status === 'COMPLETED' || job?.status === 'CANCELLED';

  // Sync initial state when modal opens or job/initialContractor changes
  useEffect(() => {
    if (job) {
      setFeeInput(
        job.externalDriverFeeCents
          ? (job.externalDriverFeeCents / 100).toFixed(2)
          : '120.00'
      );
      setCompanyName(
        initialContractor?.name ||
        job.externalCompanyName ||
        'External Mobile Contractor'
      );
      setDriverPhone(
        initialContractor?.phone ||
        job.externalDriverPhone ||
        ''
      );
      setDepotAddress(initialContractor?.address || '');
      setEtaMinutes(job.driverEtaMinutes || null);
    }
  }, [job, initialContractor, isOpen]);

  // Recalculate ETA directly from geocoded coordinates
  /**
   * Update ETA from starting coordinates in degrees using Mapbox driving time
   * rounded to minutes plus five minutes, with a five-minute minimum. Skip routing
   * if the token is missing or either destination coordinate is zero or missing.
   * Caught request errors
   * use 25 minutes only when no ETA is set; an empty route leaves ETA unchanged.
   */
  const handleCalculateEtaWithCoords = async (startLat: number, startLng: number) => {
    const destLat = job?.serviceLatitude ?? job?.latitude;
    const destLng = job?.serviceLongitude ?? job?.longitude;

    if (!destLat || !destLng || !MAPBOX_TOKEN) {
      return;
    }

    try {
      setIsCalculatingEta(true);
      const dirUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${destLng},${destLat}?access_token=${MAPBOX_TOKEN}`;
      const dirRes = await fetch(dirUrl);
      const dirData = await dirRes.json();

      if (dirData?.routes?.[0]?.duration) {
        const driveMins = Math.round(dirData.routes[0].duration / 60);
        setEtaMinutes(Math.max(5, driveMins + 5)); // 5 min buffer
      }
    } catch {
      if (!etaMinutes) setEtaMinutes(25);
    } finally {
      setIsCalculatingEta(false);
    }
  };

  // Recalculate ETA when depot address changes
  /**
   * Geocode addressToUse (or the depot address) and update road ETA in minutes with
   * a five-minute preparation buffer. Skip routing if the address/token is missing
   * or either destination coordinate is zero or missing. Caught request errors
   * use 25 minutes only when no ETA
   * is set; missing geocoding/route results leave ETA unchanged.
   */
  const handleCalculateEta = async (addressToUse?: string) => {
    const addr = addressToUse || depotAddress;
    const destLat = job?.serviceLatitude ?? job?.latitude;
    const destLng = job?.serviceLongitude ?? job?.longitude;

    if (!addr.trim() || !destLat || !destLng || !MAPBOX_TOKEN) {
      return;
    }

    try {
      setIsCalculatingEta(true);
      const cc = (job?.countryCode || 'CA').toLowerCase();
      const geoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addr)}.json?access_token=${MAPBOX_TOKEN}&country=${cc}&limit=1`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      if (geoData?.features?.[0]?.center) {
        const [startLng, startLat] = geoData.features[0].center;
        const dirUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${destLng},${destLat}?access_token=${MAPBOX_TOKEN}`;
        const dirRes = await fetch(dirUrl);
        const dirData = await dirRes.json();

        if (dirData?.routes?.[0]?.duration) {
          const driveMins = Math.round(dirData.routes[0].duration / 60);
          setEtaMinutes(Math.max(5, driveMins + 5)); // 5 min preparation buffer
          return;
        }
      }
    } catch {
      // Fallback: estimate 25 min if routing times out
      if (!etaMinutes) setEtaMinutes(25);
    } finally {
      setIsCalculatingEta(false);
    }
  };

  if (!isOpen || !job) return null;

  const currentToken = job.externalDispatchToken;
  const currentStatus = job.externalDispatchStatus || 'PENDING';
  const publicUrl = currentToken
    ? `${window.location.origin}/dispatch/external/${currentToken}`
    : '';

  /**
   * Request a clipboard copy of the current link, if present, and show copied
   * feedback for two seconds without awaiting the clipboard result.
   */
  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setHasCopied(true);
    toast.success('Dispatch link copied!');
    setTimeout(() => setHasCopied(false), 2000);
  };

  /**
   * Require an active job and nonnegative payout, convert the fee to cents, and
   * save contractor dispatch details. Attempt to copy the link, refresh job caches,
   * and notify onUpdated; request failures become error toasts.
   */
  const handleGenerate = async () => {
    if (isCompletedJob) {
      toast.error(`Cannot generate or update dispatch link: Job is ${job.status}`);
      return;
    }

    const feeNumber = parseFloat(feeInput);
    if (isNaN(feeNumber) || feeNumber < 0) {
      toast.error('Please enter a valid contractor payout fee');
      return;
    }

    try {
      setIsGenerating(true);
      const feeCents = Math.round(feeNumber * 100);
      const res = await jobService.generateExternalDispatch(job.id, {
        externalCompanyName: companyName.trim() || 'External Mobile Contractor',
        externalDriverPhone: driverPhone.trim() || undefined,
        externalDriverAddress: depotAddress.trim() || undefined,
        latitude: depotCoords?.lat,
        longitude: depotCoords?.lng,
        externalDriverFeeCents: feeCents,
        driverEtaMinutes: etaMinutes || undefined,
      });

      const copyTarget = res.externalDispatchToken
        ? `${window.location.origin}/dispatch/external/${res.externalDispatchToken}`
        : publicUrl;

      if (copyTarget) {
        navigator.clipboard.writeText(copyTarget).catch(() => {});
      }

      toast.success('Dispatch link generated & copied to clipboard!');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-jobs'] });
      onUpdated?.(res?.job || (res as any));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate dispatch link');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Reject completed/cancelled jobs; otherwise revoke the link, refresh job caches,
   * reset the form, notify onUpdated, and close. Request failures become error toasts.
   */
  const handleRevoke = async () => {
    if (isCompletedJob) {
      toast.error(`Cannot revoke dispatch link: Job is ${job.status}`);
      return;
    }

    try {
      setIsRevoking(true);
      const res = await jobService.revokeExternalDispatch(job.id);
      toast.success('Dispatch link revoked');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-jobs'] });
      setCompanyName('');
      setDriverPhone('');
      setDepotAddress('');
      setDepotCoords(null);
      setEtaMinutes(null);
      setFeeInput('120.00');
      onUpdated?.(res?.job || (res as any));
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to revoke link');
    } finally {
      setIsRevoking(false);
    }
  };

  const currencySymbol = job.currency === 'GBP' ? '£' : job.countryCode === 'CA' ? 'CA$' : '$';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 font-bold">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">External Contractor Dispatch</h3>
              <p className="text-[11px] text-slate-500 font-mono">{job.jobCode}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-3.5 text-xs">
          {isCompletedJob && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-900 text-xs font-semibold">
              <Clock size={14} className="text-amber-600 shrink-0" />
              <span>Work order is {job.status} • Dispatch links and contractor updates are locked.</span>
            </div>
          )}

          {(job.driverDeclineReason || job.externalDispatchStatus === 'DENIED') && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Contractor Declined Assignment</span>
              </div>
              <div className="text-[11px] text-rose-700 bg-white/70 p-2 rounded-lg border border-rose-200/50">
                <strong>Reason:</strong> "{job.driverDeclineReason || 'Declined by contractor'}"
              </div>
            </div>
          )}

          {/* Contractor Name */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
              <Building size={12} className="text-slate-400" />
              <span>Contractor / Company Name *</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Bilkul Towing & Recovery"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Normalized Driver Phone */}
          <PhoneInputField
            value={driverPhone}
            onChange={setDriverPhone}
            countryCode={job.countryCode || 'CA'}
            label="Contractor Phone (E.164)"
            required={false}
          />

          {/* Depot / Starting Address with Mapbox Autocomplete & Driving ETA */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin size={12} className="text-slate-400" />
                <span>Depot / Base Address (for Road ETA)</span>
              </label>
              {isCalculatingEta && (
                <span className="text-[10px] text-blue-600 flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" />
                  Calculating...
                </span>
              )}
            </div>
            <AddressAutocompleteInput
              value={depotAddress}
              onChange={(val) => {
                setDepotAddress(val);
                if (!val.trim()) {
                  setEtaMinutes(null);
                } else {
                  handleCalculateEta(val);
                }
              }}
              onSelectLocation={(loc: GeocodeLocation) => {
                setDepotAddress(loc.address);
                setDepotCoords({ lat: loc.latitude, lng: loc.longitude });
                handleCalculateEtaWithCoords(loc.latitude, loc.longitude);
              }}
              countryCode={job?.countryCode || 'CA'}
              placeholder="e.g. 5050 Timberlea Blvd, Mississauga, ON"
              className="!py-2 !text-xs !rounded-xl"
            />
            {etaMinutes !== null && (
              <p className="mt-1.5 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <Clock size={11} />
                <span>Estimated Driving Arrival: ~{etaMinutes} mins</span>
              </p>
            )}
          </div>

          {/* Agreed Payout Fee */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
              <DollarSign size={12} className="text-slate-400" />
              <span>Agreed Contractor Payout Fee</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 font-mono text-slate-400 text-xs">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                placeholder="120.00"
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Active Link Box if created */}
          {currentToken && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 pt-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Live Dispatch Link</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  currentStatus === 'DENIED' || currentStatus === 'DECLINED'
                    ? 'bg-rose-100 text-rose-800'
                    : currentStatus === 'ACCEPTED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {currentStatus}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-slate-600 truncate focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`p-1.5 rounded-lg border font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                    hasCopied
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Copy link"
                >
                  {hasCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition shrink-0"
                  title="Open portal"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between rounded-b-2xl">
          <div>
            {currentToken && !isCompletedJob && (
              <button
                type="button"
                disabled={isRevoking}
                onClick={handleRevoke}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={13} />
                <span>Revoke Link</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              Close
            </button>
            {!isCompletedJob && (
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerate}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Share2 size={13} />
                    <span>{currentToken ? 'Update Link' : 'Generate Link'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
