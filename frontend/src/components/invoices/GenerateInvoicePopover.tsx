import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { FileText, Loader2, CheckCircle2, ShieldCheck, Plus, Trash2, Tag, Percent } from 'lucide-react';
import { useGenerateJobInvoice } from '../../hooks/useInvoices';

interface GenerateInvoicePopoverProps {
  job: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (invoice: any) => void;
}

interface EditableLineItem {
  id: string;
  itemDetails: string;
  unitPriceDollars: number;
  quantity: number;
}

export default function GenerateInvoicePopover({
  job,
  isOpen,
  onClose,
  onSuccess,
}: GenerateInvoicePopoverProps) {
  const isFleet = Boolean(job.fleetId || job.fleet);
  const defaultTaxRate = job.countryCode === 'CA' ? 13 : job.countryCode === 'UK' ? 20 : 8.875;
  const upfrontCents = job.upfrontAmountCents || 0;
  const currencySymbol = job.currency === 'GBP' ? '£' : job.countryCode === 'CA' ? 'CA$' : '$';

  // Initialize line items from job service items
  const initialItems: EditableLineItem[] = useMemo(() => {
    if (job.serviceItems && Array.isArray(job.serviceItems) && job.serviceItems.length > 0) {
      return job.serviceItems.map((si: any, idx: number) => ({
        id: `item-${idx}-${si.id || idx}`,
        itemDetails: si.serviceName || 'Service Item',
        unitPriceDollars: (si.unitPriceCents || 0) / 100,
        quantity: si.quantity || 1,
      }));
    }
    const totalDollars = (job.subtotalCents || job.totalCents || 12000) / 100;
    return [
      {
        id: `item-0-${job.id || 'service'}`,
        itemDetails: `Roadside Assistance: ${job.serviceAddress || 'On-Site Service'}`,
        unitPriceDollars: totalDollars,
        quantity: 1,
      },
    ];
  }, [job]);

  const [items, setItems] = useState<EditableLineItem[]>(initialItems);
  const [isTaxExempt, setIsTaxExempt] = useState(false);
  const [taxRatePercent, setTaxRatePercent] = useState<number>(defaultTaxRate);
  const [discountDollars, setDiscountDollars] = useState<number>(0);
  const [creditDeposit, setCreditDeposit] = useState(upfrontCents > 0);
  const [paymentTerms, setPaymentTerms] = useState<'DUE_ON_RECEIPT' | 'NET_7' | 'NET_14' | 'NET_30'>(
    isFleet ? 'NET_7' : 'DUE_ON_RECEIPT'
  );
  const [notes, setNotes] = useState('');

  const generateMutation = useGenerateJobInvoice();

  if (!isOpen) return null;

  // Real-time calculations
  const subtotalCents = Math.round(
    items.reduce((sum, it) => sum + Math.round((it.unitPriceDollars || 0) * 100) * (it.quantity || 1), 0)
  );
  const discountCents = Math.min(subtotalCents, Math.round((discountDollars || 0) * 100));
  const taxableBaseCents = Math.max(0, subtotalCents - discountCents);
  const calculatedTaxCents = isTaxExempt ? 0 : Math.round((taxableBaseCents * (taxRatePercent || 0)) / 100);
  const creditedCents = creditDeposit ? upfrontCents : 0;
  const netDueCents = Math.max(0, taxableBaseCents + calculatedTaxCents - creditedCents);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        itemDetails: '',
        unitPriceDollars: 0,
        quantity: 1,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.error('Invoice must have at least one line item');
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof EditableLineItem, val: any) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        return { ...it, [field]: val };
      })
    );
  };

  const handleGenerate = () => {
    // Validate line items
    for (const it of items) {
      if (!it.itemDetails.trim()) {
        toast.error('Please provide a description for all line items');
        return;
      }
      if (it.unitPriceDollars < 0) {
        toast.error('Item unit price cannot be negative');
        return;
      }
    }

    generateMutation.mutate(
      {
        jobId: job.id,
        options: {
          taxRatePercent: isTaxExempt ? 0 : taxRatePercent,
          isTaxExempt,
          creditDeposit,
          paymentTerms: isFleet ? paymentTerms : 'DUE_ON_RECEIPT',
          discountCents,
          notes: notes.trim() || undefined,
          lineItems: items.map((it) => ({
            itemDetails: it.itemDetails.trim(),
            unitPriceCents: Math.round((it.unitPriceDollars || 0) * 100),
            quantity: Math.max(1, Number(it.quantity) || 1),
          })),
        },
      },
      {
        onSuccess: (data) => {
          toast.success(`Invoice ${data.invoiceNumber} ready!`);
          onSuccess?.(data);
          onClose();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to generate invoice');
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isFleet ? 'Generate Fleet Invoice' : 'Generate Customer Invoice'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">{job.jobCode}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Target Info */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">Billed To</span>
              <span className="text-sm font-bold text-slate-900">
                {job.fleet?.companyName || job.customer?.fullName || 'Direct Customer'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">Account Type</span>
              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                isFleet ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700'
              }`}>
                {isFleet ? 'B2B Commercial Fleet' : 'Retail Motorist'}
              </span>
            </div>
          </div>

          {/* Line Items Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-800 text-xs">Line Items & Pricing</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2 py-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl flex items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={item.itemDetails}
                      onChange={(e) => handleUpdateItem(item.id, 'itemDetails', e.target.value)}
                      placeholder={`Item description #${index + 1}`}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 font-medium text-slate-900"
                    />
                  </div>

                  <div className="w-16 shrink-0">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      title="Quantity"
                      placeholder="Qty"
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-center font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <div className="w-24 shrink-0 relative">
                    <span className="absolute left-2 top-1.5 text-[11px] text-slate-400 font-mono">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPriceDollars}
                      onChange={(e) => handleUpdateItem(item.id, 'unitPriceDollars', parseFloat(e.target.value) || 0)}
                      title="Unit Price"
                      className="w-full pl-6 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-right font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors shrink-0 cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tax & Discount Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Tax Settings */}
            <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Percent size={12} className="text-slate-400" />
                  Tax Settings
                </span>
                <button
                  type="button"
                  onClick={() => setIsTaxExempt(!isTaxExempt)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                    isTaxExempt
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isTaxExempt ? 'Tax Exempt (0%)' : 'Apply Tax'}
                </button>
              </div>

              {!isTaxExempt && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={taxRatePercent}
                    onChange={(e) => setTaxRatePercent(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg font-mono text-xs text-right focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <span className="text-slate-500 text-[11px] font-medium">% Tax Rate</span>
                </div>
              )}
            </div>

            {/* Discount Control */}
            <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Tag size={12} className="text-slate-400" />
                Discount ({currencySymbol})
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={discountDollars}
                  onChange={(e) => setDiscountDollars(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-mono text-xs text-right focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          {/* Advance Deposit Credit */}
          {upfrontCents > 0 && (
            <label className="flex items-center gap-2.5 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={creditDeposit}
                onChange={(e) => setCreditDeposit(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <div className="flex-1">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Credit Advance Deposit ({currencySymbol}{(upfrontCents / 100).toFixed(2)})
                </div>
                <p className="text-[10px] text-emerald-700 mt-0.5">
                  Deducts collected booking advance from remaining invoice balance due.
                </p>
              </div>
            </label>
          )}

          {/* Payment Terms: Only shown if Fleet! */}
          {isFleet ? (
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Corporate Credit Terms</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'DUE_ON_RECEIPT', label: 'Due On Receipt' },
                  { id: 'NET_7', label: 'Net 7 Days' },
                  { id: 'NET_14', label: 'Net 14 Days' },
                  { id: 'NET_30', label: 'Net 30 Days' },
                ].map((term) => (
                  <button
                    key={term.id}
                    type="button"
                    onClick={() => setPaymentTerms(term.id as any)}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs text-left transition-all cursor-pointer ${
                      paymentTerms === term.id
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {term.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600">Settlement Terms:</span>
              <span className="text-[11px] font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                Due on Receipt (Immediate Settlement)
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Invoice Memo / Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Approved roadside service ticket"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 text-xs"
            />
          </div>

          {/* Live Financial Summary */}
          <div className="pt-2 border-t border-slate-200 space-y-1 font-mono text-[11px]">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span>{currencySymbol}{(subtotalCents / 100).toFixed(2)}</span>
            </div>
            {discountCents > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span>-{currencySymbol}{(discountCents / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>Tax ({isTaxExempt ? 'Exempt' : `${taxRatePercent}%`}):</span>
              <span>{currencySymbol}{(calculatedTaxCents / 100).toFixed(2)}</span>
            </div>
            {creditedCents > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Deposit Credited:</span>
                <span>-{currencySymbol}{(creditedCents / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-900 font-bold text-xs pt-1.5 border-t border-slate-200">
              <span>Balance Due:</span>
              <span className="text-sm font-black text-slate-900">{currencySymbol}{(netDueCents / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generateMutation.isPending || items.length === 0}
            className="px-5 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Create Invoice
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
