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
  Check
} from 'lucide-react';
import ServiceSelectDropdown from './ServiceSelectDropdown';

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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitBooking();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
      {/* Form Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Roadside Service Intake Form
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sequential intake: collect stranded motorist details, vehicle specs & dispatch job.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Intake Console Active</span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Step 1: Caller & Lead Channel */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-mono">1</span>
            <span>Caller & Channel</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Caller Phone <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                value={callerPhone}
                onChange={(e) => setCallerPhone(e.target.value)}
                placeholder="+1 (416) 555-0192"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Motorist / Contact Name</span>
              </label>
              <input
                type="text"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Lead Source</span>
              </label>
              <select
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition cursor-pointer"
              >
                <option value="DIRECT_CALL">Direct Phone Call</option>
                <option value="WHATSAPP">WhatsApp Hotline</option>
                <option value="WEBSITE">Website Booking</option>
                <option value="FLEET_PORTAL">Fleet Portal</option>
                <option value="MEMBER_PORTAL">Member Portal</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Breakdown Location */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-mono">2</span>
            <span>Stranded Roadside Breakdown Location</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              <span>Exact Roadside Location / Highway Shoulder <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              value={serviceAddress}
              onChange={(e) => setServiceAddress(e.target.value)}
              placeholder="e.g. Highway 401 Eastbound shoulder near Exit 342, Mississauga, ON"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Include highway name, travel direction (EB/WB/NB/SB), nearest cross-street or exit marker.
            </p>
          </div>
        </div>

        {/* Step 3: Vehicle Specs & Tire Size */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-mono">3</span>
            <span>Vehicle & Tire Specification</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-slate-500" />
                <span>Vehicle Year / Make / Model</span>
              </label>
              <input
                type="text"
                value={vehicleMakeModel}
                onChange={(e) => setVehicleMakeModel(e.target.value)}
                placeholder="e.g. 2021 Ford F-150 / Freightliner Cascadia"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-slate-500" />
                <span>Sidewall Tire Size</span>
              </label>
              <input
                type="text"
                value={tireSize}
                onChange={(e) => setTireSize(e.target.value)}
                placeholder="e.g. 275/65R18 or 11R22.5"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
              />

              {/* Quick tire size badges */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] font-semibold text-slate-400">Common:</span>
                {COMMON_TIRE_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setTireSize(sz)}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition"
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Required Service & Urgency (Modern Custom Dropdown, No Money Specified) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-mono">4</span>
            <span>Required Service & Priority</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Custom Modern Dropdown for Services */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Type of Service <span className="text-red-500">*</span>
              </label>
              <ServiceSelectDropdown
                value={selectedService}
                onChange={setSelectedService}
              />
            </div>

            {/* Urgency Level Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Urgency Level</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['URGENT', 'STANDARD', 'FUTURE'] as const).map((lvl) => {
                  const isSelected = urgency === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setUrgency(lvl)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                        isSelected
                          ? lvl === 'URGENT'
                            ? 'bg-red-600 text-white border-red-600 shadow-xs'
                            : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 shrink-0" />}
                      <span>{lvl}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Agreed ETA */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Agreed Verbal ETA to Motorist (Minutes)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={etaMinutes}
                onChange={(e) => setEtaMinutes(e.target.value)}
                placeholder="30"
                className="w-28 px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              <div className="flex items-center gap-1">
                {['15', '30', '45', '60'].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setEtaMinutes(mins)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition cursor-pointer ${
                      etaMinutes === mins
                        ? 'bg-slate-900 text-white border-slate-900 font-bold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 5: Roadside Problem Notes & Customer Account */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-mono">5</span>
            <span>Problem Notes & Dispatch Coordination</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Specific Roadside Problem Notes for Technician</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Front right tire shredded, vehicle on shoulder with hazard lights on. Locking lug nut socket located in glovebox."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="provisionAcc"
              checked={isProvisionAccount}
              onChange={(e) => setIsProvisionAccount(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
            />
            <label htmlFor="provisionAcc" className="text-xs text-slate-700 cursor-pointer select-none">
              <span className="font-bold">After all this make user account:</span> Auto-provision customer profile for SMS technician approach tracking.
            </label>
          </div>
        </div>

        {/* Step 6: Primary Submission Button */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isBooking}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isBooking ? 'Creating Job Ticket...' : 'Create Job Ticket & Dispatch'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
