import { useState, useEffect } from 'react';
import { Camera, X, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { toast } from 'sonner';

interface TechnicianPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any | null;
  currencySymbol: string;
  isSubmitting: boolean;
  onComplete: (data: { paymentMethod: 'CASH' | 'POS' | 'E_TRANSFER'; amountCents: number; receiptFile: File | null }) => void;
}

export default function TechnicianPaymentModal({
  isOpen,
  onClose,
  job,
  currencySymbol,
  isSubmitting,
  onComplete,
}: TechnicianPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'POS' | 'E_TRANSFER'>('CASH');
  const [amountInput, setAmountInput] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const requiredAmount = job?.totalCents ? centsToDollars(job.totalCents) : 0;

  useEffect(() => {
    if (job) {
      setAmountInput(requiredAmount > 0 ? requiredAmount.toFixed(2) : '');
      setReceiptFile(null);
      setReceiptPreview(null);
      setValidationError(null);
      setPaymentMethod('CASH');
    }
  }, [job?.id, requiredAmount]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
      setValidationError(null);
    }
  };

  const handleClearFile = () => {
    setReceiptFile(null);
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
      setReceiptPreview(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountInput);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      const err = 'Please enter a valid payment amount greater than 0';
      setValidationError(err);
      toast.error(err);
      return;
    }

    if (requiredAmount > 0 && parsedAmount < requiredAmount) {
      const err = `Amount collected (${formatCurrency(parsedAmount, currencySymbol)}) cannot be less than invoice total (${formatCurrency(requiredAmount, currencySymbol)})`;
      setValidationError(err);
      toast.error(err);
      return;
    }

    if ((paymentMethod === 'POS' || paymentMethod === 'E_TRANSFER') && !receiptFile) {
      const label = paymentMethod === 'POS' ? 'POS terminal slip photo' : 'E-Transfer confirmation screenshot';
      const err = `Proof photo required: Please attach a ${label}`;
      setValidationError(err);
      toast.error(err);
      return;
    }

    const effectiveAmount = requiredAmount > 0 && parsedAmount > requiredAmount ? requiredAmount : parsedAmount;
    const cents = Math.round(effectiveAmount * 100);

    onComplete({
      paymentMethod,
      amountCents: cents,
      receiptFile,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title="Complete Job & Record Payment"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {validationError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Invoice Summary */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500">Invoice Amount</span>
            <div className="text-sm font-bold text-slate-900">
              {formatCurrency(requiredAmount, currencySymbol)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-500">Job Code</span>
            <div className="text-xs font-mono font-bold text-slate-800">
              #{job?.jobCode || job?.jobNumber}
            </div>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'CASH' as const, label: 'Cash' },
              { id: 'POS' as const, label: 'POS Terminal' },
              { id: 'E_TRANSFER' as const, label: 'E-Transfer' },
            ].map((m) => {
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Amount Collected ({currencySymbol})</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              {currencySymbol}
            </span>
            <input
              type="number"
              step="0.01"
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setValidationError(null);
              }}
              placeholder="0.00"
              className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Receipt Proof Photo for POS or E_TRANSFER */}
        {(paymentMethod === 'POS' || paymentMethod === 'E_TRANSFER') && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                {paymentMethod === 'POS' ? 'POS Terminal Slip Photo' : 'E-Transfer Confirmation Screenshot'}
                <span className="text-red-500 ml-1">*</span>
              </label>
            </div>

            {receiptPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950/5 p-1 flex items-center justify-center">
                <img src={receiptPreview} alt="Receipt preview" className="max-h-40 rounded-lg object-contain" />
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="absolute top-2 right-2 p-1 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition cursor-pointer"
                  title="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition bg-slate-50/50 hover:bg-slate-50">
                <Camera className="w-6 h-6 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">Take Photo or Upload Image</span>
                <span className="text-[10px] text-slate-400">PNG, JPG up to 10MB</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {isSubmitting ? 'Submitting...' : 'Mark Completed'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
