import { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Truck, 
  Copy, 
  Check, 
  PhoneCall, 
  RotateCcw, 
  Sparkles, 
  Calendar,
  Clock,
  UploadCloud,
  Edit2,
  Save,
History,
  Briefcase,
  Tag,
  Wrench,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  resolveLeadTimezone, 
  zonedWallTimeToUtc, 
  formatDualPktAndCustomerTime 
} from '../../utils/date';
import { leadService } from '../../services/leadService';

interface VaFocusCardProps {
  lead: any;
  onDisposition: (params: {
    id: string;
    disposition: string;
    notes?: string;
    callbackDate?: string;
    callbackDay?: string;
    callbackTime?: string;
    callbackTimezone?: string;
    callbackData?: any;
    disqualificationReason?: string;
  }) => void;
  isSubmitting: boolean;
  onRefreshQueue: () => void;
  onOpenUpload?: () => void;
  onOpenDispositionModal?: (lead: any) => void;
}

const DISPOSITION_OPTIONS = [
  { 
    value: 'INTERESTED', 
    label: '🔥 Interested', 
    activeClass: 'bg-purple-100 text-purple-900 border-purple-400 ring-2 ring-purple-400/50', 
    defaultClass: 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100' 
  },
  { 
    value: 'CALLBACK', 
    label: '📅 Callback', 
    activeClass: 'bg-blue-100 text-blue-900 border-blue-400 ring-2 ring-blue-400/50', 
    defaultClass: 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100' 
  },
  { 
    value: 'VOICEMAIL', 
    label: '🎙️ Voicemail', 
    activeClass: 'bg-slate-200 text-slate-900 border-slate-400 ring-2 ring-slate-400/50', 
    defaultClass: 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200' 
  },
  { 
    value: 'NO_ANSWER', 
    label: '📞 No Answer', 
    activeClass: 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-400/50', 
    defaultClass: 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100' 
  },
  { 
    value: 'RNC', 
    label: '🚫 RNC', 
    title: 'Ring No Contact — Kills lead immediately on 1st strike (Never dialed again)',
    activeClass: 'bg-rose-100 text-rose-900 border-rose-400 ring-2 ring-rose-400/50', 
    defaultClass: 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100' 
  },
  { 
    value: 'NOT_INTERESTED', 
    label: '❌ Not Interested', 
    activeClass: 'bg-slate-200 text-slate-900 border-slate-400 ring-2 ring-slate-400/50', 
    defaultClass: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' 
  },
  { 
    value: 'WRONG_NUMBER', 
    label: '⚠️ Wrong Number', 
    activeClass: 'bg-rose-100 text-rose-800 border-rose-400 ring-2 ring-rose-400/50', 
    defaultClass: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100' 
  },
];

export default function VaFocusCard({
  lead,
  onDisposition,
  isSubmitting,
  onRefreshQueue,
  onOpenUpload,
  onOpenDispositionModal,
}: VaFocusCardProps) {
  const queryClient = useQueryClient();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedDisposition, setSelectedDisposition] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [showCallbackPicker, setShowCallbackPicker] = useState(false);
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackDay, setCallbackDay] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  const [callbackTimezone, setCallbackTimezone] = useState('America/Toronto');

  // In-App Call Timer state (zero DB columns)
  const [callingStartTime, setCallingStartTime] = useState<number | null>(null);
  const [callElapsedSeconds, setCallElapsedSeconds] = useState<number>(0);

  // Inline Fleet Data Editing
  const [isEditingData, setIsEditingData] = useState(false);
  const [isSavingData, setIsSavingData] = useState(false);
  const [editFormData, setEditFormData] = useState({
    companyName: '',
    phone: '',
    altPhone: '',
    email: '',
    poaEmail: '',
    fleetManager: '',
    ceoOwnerName: '',
    address: '',
    website: '',
    numberOfUnits: '',
    vehicleTypes: '',
    tireSizes: '',
  });

  // Call timer interval
  useEffect(() => {
    if (!callingStartTime) {
      setCallElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setCallElapsedSeconds(Math.floor((Date.now() - callingStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [callingStartTime]);

  useEffect(() => {
    if (lead) {
      setCallbackTimezone(resolveLeadTimezone(lead));
      setSelectedDisposition(null);
      setNotes('');
      setShowCallbackPicker(false);
      setCallbackDate('');
      setCallbackDay('');
      setCallbackTime('');
      setCallingStartTime(null);
      setIsEditingData(false);

      setEditFormData({
        companyName: lead.companyName || '',
        phone: lead.phone || '',
        altPhone: lead.altPhone || '',
        email: lead.email || '',
        poaEmail: lead.poaEmail || '',
        fleetManager: lead.fleetManager || lead.contactPerson || '',
        ceoOwnerName: lead.ceoOwnerName || '',
        address: lead.address || '',
        website: lead.website || '',
        numberOfUnits: lead.numberOfUnits ? String(lead.numberOfUnits) : '',
        vehicleTypes: Array.isArray(lead.vehicleTypes) ? lead.vehicleTypes.join(', ') : (lead.vehicleTypes || ''),
        tireSizes: Array.isArray(lead.tireSizes) ? lead.tireSizes.join(', ') : (lead.commonTireSizes || lead.tireSizes || ''),
      });
    }
  }, [lead?.id]);

  const dualClockPreview = useMemo(() => {
    if (!lead || !callbackDate || !callbackTime) return null;
    const timeParts = callbackTime.match(/(\d{1,2}):(\d{2})/);
    if (!timeParts) return null;
    let hour = parseInt(timeParts[1], 10);
    const minute = parseInt(timeParts[2], 10);
    if (/pm/i.test(callbackTime) && hour < 12) hour += 12;
    if (/am/i.test(callbackTime) && hour === 12) hour = 0;
    const tz = callbackTimezone || resolveLeadTimezone(lead);
    const utcDate = zonedWallTimeToUtc(callbackDate, hour, minute, tz);
    return formatDualPktAndCustomerTime(utcDate, tz);
  }, [callbackDate, callbackTime, callbackTimezone, lead]);

  const hitHistory: any[] = useMemo(() => {
    if (!lead) return [];
    if (Array.isArray(lead.hitHistory) && lead.hitHistory.length > 0) {
      return lead.hitHistory;
    }
    return [];
  }, [lead?.hitHistory]);

  if (!lead) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
          Your Calling Queue is Empty
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mb-6">
          You currently hold 0 active leads. Fresh leads will be assigned immediately when an active day batch runs or when an Admin/GM distributes leads.
        </p>
        <div className="flex items-center justify-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onRefreshQueue}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Check for Leads Now</span>
          </button>

          {onOpenUpload && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition cursor-pointer shadow-2xs"
            >
              <UploadCloud className="w-4 h-4 text-slate-600" />
              <span>Upload Spreadsheet</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName}`);
    setTimeout(() => {
      setCopiedField(null);
    }, 1500);
  };

  const handleDial = () => {
    if (!lead.phone) return;
    navigator.clipboard.writeText(lead.phone);
    setCallingStartTime(Date.now());
    toast.success(`Copied ${lead.phone} to clipboard & started call timer!`);
  };

  const handleEndCall = () => {
    setCallingStartTime(null);
    toast.info('Call timer ended');
  };

  const handleSelectDisposition = (disp: string) => {
    if (selectedDisposition === disp) {
      setSelectedDisposition(null);
      setShowCallbackPicker(false);
    } else {
      setSelectedDisposition(disp);
      setShowCallbackPicker(disp === 'CALLBACK');
    }
  };

  const setQuickCallback = (hoursFromNow: number) => {
    const tz = callbackTimezone || resolveLeadTimezone(lead);
    const target = new Date(Date.now() + hoursFromNow * 3600 * 1000);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(target);

    const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
    const dateStr = `${get('year')}-${get('month')}-${get('day')}`;
    const timeStr = `${get('hour')}:${get('minute')}`;

    setCallbackDate(dateStr);
    setCallbackTime(timeStr);

    const dayName = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(target);
    setCallbackDay(dayName);
  };

  const handleSaveFleetData = async () => {
    try {
      setIsSavingData(true);
      await leadService.updateLead(lead.id, {
        companyName: editFormData.companyName.trim() || undefined,
        phone: editFormData.phone.trim() || undefined,
        altPhone: editFormData.altPhone.trim() || null,
        email: editFormData.email.trim() || null,
        poaEmail: editFormData.poaEmail.trim() || null,
        fleetManager: editFormData.fleetManager.trim() || null,
        ceoOwnerName: editFormData.ceoOwnerName.trim() || null,
        address: editFormData.address.trim() || null,
        website: editFormData.website.trim() || null,
        numberOfUnits: editFormData.numberOfUnits ? parseInt(editFormData.numberOfUnits, 10) : null,
        vehicleTypes: editFormData.vehicleTypes.trim() || null,
        commonTireSizes: editFormData.tireSizes.trim() || null,
      });

      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      await queryClient.invalidateQueries({ queryKey: ['agent-queue'] });
      toast.success('Fleet details updated successfully');
      setIsEditingData(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update fleet details');
    } finally {
      setIsSavingData(false);
    }
  };

  const handleCommitDisposition = () => {
    if (!selectedDisposition) {
      if (onOpenDispositionModal) {
        onOpenDispositionModal(lead);
      } else {
        toast.error('Please select a disposition outcome first');
      }
      return;
    }

    // Build call duration tag if timer was running
    let timerPrefix = '';
    if (callingStartTime) {
      const elapsed = Math.max(1, Math.floor((Date.now() - callingStartTime) / 1000));
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      timerPrefix = `[Call Duration: ${m}m ${s}s | Dialed: ${lead.phone}] `;
      setCallingStartTime(null);
    }

    const finalNotes = timerPrefix + (notes.trim() ? notes.trim() : '');

    if (selectedDisposition === 'CALLBACK') {
      if (!callbackDate) {
        setShowCallbackPicker(true);
        toast.error('Please select a callback date and time before saving');
        return;
      }
      const tz = callbackTimezone || resolveLeadTimezone(lead);
      onDisposition({
        id: lead.id,
        disposition: 'CALLBACK',
        notes: finalNotes || undefined,
        callbackDate,
        callbackDay: callbackDay || undefined,
        callbackTime: callbackTime || undefined,
        callbackTimezone: tz,
        callbackData: {
          callbackDate,
          callbackDay: callbackDay || undefined,
          callbackTime: callbackTime || undefined,
          callbackTimezone: tz,
        },
      });
      setSelectedDisposition(null);
      setShowCallbackPicker(false);
      setNotes('');
      return;
    }

    onDisposition({
      id: lead.id,
      disposition: selectedDisposition,
      notes: finalNotes || undefined,
    });
    setSelectedDisposition(null);
    setNotes('');
  };

  const attempts = Number(lead.callAttemptsCount || 0);

  return (
    <div className="max-w-4xl mx-auto bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
      {/* Top Banner (Clean light header, NO dark black banner) */}
      <div className="p-4 sm:p-6 bg-slate-50/80 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 font-mono text-[10px] font-bold uppercase tracking-wider border border-red-200">
                1-Lead Focus Mode
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                attempts >= 2 
                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                Attempt {attempts + 1} of 3
              </span>
              {lead.numberOfUnits && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono text-[10px] font-bold border border-blue-200">
                  {lead.numberOfUnits} Units
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <h2 className="text-lg sm:text-xl font-bold truncate text-slate-900">
                {lead.companyName}
              </h2>
              <button
                type="button"
                onClick={() => copyToClipboard(lead.companyName, 'Company Name')}
                title="Copy Company Name"
                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer shadow-2xs"
              >
                {copiedField === 'Company Name' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Header Action Buttons & Live Call Timer */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setIsEditingData(!isEditingData)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
            >
              <Edit2 size={13} className="text-blue-600" />
              <span>{isEditingData ? 'Close Editor' : 'Edit Fleet Data'}</span>
            </button>

            {/* In-App Call Timer & Dial Button */}
            {callingStartTime ? (
              <div className="flex items-center gap-1.5">
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 font-mono font-bold text-xs shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                  <span>
                    Calling • {String(Math.floor(callElapsedSeconds / 60)).padStart(2, '0')}:{String(callElapsedSeconds % 60).padStart(2, '0')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
                  title="End Call Timer"
                >
                  End Call
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDial}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xs transition shrink-0 active:scale-95 cursor-pointer"
                title="Dial Prospect & Copy Phone"
              >
                <PhoneCall size={16} />
                <span>Dial Prospect</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCommitDisposition}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl font-bold text-xs shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50 ${
                selectedDisposition
                  ? 'bg-blue-600 hover:bg-blue-500 text-white ring-2 ring-blue-400/50'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs'
              }`}
            >
              <Calendar size={14} />
              <span>
                {selectedDisposition
                  ? `Set (${selectedDisposition.replace(/_/g, ' ')})`
                  : 'Set Disposition'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* INLINE EDITING FORM (When isEditingData is TRUE) */}
        {isEditingData ? (
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-blue-200/80">
              <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                <Edit2 size={13} /> Edit All 12 Fleet Columns & Equipment
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingData(false)}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800 rounded-lg hover:bg-blue-100/60 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingData}
                  onClick={handleSaveFleetData}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} />
                  <span>{isSavingData ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company Name *</label>
                <input
                  type="text"
                  value={editFormData.companyName}
                  onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Primary Phone *</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alternative Phone</label>
                <input
                  type="text"
                  value={editFormData.altPhone}
                  onChange={(e) => setEditFormData({ ...editFormData, altPhone: e.target.value })}
                  placeholder="Secondary / Dispatch line"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Official Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="office@fleet.com"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Direct / POA Email</label>
                <input
                  type="email"
                  value={editFormData.poaEmail}
                  onChange={(e) => setEditFormData({ ...editFormData, poaEmail: e.target.value })}
                  placeholder="manager@fleet.com"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Fleet / Operations Manager</label>
                <input
                  type="text"
                  value={editFormData.fleetManager}
                  onChange={(e) => setEditFormData({ ...editFormData, fleetManager: e.target.value })}
                  placeholder="John Smith"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">CEO / Owner Name</label>
                <input
                  type="text"
                  value={editFormData.ceoOwnerName}
                  onChange={(e) => setEditFormData({ ...editFormData, ceoOwnerName: e.target.value })}
                  placeholder="Owner Name"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Fleet Units (NOU)</label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.numberOfUnits}
                  onChange={(e) => setEditFormData({ ...editFormData, numberOfUnits: e.target.value })}
                  placeholder="e.g. 15"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Website</label>
                <input
                  type="text"
                  value={editFormData.website}
                  onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="font-semibold text-slate-700 block mb-1">Company Physical Address</label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  placeholder="123 Industrial Way, Suite A"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Vehicle Types (Fleet Mix)</label>
                <input
                  type="text"
                  value={editFormData.vehicleTypes}
                  onChange={(e) => setEditFormData({ ...editFormData, vehicleTypes: e.target.value })}
                  placeholder="Box Trucks, Semis, Sprinters"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Common Tire Sizes Used</label>
                <input
                  type="text"
                  value={editFormData.tireSizes}
                  onChange={(e) => setEditFormData({ ...editFormData, tireSizes: e.target.value })}
                  placeholder="11R22.5, 295/75R22.5, 225/70R19.5"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>
        ) : (
          /* READABLE 3-COLUMN GRID: ALL 12 CSV COLUMNS + SPECS */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {/* 1. Primary Phone */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Phone size={13} />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] uppercase font-bold text-slate-400 font-mono">1. Primary Phone</div>
                  <div className="text-xs font-bold text-slate-900 font-mono truncate">{lead.phone || 'N/A'}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(lead.phone, 'Phone')}
                title="Copy Primary Phone"
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
              >
                {copiedField === 'Phone' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              </button>
            </div>

            {/* 2. Alt Phone */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <Phone size={13} />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] uppercase font-bold text-slate-400 font-mono">2. Alt Phone</div>
                  <div className="text-xs font-medium text-slate-800 font-mono truncate">
                    {lead.altPhone || <span className="text-slate-400 italic font-sans">Not recorded</span>}
                  </div>
                </div>
              </div>
              {lead.altPhone && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(lead.altPhone, 'Alternative Phone')}
                  title="Copy Alt Phone"
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                >
                  {copiedField === 'Alternative Phone' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              )}
            </div>

            {/* 3. Official Email */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Mail size={13} />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] uppercase font-bold text-slate-400 font-mono">3. Official Email</div>
                  <div className="text-xs font-medium text-slate-800 truncate">
                    {lead.email || <span className="text-slate-400 italic">Not recorded</span>}
                  </div>
                </div>
              </div>
              {lead.email && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(lead.email, 'Email')}
                  title="Copy Email"
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                >
                  {copiedField === 'Email' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              )}
            </div>

            {/* 4. Direct POA Email */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Mail size={13} />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] uppercase font-bold text-slate-400 font-mono">4. Direct / POA Email</div>
                  <div className="text-xs font-medium text-slate-800 truncate">
                    {lead.poaEmail || <span className="text-slate-400 italic">Not recorded</span>}
                  </div>
                </div>
              </div>
              {lead.poaEmail && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(lead.poaEmail, 'POA Email')}
                  title="Copy POA Email"
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                >
                  {copiedField === 'POA Email' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              )}
            </div>

            {/* 5. Fleet Manager */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <User size={13} />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] uppercase font-bold text-slate-400 font-mono">5. Fleet / Ops Manager</div>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {lead.fleetManager || lead.contactPerson || <span className="text-slate-400 italic font-normal">Not recorded</span>}
                  </div>
                </div>
              </div>
              {(lead.fleetManager || lead.contactPerson) && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(lead.fleetManager || lead.contactPerson, 'Fleet Manager')}
                  title="Copy Fleet Manager"
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                >
                  {copiedField === 'Fleet Manager' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              )}
            </div>

            {/* 6. CEO / Owner Name */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Briefcase size={13} />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] uppercase font-bold text-slate-400 font-mono">6. CEO / Owner Name</div>
                  <div className="text-xs font-semibold text-slate-800 truncate">
                    {lead.ceoOwnerName || <span className="text-slate-400 italic font-normal">Not recorded</span>}
                  </div>
                </div>
              </div>
              {lead.ceoOwnerName && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(lead.ceoOwnerName, 'CEO / Owner')}
                  title="Copy CEO / Owner"
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                >
                  {copiedField === 'CEO / Owner' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              )}
            </div>

            {/* 7. Fleet Units (NOU) */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <Truck size={13} />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] uppercase font-bold text-slate-400 font-mono">7. Fleet Size (NOU)</div>
                  <div className="text-xs font-bold text-slate-900 font-mono truncate">
                    {lead.numberOfUnits ? `${lead.numberOfUnits} commercial units` : <span className="text-slate-400 italic font-normal font-sans">Not recorded</span>}
                  </div>
                </div>
              </div>
              {lead.numberOfUnits && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(String(lead.numberOfUnits), 'Fleet Units')}
                  title="Copy Units"
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                >
                  {copiedField === 'Fleet Units' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              )}
            </div>

            {/* 8. Website */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <Globe size={13} />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] uppercase font-bold text-slate-400 font-mono">8. Website</div>
                  {lead.website ? (
                    <a
                      href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:underline truncate block"
                    >
                      {lead.website}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Not recorded</span>
                  )}
                </div>
              </div>
              {lead.website && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(lead.website, 'Website')}
                  title="Copy Website"
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                >
                  {copiedField === 'Website' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              )}
            </div>

            {/* 9. Vehicle Types */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                  <Tag size={13} />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] uppercase font-bold text-slate-400 font-mono">9. Vehicle Types</div>
                  <div className="text-xs font-semibold text-slate-800 truncate">
                    {Array.isArray(lead.vehicleTypes) ? lead.vehicleTypes.join(', ') : (lead.vehicleTypes || <span className="text-slate-400 italic font-normal">Not recorded</span>)}
                  </div>
                </div>
              </div>
              {lead.vehicleTypes && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(String(lead.vehicleTypes), 'Vehicle Types')}
                  title="Copy Vehicle Types"
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                >
                  {copiedField === 'Vehicle Types' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              )}
            </div>

            {/* 10. Address (Spans 2 cols) */}
            <div className="sm:col-span-2 flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <MapPin size={13} />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] uppercase font-bold text-slate-400 font-mono">10. Physical Address</div>
                  <div className="text-xs font-medium text-slate-800 truncate">
                    {lead.address || <span className="text-slate-400 italic font-normal">Not recorded</span>}
                  </div>
                </div>
              </div>
              {lead.address && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(lead.address, 'Address')}
                  title="Copy Address"
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                >
                  {copiedField === 'Address' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              )}
            </div>

            {/* 11 & 12. Tire Sizes Used */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <Wrench size={13} />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] uppercase font-bold text-slate-400 font-mono">11-12. Tire Sizes</div>
                  <div className="text-xs font-mono font-bold text-red-700 truncate">
                    {Array.isArray(lead.tireSizes) ? lead.tireSizes.join(', ') : (lead.commonTireSizes || lead.tireSizes || <span className="text-slate-400 italic font-sans font-normal">Not recorded</span>)}
                  </div>
                </div>
              </div>
              {(lead.commonTireSizes || lead.tireSizes) && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(String(lead.commonTireSizes || lead.tireSizes), 'Tire Sizes')}
                  title="Copy Tire Sizes"
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                >
                  {copiedField === 'Tire Sizes' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </button>
              )}
            </div>
          </div>
        )}

        {/* CHRONOLOGICAL HIT HISTORY FEED */}
        {hitHistory.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
              <span className="font-bold text-slate-800 uppercase font-mono text-[10px] flex items-center gap-1.5">
                <History size={12} className="text-slate-500" />
                <span>Multi-Pass Calling Hit History ({hitHistory.length} Prior {hitHistory.length === 1 ? 'Hit' : 'Hits'})</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Max 4 Passes
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {hitHistory.map((hit: any, idx: number) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        Pass #{hit.pass || idx + 1}
                      </span>
                      <span className={`font-bold text-[10px] px-2 py-0.2 rounded-full border ${
                        hit.disposition === 'INTERESTED'
                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : hit.disposition === 'CALLBACK'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : hit.disposition === 'VOICEMAIL'
                          ? 'bg-slate-100 text-slate-800 border-slate-200'
                          : hit.disposition === 'WRONG_NUMBER' || hit.disposition === 'RNC'
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}>
                        {hit.disposition?.replace(/_/g, ' ') || 'DIALED'}
                      </span>
                      {hit.vaName && (
                        <span className="text-[10px] text-slate-500 font-medium">by {hit.vaName}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {hit.timestamp ? new Date(hit.timestamp).toLocaleString() : ''}
                    </span>
                  </div>
                  {hit.notes && (
                    <p className="text-slate-700 whitespace-pre-wrap text-[11px] font-sans pl-1">
                      {hit.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LEAD / FLEET SPREADSHEET NOTES */}
        {lead.notes ? (
          <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-amber-900 uppercase font-mono text-[10px]">
                {hitHistory.length > 0 ? 'Original Lead / Equipment Notes' : 'Lead & Equipment Notes (Imported)'}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(lead.notes, 'Lead Notes')}
                className="text-amber-800 hover:text-amber-950 p-1 rounded"
              >
                {copiedField === 'Lead Notes' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              </button>
            </div>
            <p className="text-amber-900 whitespace-pre-wrap">{lead.notes}</p>
          </div>
        ) : null}

        {/* Call Notes Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase font-mono mb-1">
            Hit Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document prospect feedback, fleet requirements, preferred tires..."
            rows={2}
            className="w-full px-3 py-2 text-xs rounded-2xl border border-slate-300 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-sans"
          />
        </div>

        {/* INLINE DISPOSITION SELECTION & ACTION */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-800 uppercase font-mono">
                1. Select Disposition
              </label>
              {selectedDisposition && (
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Selected: {selectedDisposition.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            {onOpenDispositionModal && (
              <button
                type="button"
                onClick={() => onOpenDispositionModal(lead)}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Calendar size={13} />
                <span>Full Form...</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {DISPOSITION_OPTIONS.map((opt) => {
              const isSelected = selectedDisposition === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSelectDisposition(opt.value)}
                  title={opt.title}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 border ${
                    isSelected
                      ? `${opt.activeClass} font-extrabold shadow-xs`
                      : `${opt.defaultClass} hover:border-slate-300`
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={13} className="stroke-[3]" />}
                </button>
              );
            })}
          </div>

          {/* Callback Date Picker Slide-Down (if CALLBACK selected) */}
          {showCallbackPicker && (
            <div className="p-4 bg-blue-50/90 border border-blue-200 rounded-2xl space-y-3 mt-1 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                  <Calendar size={14} /> Schedule Follow-up Callback
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowCallbackPicker(false);
                    if (selectedDisposition === 'CALLBACK') {
                      setSelectedDisposition(null);
                    }
                  }}
                  className="text-xs text-blue-700 hover:underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-blue-700 font-mono">Quick:</span>
                <button
                  type="button"
                  onClick={() => setQuickCallback(2)}
                  className="px-2 py-0.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-semibold transition cursor-pointer"
                >
                  +2 Hours
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCallback(24)}
                  className="px-2 py-0.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-semibold transition cursor-pointer"
                >
                  +24 Hours
                </button>
                <button
                  type="button"
                  onClick={() => setQuickCallback(48)}
                  className="px-2 py-0.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-semibold transition cursor-pointer"
                >
                  +2 Days
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-blue-800 mb-1">Date</label>
                  <input
                    type="date"
                    value={callbackDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCallbackDate(val);
                      if (val) {
                        const [y, m, d] = val.split('-').map(Number);
                        const dt = new Date(y, m - 1, d);
                        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        setCallbackDay(days[dt.getDay()]);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-blue-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-blue-800 mb-1">Day</label>
                  <input
                    type="text"
                    placeholder="e.g. Wednesday"
                    value={callbackDay}
                    onChange={(e) => setCallbackDay(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-blue-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-blue-800 mb-1">Time (24h)</label>
                  <input
                    type="time"
                    value={callbackTime}
                    onChange={(e) => setCallbackTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-blue-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-blue-800 mb-1">Timezone</label>
                  <select
                    value={callbackTimezone}
                    onChange={(e) => setCallbackTimezone(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-blue-200 bg-white"
                  >
                    <option value="America/Toronto">Eastern (Toronto/NY)</option>
                    <option value="America/Chicago">Central (Chicago/Winnipeg)</option>
                    <option value="America/Denver">Mountain (Denver/Calgary)</option>
                    <option value="America/Phoenix">Mountain (Arizona)</option>
                    <option value="America/Los_Angeles">Pacific (LA/Vancouver)</option>
                    <option value="America/Halifax">Atlantic (Halifax)</option>
                    <option value="Europe/London">UK (London GMT/BST)</option>
                  </select>
                </div>
              </div>

              {/* Dual Clock Preview Banner */}
              {dualClockPreview && (
                <div className="p-2.5 rounded-xl bg-blue-100/70 border border-blue-300/80 text-xs text-blue-950 space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-blue-700" /> Customer Local:
                    </span>
                    <span className="font-mono text-blue-900 font-bold">{dualClockPreview.customerLabel}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span>🇵🇰 Pakistan Shift (PKT):</span>
                    <span className="font-mono font-semibold text-slate-900">{dualClockPreview.pktLabel}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Primary Action Button: Set Disposition */}
          <div className="pt-1">
            <button
              type="button"
              disabled={isSubmitting || !selectedDisposition}
              onClick={handleCommitDisposition}
              className={`w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-98 ${
                selectedDisposition
                  ? 'bg-blue-600 hover:bg-blue-500 text-white ring-4 ring-blue-500/20 shadow-blue-500/10'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <Check size={16} />
              <span>
                {selectedDisposition
                  ? `Set Disposition (${selectedDisposition.replace(/_/g, ' ')})`
                  : 'Select a Disposition Above & Click to Set'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
