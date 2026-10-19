import { useState, useEffect, useMemo, type FormEvent } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { Clock } from 'lucide-react';
import { 
  resolveLeadTimezone, 
  zonedWallTimeToUtc, 
  formatDualPktAndCustomerTime 
} from '../../utils/date';

interface DispositionModalProps {
  lead: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: {
    id: string;
    disposition: string;
    notes?: string;
    callbackData?: {
      callbackDate?: string;
      callbackDay?: string;
      callbackTime?: string;
      callbackTimezone?: string;
      disqualificationReason?: string;
    };
  }) => void;
  isPending: boolean;
}

export default function DispositionModal({
  lead,
  isOpen,
  onClose,
  onSubmit,
  isPending,
}: DispositionModalProps) {
  const { user } = useAuth();
  const canConvert = user?.role === 'ADMIN' || user?.role === 'GENERAL_MANAGER';
  const [selectedDisposition, setSelectedDisposition] = useState<string>('INTERESTED');
  const [dispositionNotes, setDispositionNotes] = useState('');
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackDay, setCallbackDay] = useState('');
  const [callbackTime, setCallbackTime] = useState('');
  const [callbackTimezone, setCallbackTimezone] = useState('America/Toronto');
  const [dispositionReason, setDispositionReason] = useState('NOT_INTERESTED');

  useEffect(() => {
    if (lead) {
      setSelectedDisposition('INTERESTED');
      setDispositionNotes('');
      setCallbackDate('');
      setCallbackDay('');
      setCallbackTime('');
      setCallbackTimezone(resolveLeadTimezone(lead));
      setDispositionReason('NOT_INTERESTED');
    }
  }, [lead]);

  const dualClockPreview = useMemo(() => {
    if (!callbackDate || !callbackTime) return null;
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
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    const hr = parts.find((p) => p.type === 'hour')?.value || '10';
    const min = parts.find((p) => p.type === 'minute')?.value || '00';
    if (y && m && d) {
      setCallbackDate(`${y}-${m}-${d}`);
      const dt = new Date(`${y}-${m}-${d}T00:00:00`);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      setCallbackDay(days[dt.getDay()]);
    }
    setCallbackTime(`${hr}:${min}`);
  };

  if (!lead) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedDisposition) return;

    onSubmit({
      id: lead.id,
      disposition: selectedDisposition,
      notes: dispositionNotes,
      callbackData: {
        callbackDate: callbackDate || undefined,
        callbackDay: callbackDay || undefined,
        callbackTime: callbackTime || undefined,
        callbackTimezone: callbackTimezone || undefined,
        disqualificationReason: ['NOT_INTERESTED', 'WRONG_NUMBER'].includes(selectedDisposition)
          ? dispositionReason
          : undefined,
      },
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log Call Outcome — ${lead.companyName}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="font-bold text-sm text-slate-900">{lead.companyName}</div>
          <div className="text-slate-600 mt-0.5">
            Contact: <span className="font-semibold">{lead.contactPerson}</span> •{' '}
            <span className="font-mono text-slate-800 font-bold">{lead.phone}</span>
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono">
            Call Outcome *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'INTERESTED', label: 'Interested / Qualified', color: 'border-purple-500 bg-purple-50 text-purple-800' },
              { value: 'CALLBACK', label: 'Callback Requested', color: 'border-blue-500 bg-blue-50 text-blue-800' },
              { value: 'RNC', label: 'RNC (Dead Line)', color: 'border-rose-600 bg-rose-50 text-rose-800' },
              { value: 'NO_ANSWER', label: 'No Answer / Ringing', color: 'border-amber-400 bg-amber-50 text-amber-800' },
              { value: 'VOICEMAIL', label: 'Left Voicemail', color: 'border-purple-400 bg-purple-50 text-purple-800' },
              { value: 'NOT_INTERESTED', label: 'Not Interested', color: 'border-slate-400 bg-slate-100 text-slate-700' },
              { value: 'WRONG_NUMBER', label: 'Wrong Number', color: 'border-rose-400 bg-rose-50 text-rose-700' },
              ...(canConvert ? [{ value: 'CONVERTED', label: 'Direct Fleet Deal', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' }] : []),
            ].map((disp) => (
              <button
                key={disp.value}
                type="button"
                onClick={() => setSelectedDisposition(disp.value)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                  selectedDisposition === disp.value
                    ? `${disp.color} ring-2 ring-red-500 ring-offset-1`
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {disp.label}
              </button>
            ))}
          </div>
        </div>

        {/* If Callback Requested */}
        {selectedDisposition === 'CALLBACK' && (
          <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl space-y-2.5">
            <div className="font-bold text-blue-900 text-xs">Schedule Follow-up Callback</div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-blue-700 font-mono">Quick:</span>
              <button
                type="button"
                onClick={() => setQuickCallback(2)}
                className="px-2 py-0.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-semibold transition"
              >
                +2 Hours
              </button>
              <button
                type="button"
                onClick={() => setQuickCallback(24)}
                className="px-2 py-0.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-semibold transition"
              >
                +24 Hours
              </button>
              <button
                type="button"
                onClick={() => setQuickCallback(48)}
                className="px-2 py-0.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-semibold transition"
              >
                +2 Days
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block font-semibold text-blue-800 mb-1 text-[11px]">Date</label>
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
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-blue-200 bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-blue-800 mb-1 text-[11px]">Day</label>
                <input
                  type="text"
                  readOnly
                  value={callbackDay}
                  placeholder="e.g. Wed"
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-blue-200 bg-blue-100/50"
                />
              </div>
              <div>
                <label className="block font-semibold text-blue-800 mb-1 text-[11px]">Time (24h)</label>
                <input
                  type="time"
                  value={callbackTime}
                  onChange={(e) => setCallbackTime(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-blue-200 bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-blue-800 mb-1 text-[11px]">Timezone</label>
                <select
                  value={callbackTimezone}
                  onChange={(e) => setCallbackTimezone(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-blue-200 bg-white"
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
              <div className="p-2 rounded-lg bg-blue-100/70 border border-blue-300/80 text-[11px] text-blue-950 space-y-0.5">
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1">
                    <Clock size={11} className="text-blue-700" /> Customer Local:
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

        {/* If Disqualified outcome */}
        {['NOT_INTERESTED', 'WRONG_NUMBER'].includes(selectedDisposition) && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
            <div className="font-bold text-rose-900">Disqualification Root Cause</div>
            <select
              value={dispositionReason}
              onChange={(e) => setDispositionReason(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-rose-200 bg-white"
            >
              <option value="NOT_INTERESTED">Not Interested</option>
              <option value="WRONG_NUMBER">Wrong Number / Inactive</option>
              <option value="OUT_OF_SERVICE_AREA">Out of Service Area</option>
              <option value="COMPETITOR_LOCKED">Locked into Competitor Contract</option>
              <option value="FLEET_TOO_SMALL">Fleet Too Small</option>
              <option value="OTHER">Other Reason</option>
            </select>
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Call Notes</label>
          <textarea
            rows={2}
            placeholder="Call notes & prospect feedback..."
            value={dispositionNotes}
            onChange={(e) => setDispositionNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedDisposition || isPending}
            className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50 transition"
          >
            {isPending ? 'Logging...' : 'Save Outcome'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
