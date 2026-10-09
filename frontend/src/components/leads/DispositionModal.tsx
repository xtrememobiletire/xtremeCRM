import { useState, useEffect, type FormEvent } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';

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
  const [dispositionReason, setDispositionReason] = useState('NOT_INTERESTED');

  useEffect(() => {
    if (lead) {
      setSelectedDisposition('INTERESTED');
      setDispositionNotes('');
      setCallbackDate('');
      setCallbackDay('');
      setCallbackTime('');
      setDispositionReason('NOT_INTERESTED');
    }
  }, [lead]);

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
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
            <div className="font-bold text-blue-900">Schedule Follow-up Callback</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold text-blue-800 mb-1">Date</label>
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
                <label className="block font-semibold text-blue-800 mb-1">Day</label>
                <input
                  type="text"
                  readOnly
                  value={callbackDay}
                  placeholder="e.g. Wed"
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-blue-200 bg-blue-100/50"
                />
              </div>
              <div>
                <label className="block font-semibold text-blue-800 mb-1">Time</label>
                <input
                  type="text"
                  value={callbackTime}
                  placeholder="11:00 AM"
                  onChange={(e) => setCallbackTime(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-blue-200 bg-white"
                />
              </div>
            </div>
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
