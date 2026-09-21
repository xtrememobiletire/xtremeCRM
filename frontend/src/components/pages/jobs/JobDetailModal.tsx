import { useState } from 'react';
import { Phone, Car, MapPin, Calculator } from 'lucide-react';
import Modal from '../../ui/Modal';
import StatusBadge from '../../ui/StatusBadge';
import { formatCurrency, centsToDollars } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import { useTenant } from '../../../context/TenantContext';
import { useUpdateJobStatus } from '../../../hooks/useJobs';
import { JOB_STATUSES } from '../../../constants/statuses';
import { accountingService } from '../../../services/accountingService';
import { toast } from 'sonner';

interface JobDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}

export default function JobDetailModal({ isOpen, onClose, job }: JobDetailModalProps) {
  const { country, currencySymbol } = useTenant();
  const updateStatusMutation = useUpdateJobStatus();
  const [updating, setUpdating] = useState(false);

  // Accountant expense stating local state
  const itPlatformFeeCents = country === 'CA' ? 150 : 100;
  const [materialCost, setMaterialCost] = useState<string>(
    job?.materialCostCents ? (job.materialCostCents / 100).toFixed(2) : ''
  );
  const [repairerFee, setRepairerFee] = useState<string>(
    job?.repairerFeeCents ? (job.repairerFeeCents / 100).toFixed(2) : ''
  );
  const [otherExpense, setOtherExpense] = useState<string>(
    job?.otherExpenseCents ? (job.otherExpenseCents / 100).toFixed(2) : ''
  );
  const [expenseNotes, setExpenseNotes] = useState<string>(job?.expenseNotes || '');
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  // Derived financial metrics (Rule 2.3 & 2.5)
  const matCents = Math.round((parseFloat(materialCost) || 0) * 100);
  const repCents = Math.round((parseFloat(repairerFee) || 0) * 100);
  const othCents = Math.round((parseFloat(otherExpense) || 0) * 100);
  const totalJobExpenseCents = matCents + repCents + othCents;
  const netProfitCents = (job?.totalAmount || 0) - totalJobExpenseCents;
  const [status, setStatus] = useState<string>(job?.status || 'PENDING');
  const totalNetAfterItbCents = netProfitCents - itPlatformFeeCents;

  if (!job) return null;

  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdating(true);
      await updateStatusMutation.mutateAsync({ id: job.id, status: newStatus });
      toast.success(`Job status updated to ${newStatus}`);
      setStatus(newStatus);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveExpenses = async () => {
    try {
      await accountingService.stateJobExpenses({
        jobId: job.id,
        materialCostCents: matCents,
        repairerFeeCents: repCents,
        otherExpenseCents: othCents,
        expenseNotes,
      });
      setShowExpenseForm(false);
      toast.success('Accountant expenses stated and ledger derived successfully');
    } catch {
      toast.error('Failed to state job expenses');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Job Details: #${job.jobNumber}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <StatusBadge status={status} />
            <StatusBadge status={job.urgency} />
          </div>
          <div className="text-xs text-slate-400">Created: {formatDate(job.createdAt)}</div>
        </div>

        {/* Quick Status Advancement */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Update Workflow Status
          </label>
          <div className="flex flex-wrap gap-1.5">
            {JOB_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                disabled={updating || status === st}
                onClick={() => handleStatusChange(st)}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold border transition ${
                  status === st
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-50'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Overview: Customer & Vehicle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-1.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Customer</h4>
            <div className="text-sm font-bold text-slate-900">{job.customer?.name || 'Walk-in'}</div>
            <div className="text-xs font-mono text-slate-600 flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{job.customer?.phone}</span>
            </div>
            {job.customer?.email && (
              <div className="text-xs text-slate-500 truncate">{job.customer?.email}</div>
            )}
          </div>

          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-1.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Vehicle & Location</h4>
            <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-slate-400" />
              <span>{job.vehicle ? `${job.vehicle.year || ''} ${job.vehicle.make} ${job.vehicle.model}`.trim() : 'N/A'}</span>
            </div>
            {job.vehicle?.tireSize && (
              <div className="text-xs font-mono text-slate-600">
                Tire Size: <strong className="text-red-700">{job.vehicle.tireSize}</strong>
              </div>
            )}
            {job.locationAddress && (
              <div className="text-xs text-slate-500 flex items-start gap-1 pt-1">
                <MapPin className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                <span className="truncate">{job.locationAddress}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line items table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wider">
            Job Line Items & Services
          </div>
          <div className="divide-y divide-slate-100 p-2">
            {job.lineItems && job.lineItems.length > 0 ? (
              job.lineItems.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center py-2 px-2 text-xs">
                  <div className="text-slate-800 font-medium">{item.serviceName || item.description}</div>
                  <div className="font-mono font-semibold text-slate-900">
                    {formatCurrency(centsToDollars(item.price || 0), currencySymbol)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 py-2 text-center">Standard mobile roadside call fee</div>
            )}
          </div>
          <div className="bg-slate-50/80 px-3.5 py-2.5 border-t border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 uppercase">Total Billed to Customer</span>
            <span className="text-base font-mono font-black text-slate-900">
              {formatCurrency(centsToDollars(job.totalAmount), currencySymbol)}
            </span>
          </div>
        </div>

        {/* Rule 2.3 & 2.5: Accountant Job Expense Stating & Profitability Audit */}
        <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Accountant Expense Stating (COGS)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowExpenseForm(!showExpenseForm)}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline"
            >
              {showExpenseForm ? 'Close Editor' : 'State / Edit Expenses'}
            </button>
          </div>

          {showExpenseForm && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[10px] text-slate-400">Material / Tire Wholesale ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={materialCost}
                  onChange={(e) => setMaterialCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Repairer / Tech Fee ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={repairerFee}
                  onChange={(e) => setRepairerFee(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Other Expense / Towing ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={otherExpense}
                  onChange={(e) => setOtherExpense(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 text-xs font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="Expense audit notes / supplier invoice ref..."
                  className="w-full bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 text-xs"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSaveExpenses}
                  className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded"
                >
                  Save Expenses
                </button>
              </div>
            </div>
          )}

          {/* Derived Read-Only Ledger Line */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-center">
            <div>
              <div className="text-[10px] text-slate-400">Job Expenses</div>
              <div className="text-xs font-mono font-bold text-rose-400">
                {formatCurrency(centsToDollars(totalJobExpenseCents), currencySymbol)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Net Profit</div>
              <div className={`text-xs font-mono font-bold ${netProfitCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(centsToDollars(netProfitCents), currencySymbol)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">IT Platform Fee</div>
              <div className="text-xs font-mono font-bold text-slate-300">
                {formatCurrency(centsToDollars(itPlatformFeeCents), currencySymbol)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Net After IT_B</div>
              <div className={`text-xs font-mono font-bold ${totalNetAfterItbCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(centsToDollars(totalNetAfterItbCents), currencySymbol)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
