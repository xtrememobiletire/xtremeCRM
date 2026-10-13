import { useState } from 'react';
import { toast } from 'sonner';
import { CreditCard, Loader2, CheckCircle2 } from 'lucide-react';
import { useRecordPayment, useRecordFleetLumpSumPayment } from '../../hooks/useInvoices';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: any;
  fleet?: any;
  onSuccess?: () => void;
}

/**
 * Render payment entry when open; a fleet without an invoice selects lump-sum
 * allocation, otherwise the supplied invoice receives the payment.
 */
export default function RecordPaymentModal({
  isOpen,
  onClose,
  invoice,
  fleet,
  onSuccess,
}: RecordPaymentModalProps) {
  const isLumpSum = !!fleet && !invoice;

  const maxAmountCents = invoice
    ? (invoice.balanceDueCents > 0 ? invoice.balanceDueCents : invoice.totalCents)
    : 0;

  const [amountInput, setAmountInput] = useState<string>(
    invoice ? (maxAmountCents / 100).toFixed(2) : ''
  );
  const [paymentMethod, setPaymentMethod] = useState<'E_TRANSFER' | 'POS' | 'CASH' | 'MOTO' | 'STRIPE'>('E_TRANSFER');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');

  const recordPaymentMutation = useRecordPayment();
  const recordLumpSumMutation = useRecordFleetLumpSumPayment();

  if (!isOpen) return null;

  /**
   * Require a positive amount in major currency units and submit it as cents to
   * the invoice or fleet payment mutation. Notify and close on success;
   * validation and request failures are shown as error toasts.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNumber = parseFloat(amountInput);
    if (!amountNumber || amountNumber <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    const amountCents = Math.round(amountNumber * 100);

    if (isLumpSum) {
      recordLumpSumMutation.mutate(
        {
          fleetId: fleet.id,
          amountCents,
          paymentMethod,
          referenceId: referenceId.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        {
          onSuccess: (data) => {
            toast.success(data.message || 'Lump-sum payment recorded successfully!');
            onSuccess?.();
            onClose();
          },
          onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to record lump sum payment');
          },
        }
      );
    } else {
      recordPaymentMutation.mutate(
        {
          invoiceId: invoice.id,
          payload: {
            amountCents,
            paymentMethod,
            referenceId: referenceId.trim() || undefined,
            notes: notes.trim() || undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success(`Payment of $${amountNumber.toFixed(2)} recorded on ${invoice.invoiceNumber}`);
            onSuccess?.();
            onClose();
          },
          onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to record payment');
          },
        }
      );
    }
  };

  const isPending = recordPaymentMutation.isPending || recordLumpSumMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isLumpSum ? 'Record Fleet Lump-Sum Payment' : 'Record Invoice Payment'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {isLumpSum ? fleet.companyName : invoice?.invoiceNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4 text-xs">
            {/* Context Info */}
            {invoice && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 font-medium">Outstanding Balance:</span>
                  <div className="text-sm font-bold text-slate-900 font-mono">
                    ${((invoice.balanceDueCents > 0 ? invoice.balanceDueCents : invoice.totalCents) / 100).toFixed(2)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAmountInput((maxAmountCents / 100).toFixed(2))}
                  className="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Pay Full Balance
                </button>
              </div>
            )}

            {isLumpSum && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                <span className="text-slate-500 font-medium">FIFO Allocation:</span>
                <p className="text-[11px] text-slate-600 mt-1">
                  Payment will automatically be applied to oldest unpaid invoices for <strong>{fleet.companyName}</strong> until depleted.
                </p>
              </div>
            )}

            {/* Payment Amount */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Payment Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'E_TRANSFER', label: 'E-Transfer' },
                  { id: 'POS', label: 'POS Terminal' },
                  { id: 'CASH', label: 'Cash' },
                  { id: 'MOTO', label: 'Card (MOTO)' },
                  { id: 'STRIPE', label: 'Stripe Online' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-2 px-2.5 rounded-xl border font-semibold text-center transition-all ${
                      paymentMethod === m.id
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference ID */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Reference ID / Check # (Optional)</label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="e.g. Interac Ref #10924 or Check #4412"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Internal Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Audit notes or accountant memo"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Apply Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
