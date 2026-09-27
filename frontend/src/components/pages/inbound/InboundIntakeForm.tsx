import { useRef } from 'react';
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
  Share2 
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
  notes: string;
  setNotes: (val: string) => void;
  isProvisionAccount: boolean;
  setIsProvisionAccount: (val: boolean) => void;
  isBooking: boolean;
  onSubmitBooking: () => void;
}

const COMMON_TIRE_SIZES = ['275/65R18', '225/65R17', '265/70R17', '11R22.5', '295/75R22.5'];

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

        {/* Field 9: Agreed Motorist ETA */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">9</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Agreed Motorist ETA (Minutes)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={etaMinutes}
              onChange={(e) => setEtaMinutes(e.target.value)}
              placeholder="30"
              className="w-28 px-4 py-2.5 text-sm rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
            />
            <div className="flex items-center gap-1.5">
              {['15', '30', '45', '60'].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setEtaMinutes(mins)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
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
