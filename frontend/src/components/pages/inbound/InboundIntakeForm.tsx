import { useRef, useState, useEffect } from 'react';
import { 
  User, 
  MapPin, 
  Car, 
  Wrench, 
  AlertTriangle, 
  Clock, 
  FileText, 
  CheckCircle2, 
  Share2,
  Check,
  X
} from 'lucide-react';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import AddressAutocompleteInput, { type GeocodeLocation } from '../../common/AddressAutocompleteInput';
import MultiServiceSelector, { type SelectedServiceItem } from '../../common/MultiServiceSelector';
import { ArrivalWindowSelector, type ArrivalWindowData } from '../../common/ArrivalWindowSelector';
import CountrySiloSelector from '../../common/CountrySiloSelector';
import PhoneInputField from '../../common/PhoneInputField';
import { customerService } from '../../../services/customerService';
import { toast } from 'sonner';

interface InboundIntakeFormProps {
  countryCode: string;
  onCountryChange?: (country: 'CA' | 'US' | 'UK') => void;
  callerPhone: string;
  setCallerPhone: (val: string) => void;
  callerName: string;
  setCallerName: (val: string) => void;
  leadSource: string;
  setLeadSource: (val: string) => void;
  serviceAddress: string;
  setServiceAddress: (val: string) => void;
  onSelectLocation?: (loc: GeocodeLocation) => void;
  vehicleMakeModel: string;
  setVehicleMakeModel: (val: string) => void;
  tireSize: string;
  setTireSize: (val: string) => void;
  serviceItems: SelectedServiceItem[];
  setServiceItems: (items: SelectedServiceItem[]) => void;
  isTaxIncluded: boolean;
  setIsTaxIncluded: (val: boolean) => void;
  currencySymbol: string;
  taxRate: number;
  urgency: 'URGENT' | 'STANDARD' | 'FUTURE';
  setUrgency: (val: 'URGENT' | 'STANDARD' | 'FUTURE') => void;
  arrivalWindow?: ArrivalWindowData;
  setArrivalWindow?: (data: ArrivalWindowData) => void;
  etaMinutes?: string;
  setEtaMinutes?: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  isProvisionAccount: boolean;
  setIsProvisionAccount: (val: boolean) => void;
  isBooking: boolean;
  onSubmitBooking: () => void;
}

const COMMON_TIRE_SIZES = ['275/65R18', '225/65R17', '265/70R17', '11R22.5', '295/75R22.5'];

export default function InboundIntakeForm({
  countryCode,
  onCountryChange,
  callerPhone,
  setCallerPhone,
  callerName,
  setCallerName,
  leadSource,
  setLeadSource,
  serviceAddress,
  setServiceAddress,
  onSelectLocation,
  vehicleMakeModel,
  setVehicleMakeModel,
  tireSize,
  setTireSize,
  serviceItems,
  setServiceItems,
  isTaxIncluded,
  setIsTaxIncluded,
  currencySymbol,
  taxRate,
  urgency,
  setUrgency,
  arrivalWindow,
  setArrivalWindow,
  etaMinutes,
  setEtaMinutes,
  notes,
  setNotes,
  isProvisionAccount,
  setIsProvisionAccount,
  isBooking,
  onSubmitBooking,
}: InboundIntakeFormProps) {
  // Input references for sequential keyboard navigation
  const formRef = useRef<HTMLFormElement>(null);

  // Keyboard navigation: Alt+Down / Alt+Up moves between inputs, Alt+Enter submits
  useKeyboardShortcuts({
    'Alt+Enter': () => onSubmitBooking(),
    'Alt+ArrowDown': () => {
      const inputs = formRef.current?.querySelectorAll<HTMLElement>('input, select, textarea, button[type="button"]');
      if (!inputs) return;
      const active = document.activeElement;
      const arr = Array.from(inputs);
      const idx = arr.indexOf(active as HTMLElement);
      if (idx >= 0 && idx < arr.length - 1) {
        arr[idx + 1].focus();
      }
    },
    'Alt+ArrowUp': () => {
      const inputs = formRef.current?.querySelectorAll<HTMLElement>('input, select, textarea, button[type="button"]');
      if (!inputs) return;
      const active = document.activeElement;
      const arr = Array.from(inputs);
      const idx = arr.indexOf(active as HTMLElement);
      if (idx > 0) {
        arr[idx - 1].focus();
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitBooking();
  };

  // Customer debounced lookup for repeat motorists
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [dismissedLookup, setDismissedLookup] = useState(false);

  useEffect(() => {
    const digits = callerPhone.replace(/[^0-9]/g, '');
    if (digits.length < 7) {
      setLookupResult(null);
      return;
    }
    if (dismissedLookup) return;

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await customerService.lookupCustomer(callerPhone, countryCode);
        if (res?.found && (res.customer || res.fleet)) {
          setLookupResult(res);
        } else {
          setLookupResult(null);
        }
      } catch {
        setLookupResult(null);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [callerPhone, countryCode, dismissedLookup]);

  const cust = lookupResult?.customer;
  const fleet = lookupResult?.fleet;
  const latestVeh = cust?.jobs?.[0]?.vehicle || cust?.vehicles?.[0] || fleet?.vehicles?.[0];
  const latestVehicleStr = latestVeh ? `${latestVeh.year || ''} ${latestVeh.make || ''} ${latestVeh.model || ''} (${latestVeh.tireSize || 'Std tire'})`.trim() : '';
  const latestAddressStr = cust?.jobs?.[0]?.serviceAddress || cust?.address || fleet?.address || '';

  const handleApplyCustomerDetails = () => {
    if (!lookupResult) return;
    const targetName = cust?.fullName || fleet?.contactPerson || fleet?.name || '';
    if (targetName) setCallerName(targetName);

    if (latestVeh) {
      const vehMakeModel = latestVeh.make ? `${latestVeh.year || ''} ${latestVeh.make} ${latestVeh.model}`.trim() : '';
      if (vehMakeModel) setVehicleMakeModel(vehMakeModel);
      if (latestVeh.tireSize) setTireSize(latestVeh.tireSize);
    }

    if (latestAddressStr && !serviceAddress) {
      setServiceAddress(latestAddressStr);
    }

    toast.success(`Loaded details for ${targetName || 'customer'} (service items unchanged)`);
    setDismissedLookup(true);
  };

  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit} 
      className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Roadside Service Intake Form
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sequential intake: enter customer info, breakdown location, and dispatch ticket.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Intake ({countryCode})</span>
        </div>
      </div>

      {/* Sequential Fields Container */}
      <div className="p-6 sm:p-8 space-y-5">
        {/* Step 1: Regional Silo Country Selector */}
        {onCountryChange && (
          <CountrySiloSelector
            country={countryCode as any}
            onChange={onCountryChange}
            stepNumber={1}
            subtitle="Agent Region Control"
          />
        )}

        {/* Step 2: Caller Phone with Country Dial Prefix & Auto-lookup */}
        <div>
          <PhoneInputField
            value={callerPhone}
            onChange={(formatted) => {
              setCallerPhone(formatted);
              setDismissedLookup(false);
            }}
            countryCode={countryCode}
            label="Caller Phone Number"
            stepNumber={onCountryChange ? 2 : 1}
            required
            autoFocus
            isSearching={isSearching}
          />

          {/* Existing Customer Match Dropdown */}
          {lookupResult && !dismissedLookup && (
            <div className="mt-2.5 p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                  <Check size={14} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-900 truncate">
                      {cust?.fullName || fleet?.name || 'Valued Motorist'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                      {fleet ? 'B2B Fleet Match' : 'Repeat Customer'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap gap-x-2">
                    {latestVehicleStr && <span><strong>Vehicle:</strong> {latestVehicleStr}</span>}
                    {latestAddressStr && <span><strong>Last Loc:</strong> {latestAddressStr}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleApplyCustomerDetails}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={13} />
                  <span>Auto-fill Previous Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedLookup(true)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
                  title="Dismiss (keep typing new details)"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Customer Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">{onCountryChange ? 3 : 2}</span>
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Customer Name <span className="text-red-500">*</span></span>
          </label>
          <input
            type="text"
            value={callerName}
            onChange={(e) => setCallerName(e.target.value)}
            placeholder="e.g. John Smith"
            required
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          />
        </div>

        {/* Step 4: Lead Source Channel */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">{onCountryChange ? 4 : 3}</span>
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Inbound Source Channel</span>
          </label>
          <select
            value={leadSource}
            onChange={(e) => setLeadSource(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          >
            <option value="DIRECT_CALL">Direct Phone Call (Hotline)</option>
            <option value="WHATSAPP">WhatsApp Dispatch</option>
            <option value="WEBSITE">Website Self-Book</option>
            <option value="LANDING_PAGE_SELF_BOOK">Landing Page Form</option>
            <option value="FLEET_PORTAL">Fleet Portal Inbound</option>
          </select>
        </div>

        {/* Step 5: Breakdown Address & Mapbox Autocomplete */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 text-[10px] font-mono flex items-center justify-center font-bold">{onCountryChange ? 5 : 4}</span>
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              <span>Breakdown Location / Address <span className="text-red-500">*</span></span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Mapbox Places ({countryCode})</span>
          </label>
          <AddressAutocompleteInput
            value={serviceAddress}
            onChange={setServiceAddress}
            onSelectLocation={onSelectLocation}
            countryCode={countryCode}
            placeholder={`Enter street address, intersection, highway marker in ${countryCode}...`}
            className="w-full"
            required
          />
        </div>

        {/* Step 6: Vehicle Make & Model */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">{onCountryChange ? 6 : 5}</span>
            <Car className="w-3.5 h-3.5 text-slate-400" />
            <span>Vehicle (Year / Make / Model)</span>
          </label>
          <input
            type="text"
            value={vehicleMakeModel}
            onChange={(e) => setVehicleMakeModel(e.target.value)}
            placeholder="e.g. 2021 Toyota RAV4 / Ford F-150"
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          />
        </div>

        {/* Step 7: Tire Specification */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">{onCountryChange ? 7 : 6}</span>
              <Wrench className="w-3.5 h-3.5 text-slate-400" />
              <span>Tire Size / Specification</span>
            </label>
          </div>
          <input
            type="text"
            value={tireSize}
            onChange={(e) => setTireSize(e.target.value)}
            placeholder="e.g. 275/65R18 or 225/65R17"
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {COMMON_TIRE_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setTireSize(size)}
                className={`text-[11px] font-mono px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                  tireSize === size
                    ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Step 8: Multi-Service Work Order */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">{onCountryChange ? 8 : 7}</span>
            <Wrench className="w-3.5 h-3.5 text-red-600" />
            <span>Billable Work Order & Services</span>
          </label>
          <MultiServiceSelector
            countryCode={countryCode}
            currencySymbol={currencySymbol}
            taxRate={taxRate}
            selectedItems={serviceItems}
            onChange={setServiceItems}
            isTaxIncluded={isTaxIncluded}
            onToggleTaxIncluded={setIsTaxIncluded}
          />
        </div>

        {/* Step 9: Arrival Timing & Service Window ("Between Time") */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">{onCountryChange ? 9 : 8}</span>
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Arrival Timing & Service Window ("Between Time")</span>
            </span>
            <span className="text-[11px] font-mono text-blue-600 font-bold">{arrivalWindow?.displayLabel || 'Default ~30m'}</span>
          </label>
          {setArrivalWindow ? (
            <ArrivalWindowSelector
              value={arrivalWindow}
              onChange={(data) => {
                setArrivalWindow(data);
                if (data.mode === 'ETA') {
                  setUrgency('URGENT');
                } else if (data.mode === 'WINDOW' && urgency === 'URGENT') {
                  const isFutureDate = data.appointmentDate && new Date(data.appointmentDate).toDateString() !== new Date().toDateString();
                  setUrgency(isFutureDate ? 'FUTURE' : 'STANDARD');
                }
              }}
            />
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={etaMinutes}
                onChange={(e) => setEtaMinutes && setEtaMinutes(e.target.value)}
                placeholder="30"
                className="w-28 px-4 py-2.5 text-sm rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
              />
            </div>
          )}
        </div>

        {/* Step 10: Dispatch Urgency */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">{onCountryChange ? 10 : 9}</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Dispatch Urgency Priority</span>
            </span>
            {arrivalWindow?.mode !== 'WINDOW' && (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Locked to URGENT for Quick ETA
              </span>
            )}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['URGENT', 'STANDARD', 'FUTURE'] as const).map((level) => {
              const isUrgentEta = arrivalWindow?.mode !== 'WINDOW';
              const isDisabled = isUrgentEta && level !== 'URGENT';
              return (
                <button
                  key={level}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && setUrgency(level)}
                  title={isDisabled ? 'Quick ETA enforces URGENT priority. Switch to Between Time above for Standard or Future.' : undefined}
                  className={`py-2.5 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200 select-none'
                      : urgency === level
                        ? level === 'URGENT'
                          ? 'bg-red-600 text-white border-red-600 shadow-2xs cursor-pointer'
                          : 'bg-slate-900 text-white border-slate-900 shadow-2xs cursor-pointer'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <span>{level}</span>
                </button>
              );
            })}
          </div>
          {arrivalWindow?.mode !== 'WINDOW' && (
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <span>Quick ETA is active. For Standard or Future scheduling, switch to</span>
              <span className="font-semibold text-blue-600">Between Time (Arrival Window)</span>
              <span>above.</span>
            </p>
          )}
        </div>

        {/* Step 11: Problem Notes for Technician */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">{onCountryChange ? 11 : 10}</span>
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Problem Notes for Technician</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Front right tire flat on highway shoulder with hazard lights on. Locking lug nut socket located in glovebox."
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none shadow-2xs"
          />
        </div>

        {/* Step 12: Auto-Provision Customer Portal Account */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <input
            type="checkbox"
            id="provisionAcc"
            checked={isProvisionAccount}
            onChange={(e) => setIsProvisionAccount(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
          />
          <label htmlFor="provisionAcc" className="text-xs text-slate-700 cursor-pointer select-none">
            <span className="font-bold">Auto-create profile:</span> Send customer SMS with live technician tracking link.
          </label>
        </div>

        {/* Submission Bar */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono font-bold text-slate-700">Alt+Enter</kbd> to submit from any field
          </span>

          <button
            type="submit"
            disabled={isBooking || serviceItems.length === 0}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isBooking ? 'Dispatching...' : 'Create Ticket & Dispatch'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
