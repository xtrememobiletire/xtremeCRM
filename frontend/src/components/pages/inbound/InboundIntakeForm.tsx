import { useState, useRef } from 'react';
import { 
  Phone, 
  User, 
  MapPin, 
  Car, 
  Wrench, 
  AlertTriangle, 
  Clock, 
  FileText, 
  CheckCircle2, 
  Share2,
  Calendar,
  Check
} from 'lucide-react';
import ServiceSelectDropdown from './ServiceSelectDropdown';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';

interface InboundIntakeFormProps {
  callerPhone: string;
  setCallerPhone: (val: string) => void;
  callerName: string;
  setCallerName: (val: string) => void;
  leadSource: string;
  setLeadSource: (val: string) => void;
  serviceAddress: string;
  setServiceAddress: (val: string) => void;
  vehicleMakeModel: string;
  setVehicleMakeModel: (val: string) => void;
  tireSize: string;
  setTireSize: (val: string) => void;
  selectedService: string;
  setSelectedService: (val: string) => void;
  urgency: 'URGENT' | 'STANDARD' | 'FUTURE';
  setUrgency: (val: 'URGENT' | 'STANDARD' | 'FUTURE') => void;
  etaMinutes: string;
  setEtaMinutes: (val: string) => void;
  etaDate?: string;
  setEtaDate?: (val: string) => void;
  etaStartTime?: string;
  setEtaStartTime?: (val: string) => void;
  etaEndTime?: string;
  setEtaEndTime?: (val: string) => void;
  isEtaWindowActive?: boolean;
  setIsEtaWindowActive?: (val: boolean) => void;
  notes: string;
  setNotes: (val: string) => void;
  isProvisionAccount: boolean;
  setIsProvisionAccount: (val: boolean) => void;
  isBooking: boolean;
  onSubmitBooking: () => void;
}

const COMMON_TIRE_SIZES = ['275/65R18', '225/65R17', '265/70R17', '11R22.5', '295/75R22.5'];

const TIME_SLOT_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  const ampm = h < 12 ? 'AM' : 'PM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${ampm}`;
});

export default function InboundIntakeForm({
  callerPhone,
  setCallerPhone,
  callerName,
  setCallerName,
  leadSource,
  setLeadSource,
  serviceAddress,
  setServiceAddress,
  vehicleMakeModel,
  setVehicleMakeModel,
  tireSize,
  setTireSize,
  selectedService,
  setSelectedService,
  urgency,
  setUrgency,
  etaMinutes,
  setEtaMinutes,
  etaDate: propEtaDate,
  setEtaDate: propSetEtaDate,
  etaStartTime: propEtaStartTime,
  setEtaStartTime: propSetEtaStartTime,
  etaEndTime: propEtaEndTime,
  setEtaEndTime: propSetEtaEndTime,
  isEtaWindowActive: propIsEtaWindowActive,
  setIsEtaWindowActive: propSetIsEtaWindowActive,
  notes,
  setNotes,
  isProvisionAccount,
  setIsProvisionAccount,
  isBooking,
  onSubmitBooking,
}: InboundIntakeFormProps) {
  // Input references for sequential keyboard navigation
  const formRef = useRef<HTMLFormElement>(null);

  // Fallback local state if props are not supplied
  const [localEtaDate, setLocalEtaDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [localEtaStartTime, setLocalEtaStartTime] = useState('12:00 AM');
  const [localEtaEndTime, setLocalEtaEndTime] = useState('12:00 AM');
  const [localIsEtaWindowActive, setLocalIsEtaWindowActive] = useState(false);

  const etaDate = propEtaDate ?? localEtaDate;
  const setEtaDate = propSetEtaDate ?? setLocalEtaDate;
  const etaStartTime = propEtaStartTime ?? localEtaStartTime;
  const setEtaStartTime = propSetEtaStartTime ?? setLocalEtaStartTime;
  const etaEndTime = propEtaEndTime ?? localEtaEndTime;
  const setEtaEndTime = propSetEtaEndTime ?? setLocalEtaEndTime;
  const isEtaWindowActive = propIsEtaWindowActive ?? localIsEtaWindowActive;
  const setIsEtaWindowActive = propSetIsEtaWindowActive ?? setLocalIsEtaWindowActive;

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
            Sequential intake: enter motorist info, breakdown location, and dispatch ticket.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Intake</span>
        </div>
      </div>

      {/* Sequential Fields Container */}
      <div className="p-6 sm:p-8 space-y-5">
        {/* Field 1: Caller Phone */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 text-[10px] font-mono flex items-center justify-center font-bold">1</span>
            <Phone className="w-3.5 h-3.5 text-red-600" />
            <span>Caller Phone Number <span className="text-red-500">*</span></span>
          </label>
          <input
            type="text"
            value={callerPhone}
            onChange={(e) => setCallerPhone(e.target.value)}
            placeholder="+1 (416) 555-0192"
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
            required
            autoFocus
          />
        </div>

        {/* Field 2: Motorist / Contact Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">2</span>
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Motorist Name</span>
          </label>
          <input
            type="text"
            value={callerName}
            onChange={(e) => setCallerName(e.target.value)}
            placeholder="e.g. John Doe"
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          />
        </div>

        {/* Field 3: Lead Source Channel */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">3</span>
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Lead Source Channel</span>
          </label>
          <select
            value={leadSource}
            onChange={(e) => setLeadSource(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer shadow-2xs"
          >
            <option value="DIRECT_CALL">Direct Phone Call</option>
            <option value="WHATSAPP">WhatsApp Hotline</option>
            <option value="WEBSITE">Website Booking</option>
            <option value="FLEET_PORTAL">Fleet Portal</option>
            <option value="MEMBER_PORTAL">Member Portal</option>
          </select>
        </div>

        {/* Field 4: Breakdown Location / Address */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 text-[10px] font-mono flex items-center justify-center font-bold">4</span>
            <MapPin className="w-3.5 h-3.5 text-red-600" />
            <span>Breakdown Location / Address <span className="text-red-500">*</span></span>
          </label>
          <input
            type="text"
            value={serviceAddress}
            onChange={(e) => setServiceAddress(e.target.value)}
            placeholder="e.g. Highway 401 Eastbound shoulder near Exit 342, Mississauga, ON"
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
            required
          />
        </div>

        {/* Field 5: Vehicle Make & Model */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">5</span>
            <Car className="w-3.5 h-3.5 text-slate-400" />
            <span>Vehicle (Year / Make / Model)</span>
          </label>
          <input
            type="text"
            value={vehicleMakeModel}
            onChange={(e) => setVehicleMakeModel(e.target.value)}
            placeholder="e.g. 2021 Ford F-150 / Freightliner Cascadia"
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          />
        </div>

        {/* Field 6: Tire Size */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">6</span>
            <Wrench className="w-3.5 h-3.5 text-slate-400" />
            <span>Tire Size (On Sidewall)</span>
          </label>
          <input
            type="text"
            value={tireSize}
            onChange={(e) => setTireSize(e.target.value)}
            placeholder="e.g. 275/65R18 or 11R22.5"
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          />
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5">
            <span className="text-[10px] font-medium text-slate-400">Quick Select:</span>
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

        {/* Field 7: Required Service */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">7</span>
            <Wrench className="w-3.5 h-3.5 text-red-600" />
            <span>Required Roadside Service</span>
          </label>
          <ServiceSelectDropdown
            value={selectedService}
            onChange={setSelectedService}
          />
        </div>

        {/* Field 8: Dispatch Urgency */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">8</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Dispatch Urgency</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['URGENT', 'STANDARD', 'FUTURE'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setUrgency(level)}
                className={`py-2.5 text-xs font-bold rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  urgency === level
                    ? level === 'URGENT'
                      ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                      : 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{level}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Field 9: Agreed Motorist ETA & Driver Arrival Window */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">9</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Agreed Motorist ETA & Driver Arrival Window</span>
          </label>

          {/* Quick ETA Minutes */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={etaMinutes}
              onChange={(e) => setEtaMinutes(e.target.value)}
              placeholder="30"
              className="w-28 px-4 py-2 text-sm rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
            />
            <div className="flex items-center gap-1.5">
              {['15', '30', '45', '60'].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setEtaMinutes(mins)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                    etaMinutes === mins
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Driver Time Window Specification */}
          <div className={`p-3.5 rounded-xl border transition-all ${
            isEtaWindowActive 
              ? 'border-emerald-300 bg-emerald-50/40 shadow-2xs' 
              : 'border-slate-200 bg-slate-50/70'
          }`}>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <label 
                htmlFor="etaWindowCheckbox" 
                className="text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  id="etaWindowCheckbox"
                  checked={isEtaWindowActive}
                  onChange={(e) => setIsEtaWindowActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Specify Driver Arrival Window</span>
              </label>

              <button
                type="button"
                onClick={() => setIsEtaWindowActive(!isEtaWindowActive)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                  isEtaWindowActive
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
                title="Tick button to confirm arrival window"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isEtaWindowActive ? 'Applied ✓' : 'Tick to Apply'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Date: Default to current date */}
              <div>
                <span className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Date (Current Date)
                </span>
                <input
                  type="date"
                  value={etaDate}
                  onChange={(e) => {
                    setEtaDate(e.target.value);
                    setIsEtaWindowActive(true);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                />
              </div>

              {/* Initial Time Dropdown (Default: 12:00 AM) */}
              <div>
                <span className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Initial Time (From)
                </span>
                <select
                  value={etaStartTime}
                  onChange={(e) => {
                    setEtaStartTime(e.target.value);
                    setIsEtaWindowActive(true);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs cursor-pointer"
                >
                  {TIME_SLOT_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Last Time Dropdown (Default: 12:00 AM) */}
              <div>
                <span className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Last Time (To)
                </span>
                <select
                  value={etaEndTime}
                  onChange={(e) => {
                    setEtaEndTime(e.target.value);
                    setIsEtaWindowActive(true);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs cursor-pointer"
                >
                  {TIME_SLOT_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isEtaWindowActive && (
              <div className="mt-2 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Driver scheduled arrival: <strong>{etaStartTime}</strong> to <strong>{etaEndTime}</strong> on <strong>{etaDate}</strong>.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Field 10: Problem Notes for Technician */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">10</span>
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Problem Notes for Technician</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Front right tire shredded, vehicle on shoulder with hazard lights on. Locking lug nut socket located in glovebox."
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none shadow-2xs"
          />
        </div>

        {/* Field 11: Auto-Provision Customer Portal Account */}
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
            disabled={isBooking}
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
