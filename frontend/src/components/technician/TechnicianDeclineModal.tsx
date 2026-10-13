import { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import Modal from '../ui/Modal';

interface TechnicianDeclineModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobCode: string;
  isSubmitting: boolean;
  onConfirmDecline: (reason: string) => void;
}

const DECLINE_REASONS = [
  { id: 'BUSY', label: 'Busy', desc: 'Currently tied up with an active job or break' },
  { id: 'OUT_OF_AREA', label: 'Out of Area (OA)', desc: 'Location is too far from current service radius' },
  { id: 'OTHER', label: 'Other', desc: 'Unable to take this dispatch at this time' },
];

export default function TechnicianDeclineModal({
  isOpen,
  onClose,
  jobCode,
  isSubmitting,
  onConfirmDecline,
}: TechnicianDeclineModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('BUSY');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmDecline(selectedReason);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title="Decline Dispatch Assignment"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200/90 rounded-xl text-amber-900 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Declining #{jobCode}</span>
            <p className="text-amber-800 text-[11px] mt-0.5">
              This job will be unassigned and immediately returned to the dispatch queue so another technician can be dispatched.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800">Select Reason</label>
          <div className="space-y-2">
            {DECLINE_REASONS.map((r) => {
              const isSelected = selectedReason === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedReason(r.id)}
                  className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">{r.label}</div>
                    <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {r.desc}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            Keep Assignment
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl transition cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {isSubmitting ? 'Declining...' : 'Decline Assignment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
