import { useState } from 'react';
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
  Calendar 
} from 'lucide-react';
import { toast } from 'sonner';

interface VaFocusCardProps {
  lead: any;
  onDisposition: (params: {
    id: string;
    disposition: string;
    notes?: string;
    callbackDate?: string;
    callbackDay?: string;
    callbackTime?: string;
    disqualificationReason?: string;
  }) => void;
  isSubmitting: boolean;
  onRefreshQueue: () => void;
}

export default function VaFocusCard({
  lead,
  onDisposition,
  isSubmitting,
  onRefreshQueue,
}: VaFocusCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [showCallbackPicker, setShowCallbackPicker] = useState(false);
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackDay, setCallbackDay] = useState('');
  const [callbackTime, setCallbackTime] = useState('');

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
        <button
          type="button"
          onClick={onRefreshQueue}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Check for Leads Now</span>
        </button>
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

  const handleQuickDisposition = (disp: string) => {
    if (disp === 'CALLBACK') {
      setShowCallbackPicker(true);
      return;
    }

    onDisposition({
      id: lead.id,
      disposition: disp,
      notes: notes.trim() || undefined,
    });
    setNotes('');
  };

  const handleSaveCallback = () => {
    if (!callbackDate) {
      toast.error('Please pick a callback date');
      return;
    }
    onDisposition({
      id: lead.id,
      disposition: 'CALLBACK',
      notes: notes.trim() || undefined,
      callbackDate,
      callbackDay: callbackDay || undefined,
      callbackTime: callbackTime || undefined,
    });
    setShowCallbackPicker(false);
    setNotes('');
  };

  const attempts = Number(lead.callAttemptsCount || 0);

  return (
    <div className="max-w-2xl mx-auto bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
      {/* CARD HEADER */}
      <div className="bg-slate-900 text-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-mono text-[10px] font-bold uppercase tracking-wider border border-red-500/30">
                1-Lead Focus Mode
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                attempts >= 2 
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                Attempt {attempts + 1} of 3
              </span>
              {lead.numberOfUnits && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/30">
                  {lead.numberOfUnits} Units
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <h2 className="text-lg sm:text-xl font-bold truncate text-white">
                {lead.companyName}
              </h2>
              <button
                type="button"
                onClick={() => copyToClipboard(lead.companyName, 'Company Name')}
                title="Copy Company Name"
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                {copiedField === 'Company Name' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Click to Call Big Button */}
          <a
            href={`tel:${lead.phone}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition shrink-0 active:scale-95"
          >
            <PhoneCall size={16} />
            <span className="hidden sm:inline">Dial Prospect</span>
          </a>
        </div>
      </div>

      {/* DISCRETE DETAIL FIELDS WITH INDIVIDUAL COPY BUTTONS */}
      <div className="p-4 sm:p-6 space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Phone */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Phone size={14} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Primary Phone</div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono truncate">{lead.phone}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={`tel:${lead.phone}`}
                title="Dial Phone"
                className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-700 transition"
              >
                <PhoneCall size={14} />
              </a>
              <button
                type="button"
                onClick={() => copyToClipboard(lead.phone, 'Phone')}
                title="Copy Phone"
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                {copiedField === 'Phone' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Contact Person */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <User size={14} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Contact Person</div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {lead.contactPerson || 'Fleet Manager'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(lead.contactPerson || 'Fleet Manager', 'Contact Person')}
              title="Copy Contact Person"
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              {copiedField === 'Contact Person' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
          </div>

          {/* Alt Phone (if present) */}
          {lead.altPhone && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <Phone size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Alternative Phone</div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-800 font-mono truncate">{lead.altPhone}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(lead.altPhone, 'Alternative Phone')}
                title="Copy Alt Phone"
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                {copiedField === 'Alternative Phone' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          )}

          {/* Email (if present) */}
          {lead.email && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Mail size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Official Email</div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{lead.email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(lead.email, 'Email')}
                title="Copy Email"
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                {copiedField === 'Email' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          )}

          {/* Address */}
          {lead.address && (
            <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <MapPin size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Company Address</div>
                  <div className="text-xs sm:text-sm font-medium text-slate-800 truncate">{lead.address}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(lead.address, 'Address')}
                title="Copy Address"
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                {copiedField === 'Address' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          )}

          {/* Website (if present) */}
          {lead.website && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <Globe size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Website</div>
                  <a
                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-teal-700 hover:underline truncate block"
                  >
                    {lead.website}
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(lead.website, 'Website')}
                title="Copy Website"
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                {copiedField === 'Website' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          )}

          {/* Number of Units */}
          {lead.numberOfUnits && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Truck size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Fleet Size (NOU)</div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono truncate">{lead.numberOfUnits} commercial units</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(String(lead.numberOfUnits), 'Fleet Units')}
                title="Copy Fleet Units"
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                {copiedField === 'Fleet Units' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          )}
        </div>

        {/* Existing Notes (if present) */}
        {lead.notes && (
          <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-amber-900 uppercase font-mono text-[10px]">Previous Call Notes</span>
              <button
                type="button"
                onClick={() => copyToClipboard(lead.notes, 'Previous Notes')}
                className="text-amber-800 hover:text-amber-950 p-1 rounded"
              >
                {copiedField === 'Previous Notes' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              </button>
            </div>
            <p className="text-amber-900 whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}

        {/* Call Notes Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase font-mono mb-1">
            Call Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document prospect feedback, fleet requirements, preferred tires..."
            rows={2}
            className="w-full px-3 py-2 text-xs rounded-2xl border border-slate-300 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-sans"
          />
        </div>

        {/* INLINE DISPOSITION BUTTONS (NO CONVERTED BUTTON) */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-800 uppercase font-mono mb-2">
            Select Call Disposition (Advances to Next Lead Immediately)
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Interested */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickDisposition('INTERESTED')}
              className="py-2.5 px-3 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs flex flex-col items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <span>🔥 Interested</span>
              <span className="text-[10px] text-purple-600 font-normal">To Dispatcher</span>
            </button>

            {/* Callback */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickDisposition('CALLBACK')}
              className="py-2.5 px-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold text-xs flex flex-col items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <span>📅 Callback</span>
              <span className="text-[10px] text-blue-600 font-normal">Schedule Date</span>
            </button>

            {/* Voicemail */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickDisposition('VOICEMAIL')}
              className="py-2.5 px-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold text-xs flex flex-col items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <span>🎙️ Voicemail</span>
              <span className="text-[10px] text-slate-500 font-normal">Retry later</span>
            </button>

            {/* No Answer */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickDisposition('NO_ANSWER')}
              className="py-2.5 px-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs flex flex-col items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <span>📞 No Answer</span>
              <span className="text-[10px] text-amber-600 font-normal">Attempt +1</span>
            </button>

            {/* RNC - Ring No Contact (1-Strike Kill) */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickDisposition('RNC')}
              title="Ring No Contact — Kills lead immediately on 1st strike (Never dialed again)"
              className="py-2.5 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 font-bold text-xs flex flex-col items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <span>🚫 RNC (Dead)</span>
              <span className="text-[10px] text-rose-600 font-bold">1-Strike Kill</span>
            </button>

            {/* Not Interested */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickDisposition('NOT_INTERESTED')}
              className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs flex flex-col items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <span>❌ Not Interested</span>
              <span className="text-[10px] text-slate-500 font-normal">Disqualify</span>
            </button>

            {/* Wrong Number */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickDisposition('WRONG_NUMBER')}
              className="py-2.5 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs flex flex-col items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <span>⚠️ Wrong Number</span>
              <span className="text-[10px] text-rose-600 font-normal">Disqualify</span>
            </button>
          </div>
        </div>

        {/* Callback Date Picker Slide-Down */}
        {showCallbackPicker && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-3 mt-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                <Calendar size={14} /> Schedule Follow-up Callback
              </span>
              <button
                type="button"
                onClick={() => setShowCallbackPicker(false)}
                className="text-xs text-blue-700 hover:underline"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                <label className="block text-[11px] font-semibold text-blue-800 mb-1">Time</label>
                <input
                  type="text"
                  placeholder="e.g. 2:00 PM EST"
                  value={callbackTime}
                  onChange={(e) => setCallbackTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-blue-200 bg-white"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSaveCallback}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
            >
              Confirm & Save Callback
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
