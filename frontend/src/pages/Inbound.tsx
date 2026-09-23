import { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  PhoneOff, 
  MapPin, 
  Car, 
  Wrench, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRightLeft, 
  Radio, 
  Sparkles, 
  FileText,
  Headphones,
  Check
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { useTenant } from '../context/TenantContext';
import { useSocket } from '../context/SocketContext';
import { jobService } from '../services/jobService';
import { toast } from 'sonner';

// 16-Service Roadside Catalog per PRD FR-1.4
const SERVICE_CATALOG = [
  'Tire Repair (plug)',
  'Stem valve replacement',
  'New Tire Replacement',
  'Used tire replacement',
  'NEW RIM replacement',
  'USED RIM replacement',
  'Tire Swap (ON RIM)',
  'Tire Swap (OFF RIM)',
  'Spare Tire Change',
  'Tire Rotation',
  'Battery Installation',
  'Battery Replacement',
  'Jump Start',
  'Battery Booster',
  'Lock Smith Service',
  'Towing Service',
];

interface CallLogEntry {
  id: string;
  phone: string;
  callerName: string;
  time: string;
  service: string;
  disposition: string;
  transferredToDm: boolean;
}

export default function Inbound() {
  const { country, currencySymbol, agentMode, setAgentMode } = useTenant();
  const { 
    incomingCall, 
    activeCall, 
    answerCall, 
    endCall, 
    transferCallToDm, 
    simulateIncomingCall 
  } = useSocket();

  // Intake Form State
  const [callerPhone, setCallerPhone] = useState('+1 (416) 555-0192');
  const [callerName, setCallerName] = useState('John Driver');
  const [leadSource, setLeadSource] = useState('DIRECT_CALL');
  const [serviceAddress, setServiceAddress] = useState('');
  const [vehicleMakeModel, setVehicleMakeModel] = useState('');
  const [tireSize, setTireSize] = useState('');
  const [selectedService, setSelectedService] = useState('Tire Repair (plug)');
  const [urgency, setUrgency] = useState<'URGENT' | 'STANDARD' | 'FUTURE'>('URGENT');
  const [etaMinutes, setEtaMinutes] = useState('30');
  const [notes, setNotes] = useState('');
  const [quotedPrice, setQuotedPrice] = useState('149.00');
  const [taxIncluded, setTaxIncluded] = useState(true);
  const [isProvisionAccount, setIsProvisionAccount] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Recent Inbound Call History
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>([
    {
      id: 'log-1',
      phone: '+1 (416) 555-8831',
      callerName: 'Sarah Jenkins',
      time: '12 mins ago',
      service: 'Spare Tire Change',
      disposition: 'Transferred to DM',
      transferredToDm: true,
    },
    {
      id: 'log-2',
      phone: '+1 (647) 555-4019',
      callerName: 'Fleet Unit #42',
      time: '34 mins ago',
      service: 'New Tire Replacement',
      disposition: 'Direct Dispatch Booked',
      transferredToDm: false,
    },
  ]);

  // Synchronize incoming caller into form when call pops
  useEffect(() => {
    if (!incomingCall) return;
    const timer = setTimeout(() => {
      setCallerPhone(incomingCall.from);
      setCallerName(incomingCall.fromName || 'Stranded Motorist');
      setServiceAddress('Highway 401 Eastbound shoulder near Exit 342, Mississauga, ON');
      setVehicleMakeModel('2021 Ford F-150');
      setTireSize('275/65R18');
      setNotes('Flat right front tire on highway shoulder. Hazard lights on.');
    }, 0);
    return () => clearTimeout(timer);
  }, [incomingCall]);

  // Timer for active call duration
  useEffect(() => {
    if (!activeCall) return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(interval);
      setCallDuration(0);
    };
  }, [activeCall]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Warm Transfer Call to Dispatcher Manager
  const handleWarmTransferToDm = async () => {
    if (!callerPhone) {
      toast.error('Caller phone is required for warm transfer');
      return;
    }
    setIsTransferring(true);
    try {
      const vehicleInfo = `${vehicleMakeModel || 'Vehicle'} | Tire: ${tireSize || 'Pending'}`;
      const transferNotes = `Breakdown at: ${serviceAddress || 'Address Pending'}. Service: ${selectedService}. Notes: ${notes || 'Immediate dispatch required'}`;

      await transferCallToDm({
        callerPhone,
        callerName,
        companyName: callerName,
        notes: transferNotes,
        vehicleInfo,
        transferType: 'INBOUND_MOTORIST',
      });

      // Add to local call log
      setCallLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          phone: callerPhone,
          callerName,
          time: 'Just now',
          service: selectedService,
          disposition: 'Warm Transferred to DM',
          transferredToDm: true,
        },
        ...prev,
      ]);

      toast.success(`Call transferred to Dispatcher Manager! DM notified to assign driver.`);
      endCall();
    } catch {
      toast.error('Failed to initiate warm transfer');
    } finally {
      setIsTransferring(false);
    }
  };

  // 2. Direct Book Job into Urgent Dispatch Queue
  const handleDirectBookJob = async () => {
    if (!callerPhone || !serviceAddress) {
      toast.error('Please enter caller phone and breakdown address');
      return;
    }
    setIsBooking(true);
    try {
      await jobService.createJob({
        customerName: callerName,
        customerPhone: callerPhone,
        serviceAddress,
        notes,
        urgency,
        countryCode: country,
        source: leadSource,
        quotedPriceCents: Math.round(parseFloat(quotedPrice || '0') * 100),
        taxIncluded,
        makeUserAccount: isProvisionAccount,
        services: [selectedService],
        vehicle: {
          makeModel: vehicleMakeModel,
          tireSize,
        },
      });

      setCallLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          phone: callerPhone,
          callerName,
          time: 'Just now',
          service: selectedService,
          disposition: 'Booked Direct to Dispatch',
          transferredToDm: false,
        },
        ...prev,
      ]);

      toast.success('Roadside job created and queued for immediate driver dispatch!');
      endCall();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create dispatch ticket');
    } finally {
      setIsBooking(false);
    }
  };

  // 3. Quick Dispositions (Wrong Number, Spam, Cancelled)
  const handleQuickDisposition = (disp: string) => {
    setCallLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        phone: callerPhone,
        callerName,
        time: 'Just now',
        service: selectedService,
        disposition: disp,
        transferredToDm: false,
      },
      ...prev,
    ]);
    toast.info(`Call logged as: ${disp}`);
    endCall();
  };

  const handleSimulateCall = () => {
    simulateIncomingCall('+1 (416) 555-0199', 'Roadside Motorist (Stranded on HWY)');
    setServiceAddress('Highway 401 Eastbound shoulder near Exit 342, Mississauga, ON');
    setVehicleMakeModel('2022 Ford F-150');
    setTireSize('275/65R18');
    setSelectedService('Tire Repair (plug)');
    setNotes('Front right tire shredded, stranded on highway shoulder. Needs immediate plug or spare swap.');
    toast.info('Simulated motorist call ringing on hotline!');
  };

  const hasLiveCall = !!incomingCall || !!activeCall;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inbound Roadside Hotline"
        subtitle={`Live motorist call intake, triage & warm transfer to Dispatcher Manager (${country} Region)`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateCall}
              className="btn-primary cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles size={15} />
              <span>⚡ Simulate Inbound Call</span>
            </button>
          </div>
        }
      />

      {/* Tri-State Presence & Status Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                agentMode === 'INBOUND'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : agentMode === 'OUTBOUND'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {agentMode === 'INBOUND' ? (
                <Radio className="w-5 h-5 text-emerald-600 animate-pulse" />
              ) : agentMode === 'OUTBOUND' ? (
                <PhoneCall className="w-5 h-5 text-blue-600" />
              ) : (
                <Headphones className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {agentMode === 'INBOUND'
                    ? 'Inbound Hotline Active — Listening for Roadside Calls'
                    : agentMode === 'OUTBOUND'
                    ? 'Outbound Mode Active — Inbound Screen Pops Blocked'
                    : 'Inactive / On Break — Zero Call Routing'}
                </h3>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${
                    agentMode === 'INBOUND'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : agentMode === 'OUTBOUND'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {agentMode}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {agentMode === 'INBOUND'
                  ? 'You are active in inbound queue. Motorist roadside calls ring directly on your console.'
                  : agentMode === 'OUTBOUND'
                  ? 'Hard lock active: you are working the outbound VA lead queue. Toggle to Inbound to take hotline calls.'
                  : 'Switch your status to Inbound to start receiving incoming motorist calls.'}
              </p>
            </div>
          </div>

          {/* Quick presence toggle button if not Inbound */}
          {agentMode !== 'INBOUND' && (
            <button
              type="button"
              onClick={() => {
                setAgentMode('INBOUND');
                toast.success('Switched to Inbound Hotline Mode!');
              }}
              className="btn-primary shrink-0 text-xs px-3 py-2 cursor-pointer flex items-center gap-1.5"
            >
              <Radio size={14} />
              <span>Switch to Inbound Hotline</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Active Call Console (Left) + Softphone / History (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Columns: Intake & Triage Console */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Call / Ringing Screen Pop Box */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            {/* Header with Call Status */}
            <div
              className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
                hasLiveCall
                  ? 'bg-red-50/70 border-red-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3 h-3 rounded-full ${
                    activeCall
                      ? 'bg-emerald-500 animate-ping'
                      : incomingCall
                      ? 'bg-red-600 animate-pulse'
                      : 'bg-slate-300'
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      {activeCall
                        ? `Live Call in Progress (${formatTimer(callDuration)})`
                        : incomingCall
                        ? 'Incoming Call Ringing...'
                        : 'Hotline Ready — Waiting for Caller'}
                    </span>
                    {hasLiveCall && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-800 border border-red-200">
                        Roadside Motorist
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Caller ID: {incomingCall?.from || activeCall?.from || callerPhone}
                  </p>
                </div>
              </div>

              {/* Call Controls */}
              <div className="flex items-center gap-2">
                {incomingCall && !activeCall && (
                  <button
                    type="button"
                    onClick={answerCall}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <PhoneCall size={14} />
                    <span>Answer Call</span>
                  </button>
                )}
                {hasLiveCall && (
                  <button
                    type="button"
                    onClick={endCall}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    <PhoneOff size={14} />
                    <span>Disconnect</span>
                  </button>
                )}
              </div>
            </div>

            {/* Intake Form */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Row 1: Caller Info & Lead Source */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Caller Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={callerPhone}
                    onChange={(e) => setCallerPhone(e.target.value)}
                    className="input-field text-xs font-mono font-bold"
                    placeholder="+1 (416) 555-0192"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Motorist / Contact Name
                  </label>
                  <input
                    type="text"
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    className="input-field text-xs"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Source
                  </label>
                  <select
                    value={leadSource}
                    onChange={(e) => setLeadSource(e.target.value)}
                    className="input-field text-xs"
                  >
                    <option value="DIRECT_CALL">Direct Phone Call</option>
                    <option value="WHATSAPP">WhatsApp Hotline</option>
                    <option value="WEBSITE">Website Booking</option>
                    <option value="FLEET_PORTAL">Fleet Portal</option>
                    <option value="MEMBER_PORTAL">Member Portal</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Stranded Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin size={13} className="text-red-600" />
                  <span>Stranded Roadside Breakdown Address <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  value={serviceAddress}
                  onChange={(e) => setServiceAddress(e.target.value)}
                  className="input-field text-xs"
                  placeholder="e.g. Highway 401 Eastbound shoulder near Exit 342, Mississauga, ON"
                />
              </div>

              {/* Row 3: Vehicle Specs & Tire Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Car size={13} className="text-slate-600" />
                    <span>Vehicle Year / Make / Model</span>
                  </label>
                  <input
                    type="text"
                    value={vehicleMakeModel}
                    onChange={(e) => setVehicleMakeModel(e.target.value)}
                    className="input-field text-xs"
                    placeholder="e.g. 2021 Ford F-150 / Freightliner Cascadia"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Wrench size={13} className="text-slate-600" />
                    <span>Exact Tire Size (On Sidewall)</span>
                  </label>
                  <input
                    type="text"
                    value={tireSize}
                    onChange={(e) => setTireSize(e.target.value)}
                    className="input-field text-xs font-mono font-bold"
                    placeholder="e.g. 275/65R18 or 11R22.5"
                  />
                </div>
              </div>

              {/* Row 4: 16-Service Catalog Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <span>Required Service (16-Service Roadside Catalog)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 border border-slate-200 rounded-lg bg-slate-50/50">
                  {SERVICE_CATALOG.map((srv) => (
                    <button
                      key={srv}
                      type="button"
                      onClick={() => setSelectedService(srv)}
                      className={`text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center justify-between border ${
                        selectedService === srv
                          ? 'bg-red-50 text-red-800 border-red-300 font-bold shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{srv}</span>
                      {selectedService === srv && <Check size={12} className="shrink-0 text-red-600 ml-1" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 5: Urgency, ETA, Quoted Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <AlertTriangle size={13} className="text-amber-500" />
                    <span>Urgency Level</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['URGENT', 'STANDARD', 'FUTURE'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setUrgency(lvl)}
                        className={`py-1 text-[11px] font-bold rounded-lg border cursor-pointer transition ${
                          urgency === lvl
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock size={13} className="text-slate-500" />
                    <span>Agreed ETA (Minutes)</span>
                  </label>
                  <input
                    type="number"
                    value={etaMinutes}
                    onChange={(e) => setEtaMinutes(e.target.value)}
                    className="input-field text-xs"
                    placeholder="30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quoted Price ({currencySymbol})
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={quotedPrice}
                        onChange={(e) => setQuotedPrice(e.target.value)}
                        className="input-field text-xs pl-6 font-bold"
                        placeholder="149.00"
                      />
                    </div>
                    <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={taxIncluded}
                        onChange={(e) => setTaxIncluded(e.target.checked)}
                        className="rounded border-slate-300 text-red-600"
                      />
                      <span>+Tax</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Row 6: Problem Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText size={13} className="text-slate-500" />
                  <span>Specific Roadside Problem Notes</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field text-xs"
                  placeholder="Front passenger blowout, vehicle parked safely on shoulder with hazard lights on. Locking lug nut socket located in glove compartment."
                />
              </div>

              {/* Checkbox: Auto provision customer account */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="provisionAcc"
                  checked={isProvisionAccount}
                  onChange={(e) => setIsProvisionAccount(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="provisionAcc" className="text-xs text-slate-700 cursor-pointer select-none">
                  <span className="font-bold">After all this make user account:</span> Auto-provision customer portal credentials & send live technician tracking SMS.
                </label>
              </div>

              {/* Action Buttons: Transfer to DM vs Book Direct */}
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Quick Dismiss:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuickDisposition('Wrong Number')}
                    className="px-2 py-1 text-[11px] font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    Wrong Number
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDisposition('Price Shopper / RNC')}
                    className="px-2 py-1 text-[11px] font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    Price Shopper
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDisposition('Spam / Irrelevant')}
                    className="px-2 py-1 text-[11px] font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    Spam
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Primary Handover: Warm Transfer to Dispatcher Manager */}
                  <button
                    type="button"
                    onClick={handleWarmTransferToDm}
                    disabled={isTransferring}
                    className="btn-primary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Warm handoff to Dispatcher Manager so DM can assign driver"
                  >
                    <ArrowRightLeft size={14} />
                    <span>{isTransferring ? 'Transferring...' : 'Transfer to Dispatcher Manager'}</span>
                  </button>

                  {/* Fallback Direct Book */}
                  <button
                    type="button"
                    onClick={handleDirectBookJob}
                    disabled={isBooking}
                    className="btn-secondary px-3 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>{isBooking ? 'Booking...' : 'Book Direct to Dispatch'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Softphone Space & Inbound Call History */}
        <div className="space-y-4">
          {/* Telnyx API Integration Box (Space preserved per user request) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Headphones size={16} className="text-red-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Telnyx WebRTC Softphone
                </h4>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                API Ready
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              In-browser SIP telephony client powered by Telnyx Call Control API. Supports instant ringtone playback, dual-trigger screen pop, and warm transfers.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] font-mono space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>Telnyx SIP Gateway:</span>
                <span className="font-bold text-emerald-700">Connected</span>
              </div>
              <div className="flex justify-between">
                <span>Audio Device:</span>
                <span>Headset (Stereo)</span>
              </div>
              <div className="flex justify-between">
                <span>Regional DID:</span>
                <span className="font-bold text-slate-900">
                  {country === 'US' ? '+1 (804) 326-5442' : country === 'UK' ? '+44 (20) 7946-0912' : '+1 (437) 375-5674'}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Inbound Shifts Log */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Shift Call History
                </h4>
              </div>
              <span className="text-[10px] text-slate-500 font-bold">{callLogs.length} Calls</span>
            </div>

            <div className="space-y-2.5">
              {callLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100/80 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{log.callerName}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{log.time}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-600">{log.phone}</div>
                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span className="text-slate-500">{log.service}</span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded ${
                        log.transferredToDm
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {log.disposition}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
