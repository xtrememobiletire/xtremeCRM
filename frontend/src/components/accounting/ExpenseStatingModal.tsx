import { useState, useEffect } from 'react';
import { DollarSign, AlertCircle, TrendingUp, Check } from 'lucide-react';
import Modal from '../ui/Modal';
import { useCreateExpense } from '../../hooks/useAccounting';
import { useTenant } from '../../context/TenantContext';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import type { JobReconciliationRecord } from '../../services/accountingService';
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
  const { currencySymbol, country } = useTenant();
  const createExpenseMutation = useCreateExpense();

  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [materialCost, setMaterialCost] = useState<string>('');
  const [repairerFee, setRepairerFee] = useState<string>('');
  const [otherExpense, setOtherExpense] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Determine active job
  const activeJob = job || completedJobs.find((j) => j.id === selectedJobId) || null;

  useEffect(() => {
    if (job) {
      setSelectedJobId(job.id);
      setMaterialCost(job.materialCostCents ? (job.materialCostCents / 100).toFixed(2) : '');
      setRepairerFee(job.repairerFeeCents ? (job.repairerFeeCents / 100).toFixed(2) : '');
      setOtherExpense(job.otherExpenseCents ? (job.otherExpenseCents / 100).toFixed(2) : '');
      setNotes(job.expenseNotes || '');
    } else if (completedJobs.length > 0 && !selectedJobId) {
      const first = completedJobs[0];
      setSelectedJobId(first.id);
      setMaterialCost(first.materialCostCents ? (first.materialCostCents / 100).toFixed(2) : '');
      setRepairerFee(first.repairerFeeCents ? (first.repairerFeeCents / 100).toFixed(2) : '');
      setOtherExpense(first.otherExpenseCents ? (first.otherExpenseCents / 100).toFixed(2) : '');
      setNotes(first.expenseNotes || '');
    }
  }, [job, isOpen, completedJobs]);

  const handleJobSelectChange = (newJobId: string) => {
    setSelectedJobId(newJobId);
    const found = completedJobs.find((j) => j.id === newJobId);
    if (found) {
      setMaterialCost(found.materialCostCents ? (found.materialCostCents / 100).toFixed(2) : '');
      setRepairerFee(found.repairerFeeCents ? (found.repairerFeeCents / 100).toFixed(2) : '');
      setOtherExpense(found.otherExpenseCents ? (found.otherExpenseCents / 100).toFixed(2) : '');
      setNotes(found.expenseNotes || '');
    }
  };

  // Live computations
  const revenueCents = activeJob?.revenueCents || 0;
  const tcCents = Math.round((parseFloat(materialCost) || 0) * 100);
  const dcCents = Math.round((parseFloat(repairerFee) || 0) * 100);
  const otherCents = Math.round((parseFloat(otherExpense) || 0) * 100);
  const totalCostCents = tcCents + dcCents + otherCents;
  const netProfitCents = revenueCents - totalCostCents;
  const itFeeCents = activeJob?.itPlatformFeeCents || (country === 'CA' ? 150 : 100);
  const netAfterItCents = netProfitCents - itFeeCents;
  const marginPercent = revenueCents > 0 ? (netProfitCents / revenueCents) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetJobId = activeJob?.id || selectedJobId;

    if (!targetJobId) {
      toast.error('Please select a completed job ticket');
      return;
    }

    try {
      await createExpenseMutation.mutateAsync({
        jobId: targetJobId,
        materialCostCents: tcCents,
        repairerFeeCents: dcCents,
        otherExpenseCents: otherCents,
        expenseNotes: notes.trim() || undefined,
      });

      toast.success(`Expenses updated for ${activeJob?.jobNumber || 'Job'}`);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to state job expenses');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record / State Job Expense (COGS)"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Job Selector if not preselected */}
        {!job && completedJobs.length > 0 && (
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Select Completed Job Ticket *
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => handleJobSelectChange(e.target.value)}
              className="select-base font-mono text-xs w-full"
              required
            >
              {completedJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.jobNumber} — {j.customerName} ({formatCurrency(centsToDollars(j.revenueCents), currencySymbol)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Selected Job Header Summary */}
        {activeJob && (
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono font-black text-red-600 text-sm">{activeJob.jobNumber}</span>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{activeJob.customerName}</p>
                {activeJob.vehicle && (
                  <p className="text-[11px] text-slate-500">
                    {activeJob.vehicle.year} {activeJob.vehicle.make} {activeJob.vehicle.model} •{' '}
                    <span className="font-mono font-semibold">{activeJob.vehicle.licensePlate}</span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Gross Revenue</span>
                <span className="text-base font-mono font-black text-slate-900">
                  {formatCurrency(centsToDollars(revenueCents), currencySymbol)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block">
              Material Cost (TC) ({currencySymbol})
            </label>
            <p className="text-[10px] text-slate-400 mb-1">Wholesale tire, rim & parts</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={materialCost}
                onChange={(e) => setMaterialCost(e.target.value)}
                placeholder="0.00"
                className="input-base pl-7 font-mono font-bold text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block">
              Repairer Fee (DC) ({currencySymbol})
            </label>
            <p className="text-[10px] text-slate-400 mb-1">Technician labor payout</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={repairerFee}
                onChange={(e) => setRepairerFee(e.target.value)}
                placeholder="0.00"
                className="input-base pl-7 font-mono font-bold text-sm"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block">
            Other Expenses ({currencySymbol})
          </label>
          <p className="text-[10px] text-slate-400 mb-1">Incidentals (towing fee, tire disposal, tolls)</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
              {currencySymbol}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={otherExpense}
              onChange={(e) => setOtherExpense(e.target.value)}
              placeholder="0.00"
              className="input-base pl-7 font-mono font-bold text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Part Description & Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Michelin 235/65R16 replacement from wholesale distributor"
            className="input-base text-xs"
          />
        </div>

        {/* Live Calculation Preview */}
        <div className="bg-slate-900 text-white rounded-xl p-3.5 space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
            <TrendingUp size={12} className="text-emerald-400" />
            <span>Live Margin Calculation</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block">Total COGS</span>
              <span className="font-mono font-bold text-xs text-rose-400">
                {formatCurrency(centsToDollars(totalCostCents), currencySymbol)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Net Profit</span>
              <span
                className={`font-mono font-bold text-xs ${
                  netProfitCents >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(centsToDollars(netProfitCents), currencySymbol)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Gross Margin</span>
              <span
                className={`font-mono font-bold text-xs ${
                  marginPercent >= 50 ? 'text-emerald-400' : marginPercent >= 0 ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                {marginPercent.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 text-right pt-1 border-t border-slate-800/80">
            Net After Platform Royalty (IT_B):{' '}
            <span className="font-mono font-bold text-slate-200">
              {formatCurrency(centsToDollars(netAfterItCents), currencySymbol)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary px-3 py-1.5 text-xs">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createExpenseMutation.isPending || !activeJob}
            className="btn-primary px-4 py-1.5 text-xs inline-flex items-center gap-1.5"
          >
            <Check size={13} />
            <span>{createExpenseMutation.isPending ? 'Saving Ledger...' : 'Save Job Expenses'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
