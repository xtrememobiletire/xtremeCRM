import { useState } from 'react';
import { toast } from 'sonner';
import { 
  RotateCcw, 
AlertTriangle, 
  Loader2, 
Users,
  Clock,
  PhoneOff
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { leadService } from '../../services/leadService';

interface ReviveBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: any;
  onSuccess?: () => void;
}

export default function ReviveBatchModal({
  isOpen,
  onClose,
  batch,
  onSuccess,
}: ReviveBatchModalProps) {
  const queryClient = useQueryClient();
  const [includeSoftDisqualified, setIncludeSoftDisqualified] = useState(true);
  const [includeUnworked, setIncludeUnworked] = useState(true);
  const [includeOverdueCallbacks, setIncludeOverdueCallbacks] = useState(false);
  const [includeWrongNumbers, setIncludeWrongNumbers] = useState(false);
  const [forceRevive, setForceRevive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !batch) return null;

  const currentPass = Number(batch.currentPass || 1);
  const maxPasses = Number(batch.maxPasses || 4);
  const nextPass = currentPass + 1;
  const isMaxReached = currentPass >= maxPasses;

  const handleRevive = async () => {
    if (isMaxReached && !forceRevive) {
      toast.error('Batch has reached maximum pass limit. Check the Admin Override box to force revival.');
      return;
    }

    if (!includeSoftDisqualified && !includeUnworked && !includeOverdueCallbacks && !includeWrongNumbers) {
      toast.error('Please select at least one lead category to revive.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await leadService.reviveBatch(batch.id, {
        includeSoftDisqualified,
        includeUnworked,
        includeOverdueCallbacks,
        includeWrongNumbers,
        forceRevive,
      });

      toast.success(
        `Batch "${batch.batchName}" revived to Pass #${res?.currentPass || nextPass}! ${res?.revivedCount || 0} leads recycled into queue.`
      );

      await queryClient.invalidateQueries({ queryKey: ['management-batches'] });
      await queryClient.invalidateQueries({ queryKey: ['available-batches-va'] });
      await queryClient.invalidateQueries({ queryKey: ['agent-queue'] });
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      await queryClient.invalidateQueries({ queryKey: ['lead-batches'] });
      await queryClient.invalidateQueries({ queryKey: ['batches'] });
      await queryClient.invalidateQueries({ queryKey: ['lead-stats'] });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to revive batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header - Clean light palette, NO dark banners */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Revive Campaign Batch
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {batch.batchName} • Advance to Pass #{nextPass} of {maxPasses}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto">
          {/* Max Pass Limit Notice */}
          {isMaxReached && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Maximum Standard Passes Reached ({currentPass}/{maxPasses})</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  This campaign has already completed all {maxPasses} outreach passes. To reactivate leads for another pass, an Admin or General Manager override is required.
                </p>
                <label className="flex items-center gap-2 mt-2 pt-2 border-t border-amber-200/80 cursor-pointer text-xs font-bold text-amber-950">
                  <input
                    type="checkbox"
                    checked={forceRevive}
                    onChange={(e) => setForceRevive(e.target.checked)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Admin / GM Override: Force Pass #{nextPass} Extension</span>
                </label>
              </div>
            </div>
          )}

          {/* Pass Telemetry Strip */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Current Stage</span>
              <span className="font-bold text-slate-800 font-mono">Pass #{currentPass} of {maxPasses}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Recycling Target</span>
              <span className="font-bold text-blue-600 font-mono">Pass #{nextPass}</span>
            </div>
          </div>

          {/* Category Checkboxes */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 block text-xs">
              Select Lead Categories to Reset into Queue:
            </label>

            {/* 1. Soft Disqualified */}
            <label className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer ${
              includeSoftDisqualified 
                ? 'bg-blue-50/60 border-blue-300 text-blue-950' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}>
              <input
                type="checkbox"
                checked={includeSoftDisqualified}
                onChange={(e) => setIncludeSoftDisqualified(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <PhoneOff size={13} className="text-blue-600" />
                  <span>Soft Disqualified Leads (Unresponsive, No Answer, Voicemail)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Recycles leads that did not connect on prior passes. Respects 1-hit-per-pass limit.
                </p>
              </div>
            </label>

            {/* 2. Unworked Leads */}
            <label className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer ${
              includeUnworked 
                ? 'bg-blue-50/60 border-blue-300 text-blue-950' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}>
              <input
                type="checkbox"
                checked={includeUnworked}
                onChange={(e) => setIncludeUnworked(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <Users size={13} className="text-blue-600" />
                  <span>Unworked / Uncalled Leads</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ensures all fresh, untouched leads remain queued with priority.
                </p>
              </div>
            </label>

            {/* 3. Overdue Callbacks */}
            <label className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer ${
              includeOverdueCallbacks 
                ? 'bg-blue-50/60 border-blue-300 text-blue-950' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}>
              <input
                type="checkbox"
                checked={includeOverdueCallbacks}
                onChange={(e) => setIncludeOverdueCallbacks(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <Clock size={13} className="text-blue-600" />
                  <span>Overdue Callbacks</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Re-opens callbacks that lapsed past their scheduled date without agent connection.
                </p>
              </div>
            </label>

            {/* 4. Wrong Numbers */}
            <label className={`flex items-start gap-3 p-3 rounded-2xl border transition cursor-pointer ${
              includeWrongNumbers 
                ? 'bg-rose-50/60 border-rose-300 text-rose-950' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}>
              <input
                type="checkbox"
                checked={includeWrongNumbers}
                onChange={(e) => setIncludeWrongNumbers(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <div className="flex-1">
                <div className="font-bold text-xs flex items-center gap-1.5 text-rose-900">
                  <AlertTriangle size={13} className="text-rose-600" />
                  <span>Wrong Numbers (Re-verification Pass)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Optional: Re-queues wrong-number leads to test alternative phones or company numbers.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting || (isMaxReached && !forceRevive)}
            onClick={handleRevive}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Recycling Leads...</span>
              </>
            ) : (
              <>
                <RotateCcw size={13} />
                <span>Revive for Pass #{nextPass}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
