import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../../ui/Modal';
import { toast } from 'sonner';

interface JobDispositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  callerPhone: string;
  onDispositionRecorded: (disposition: string, reason: string) => void;
}

const DISPOSITIONS = [
  { code: 'RNC', label: 'Relevant (Not converted) - RNC', desc: 'Customer declined pricing or chose competitor' },
  { code: 'WN', label: 'Business (Wrong Number) - WN', desc: 'Misdial or unsolicited telemarketer' },
  { code: 'IR', label: 'Irrelevant (Another service) - IR', desc: 'Outside service area or requesting unrelated service' },
  { code: 'CANCELLED', label: 'Appointment Cancelled By CX', desc: 'Customer found alternate assistance or no longer needed' },
];

export default function JobDispositionModal({
  isOpen,
  onClose,
  callerPhone,
  onDispositionRecorded,
}: JobDispositionModalProps) {
  const [selectedDisposition, setSelectedDisposition] = useState<string>('RNC');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisposition) {
      toast.error('You must select a call outcome disposition per operational rules.');
      return;
    }

    onDispositionRecorded(selectedDisposition, reason);
    toast.info(`Call outcome logged as ${selectedDisposition}`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        toast.error('A mandatory call disposition is required before closing this intake.');
      }}
      title="Mandatory Call Outcome Disposition"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Every incoming phone inquiry must be dispositioned to ensure zero lost leads.
          </span>
        </div>

        {callerPhone && (
          <div className="text-xs text-slate-500">
            Caller ID: <strong className="font-mono text-slate-800">{callerPhone}</strong>
          </div>
        )}

        <div className="space-y-2">
          {DISPOSITIONS.map((d) => (
            <label
              key={d.code}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                selectedDisposition === d.code
                  ? 'border-red-600 bg-red-50/60'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="disposition"
                value={d.code}
                checked={selectedDisposition === d.code}
                onChange={(e) => setSelectedDisposition(e.target.value)}
                className="mt-0.5 text-red-600 focus:ring-red-500"
              />
              <div className="text-xs">
                <div className="font-bold text-slate-900">
                  {d.code} — {d.label}
                </div>
                <div className="text-slate-500 text-[11px]">{d.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Reason / Agent Notes</label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Quoted $160 CAD, customer wanted $100..."
            className="textarea-base mt-1"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="submit"
            className="btn-primary w-full py-2 text-xs"
          >
            <span>Log Disposition & Complete Call</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
