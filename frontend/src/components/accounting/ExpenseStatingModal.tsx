import { useState, useEffect } from 'react';
import { TrendingUp, Check, Paperclip, Upload, FileCheck } from 'lucide-react';
import Modal from '../ui/Modal';
import { useCreateExpense } from '../../hooks/useAccounting';
import { useTenant } from '../../context/TenantContext';
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
  const { currencySymbol, country } = useTenant();
  const createExpenseMutation = useCreateExpense();

  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [materialCost, setMaterialCost] = useState<string>('');
  const [repairerFee, setRepairerFee] = useState<string>('');
  const [otherExpense, setOtherExpense] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Multer File Upload State (FR-6.5)
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [materialReceiptFile, setMaterialReceiptFile] = useState<File | null>(null);
  const [uploadingReceipts, setUploadingReceipts] = useState(false);

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
      setUploadingReceipts(true);
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
      if (materialReceiptFile) {
        await accountingService.uploadMaterialReceipt(targetJobId, materialReceiptFile);
      }

      toast.success(`Expenses and audit receipts saved for ${activeJob?.jobNumber || 'Job'}`);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to state job expenses or upload receipts');
    } finally {
      setUploadingReceipts(false);
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

        {/* FR-6.5: Accountant Proof Receipt Uploads (Multer) */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            Audit Proof & Receipt Documentation (FR-6.5)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                Customer Payment Receipt
              </span>
              <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-red-300 transition text-xs shadow-2xs">
                <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate text-slate-600 font-medium">
                  {receiptFile ? receiptFile.name : 'Select payment receipt'}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
              </label>
              {(activeJob as any)?.receiptUrl && !receiptFile && (
                <a
                  href={`http://localhost:3000${(activeJob as any).receiptUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-1 mt-1 font-semibold"
                >
                  <FileCheck className="w-3 h-3 text-emerald-600" />
                  <span>View Uploaded Customer Receipt</span>
                </a>
              )}
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                Wholesale Parts / Tire Receipt
              </span>
              <label className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-red-300 transition text-xs shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate text-slate-600 font-medium">
                  {materialReceiptFile ? materialReceiptFile.name : 'Select supplier invoice'}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setMaterialReceiptFile(e.target.files?.[0] || null)}
                />
              </label>
              {(activeJob as any)?.materialReceiptUrl && !materialReceiptFile && (
                <a
                  href={`http://localhost:3000${(activeJob as any).materialReceiptUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-1 mt-1 font-semibold"
                >
                  <FileCheck className="w-3 h-3 text-emerald-600" />
                  <span>View Uploaded Supplier Receipt</span>
                </a>
              )}
            </div>
          </div>
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
            disabled={createExpenseMutation.isPending || uploadingReceipts || !activeJob}
            className="btn-primary px-4 py-1.5 text-xs inline-flex items-center gap-1.5"
          >
            <Check size={13} />
            <span>{uploadingReceipts ? 'Uploading Receipts...' : createExpenseMutation.isPending ? 'Saving Ledger...' : 'Save Job Expenses'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
