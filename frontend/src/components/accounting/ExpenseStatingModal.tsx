import { useState, useEffect, useRef } from 'react';
import { Check, Upload } from 'lucide-react';
import Modal from '../ui/Modal';
import { useCreateExpense } from '../../hooks/useAccounting';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { accountingService, type JobReconciliationRecord } from '../../services/accountingService';
import { toast } from 'sonner';

interface ExpenseStatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  job?: JobReconciliationRecord | null;
  completedJobs?: JobReconciliationRecord[];
}

export default function ExpenseStatingModal({
  isOpen,
  onClose,
  job,
  completedJobs = [],
}: ExpenseStatingModalProps) {
  const createExpenseMutation = useCreateExpense();

  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [materialCost, setMaterialCost] = useState<string>('');
  const [otherExpense, setOtherExpense] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field focus refs for keyboard navigation
  const materialInputRef = useRef<HTMLInputElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLInputElement>(null);

  // Determine active job
  const activeJob = job || completedJobs.find((j) => j.id === selectedJobId) || null;

  // Authentic currency symbol from the job's country
  const jobCurrencySymbol = activeJob?.currencySymbol || 
    (activeJob?.countryCode === 'UK' ? '£' : activeJob?.countryCode === 'CA' ? 'CA$' : '$');
  const jobCountryFlag = activeJob?.countryCode === 'UK' ? '🇬🇧' : activeJob?.countryCode === 'US' ? '🇺🇸' : '🇨🇦';

  useEffect(() => {
    if (job) {
      setSelectedJobId(job.id);
      setMaterialCost(job.materialCostCents ? (job.materialCostCents / 100).toFixed(2) : '');
      setOtherExpense(job.otherExpenseCents ? (job.otherExpenseCents / 100).toFixed(2) : '');
      setNotes(job.expenseNotes || '');
    } else if (completedJobs.length > 0 && !selectedJobId) {
      const first = completedJobs[0];
      setSelectedJobId(first.id);
      setMaterialCost(first.materialCostCents ? (first.materialCostCents / 100).toFixed(2) : '');
      setOtherExpense(first.otherExpenseCents ? (first.otherExpenseCents / 100).toFixed(2) : '');
      setNotes(first.expenseNotes || '');
    }
  }, [job, isOpen, completedJobs]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => materialInputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Live computations
  const revenueCents = activeJob?.revenueCents || 0;
  const tcCents = Math.round((parseFloat(materialCost) || 0) * 100);
  const dcCents = activeJob?.repairerFeeCents || 0; // Technician labor payout auto-pulled from dispatch
  const otherCents = Math.round((parseFloat(otherExpense) || 0) * 100);
  const totalCostCents = tcCents + dcCents + otherCents;
  const netProfitCents = revenueCents - totalCostCents;
  const marginPercent = revenueCents > 0 ? (netProfitCents / revenueCents) * 100 : 0;

  // Keyboard navigation: Alt+ArrowDown, Alt+ArrowUp, Alt+Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      if (document.activeElement === materialInputRef.current) {
        otherInputRef.current?.focus();
      } else if (document.activeElement === otherInputRef.current) {
        notesInputRef.current?.focus();
      }
    } else if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      if (document.activeElement === notesInputRef.current) {
        otherInputRef.current?.focus();
      } else if (document.activeElement === otherInputRef.current) {
        materialInputRef.current?.focus();
      }
    } else if (e.altKey && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetJobId = activeJob?.id || selectedJobId;

    if (!targetJobId) {
      toast.error('Please select a completed job ticket');
      return;
    }

    try {
      setIsSubmitting(true);
      await createExpenseMutation.mutateAsync({
        jobId: targetJobId,
        materialCostCents: tcCents,
        repairerFeeCents: dcCents,
        otherExpenseCents: otherCents,
        expenseNotes: notes.trim() || undefined,
      });

      if (receiptFile) {
        await accountingService.uploadReceipt(targetJobId, receiptFile);
      }

      toast.success(`COGS expenses saved for ${activeJob?.jobNumber || 'Job'}`);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record job expenses');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Job Expenses & COGS"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-5">
        {/* Job Selector if not preselected */}
        {!job && completedJobs.length > 0 && (
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Select Completed Job Ticket *
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => {
                setSelectedJobId(e.target.value);
                const found = completedJobs.find((j) => j.id === e.target.value);
                if (found) {
                  setMaterialCost(found.materialCostCents ? (found.materialCostCents / 100).toFixed(2) : '');
                  setOtherExpense(found.otherExpenseCents ? (found.otherExpenseCents / 100).toFixed(2) : '');
                  setNotes(found.expenseNotes || '');
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              required
            >
              {completedJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.countryCode === 'UK' ? '🇬🇧' : j.countryCode === 'US' ? '🇺🇸' : '🇨🇦'} {j.jobNumber} — {j.customerName} ({formatCurrency(centsToDollars(j.revenueCents), j.currencySymbol || '$')})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Selected Job Header Summary Card */}
        {activeJob && (
          <div className="bg-slate-900 text-white rounded-2xl p-4.5 border border-slate-800 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{jobCountryFlag}</span>
                <div>
                  <span className="font-mono font-bold text-sm text-emerald-400">
                    {activeJob.jobNumber}
                  </span>
                  <p className="text-xs font-semibold text-slate-200 mt-0.5">{activeJob.customerName}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Billed Revenue
                </span>
                <span className="text-base font-black font-mono text-emerald-400">
                  {formatCurrency(centsToDollars(activeJob.revenueCents), jobCurrencySymbol)}
                </span>
              </div>
            </div>

            {activeJob.vehicle && (
              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                Vehicle: {activeJob.vehicle.year} {activeJob.vehicle.make} {activeJob.vehicle.model} • Tire: {activeJob.vehicle.tireSize || 'Standard'}
              </p>
            )}
          </div>
        )}

        {/* Sequential Field 1: Material / Tire Purchase Cost */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
              1. Material & Tire Purchase Cost ({jobCurrencySymbol}) *
            </label>
            <span className="text-[10px] text-slate-400">Alt+↓ to next</span>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
              {jobCurrencySymbol}
            </span>
            <input
              ref={materialInputRef}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={materialCost}
              onChange={(e) => setMaterialCost(e.target.value)}
              className="w-full pl-8 pr-4 py-3 text-base font-bold font-mono text-slate-900 bg-white rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition shadow-2xs"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Wholesale tire purchase cost or plug/patch repair kit unit cost.
          </p>
        </div>

        {/* Sequential Field 2: Other Miscellaneous Direct Expenses */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
              2. Other Direct Job Expenses ({jobCurrencySymbol})
            </label>
            <span className="text-[10px] text-slate-400">Alt+↓ to notes</span>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
              {jobCurrencySymbol}
            </span>
            <input
              ref={otherInputRef}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={otherExpense}
              onChange={(e) => setOtherExpense(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 text-base font-bold font-mono text-slate-900 bg-white rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition shadow-2xs"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Disposal fees, valve stems, roadside towing assist, or specialized hardware.
          </p>
        </div>

        {/* Locked Field: Technician Labor Compensation (Auto-pulled) */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Technician Labor Payout (Locked from Dispatch)
            </span>
            <span className="text-xs font-semibold text-slate-700">
              Recorded Driver Compensation
            </span>
          </div>
          <span className="font-mono font-bold text-sm text-slate-900">
            {formatCurrency(centsToDollars(dcCents), jobCurrencySymbol)}
          </span>
        </div>

        {/* Field 3: Audit Note */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
            Audit Notes
          </label>
          <input
            ref={notesInputRef}
            type="text"
            placeholder="e.g. Michelin wholesale invoice #8841 via local distributor"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
          />
        </div>

        {/* Optional Receipt Attachment */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
            Wholesale Receipt Attachment (Optional)
          </label>
          <div className="flex items-center gap-2">
            <label className="flex-1 border border-dashed border-slate-300 rounded-xl p-3 flex items-center justify-center gap-2 text-xs text-slate-500 hover:border-emerald-500 hover:text-slate-700 transition cursor-pointer bg-slate-50/50">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>{receiptFile ? receiptFile.name : 'Choose receipt image / PDF'}</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
            </label>
            {receiptFile && (
              <button
                type="button"
                onClick={() => setReceiptFile(null)}
                className="text-xs text-rose-600 hover:underline px-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Real-Time Live P&L and Margin Summary Card */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Billed Job Revenue:</span>
            <span className="font-mono font-bold text-slate-900">
              {formatCurrency(centsToDollars(revenueCents), jobCurrencySymbol)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Total Direct COGS (Material + Labor + Misc):</span>
            <span className="font-mono font-bold text-rose-600">
              -{formatCurrency(centsToDollars(totalCostCents), jobCurrencySymbol)}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-slate-900 block">Projected Gross Profit</span>
              <span className={`text-[11px] font-bold ${marginPercent >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                Gross Margin: {marginPercent.toFixed(1)}%
              </span>
            </div>
            <span className={`text-lg font-black font-mono ${netProfitCents >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(centsToDollars(netProfitCents), jobCurrencySymbol)}
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-400">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px]">Alt+Enter</kbd> to save
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save COGS'}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
