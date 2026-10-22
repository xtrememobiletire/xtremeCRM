import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { useCreateInvoice, useFleetBillingSummary } from '../../hooks/useInvoices';
import { useFleets } from '../../hooks/useFleets';
import { useCustomers } from '../../hooks/useCustomers';
import type { InvoiceType } from '../../services/invoiceService';
import { useTenant } from '../../context/TenantContext';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: InvoiceType;
}

/**
 * Render manual invoice creation with account selection, editable items, tax,
 * discount, and deposit preview when open. defaultType initializes the selected type.
 */
export default function CreateInvoiceModal({
  isOpen,
  onClose,
  defaultType = 'FLEET',
}: CreateInvoiceModalProps) {
  const { country, currencySymbol } = useTenant();
  const createMutation = useCreateInvoice();

  const [invoiceType, setInvoiceType] = useState<InvoiceType>(defaultType);
  const [selectedFleetId, setSelectedFleetId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [isTaxExempt, setIsTaxExempt] = useState(false);
  const [taxRatePercent, setTaxRatePercent] = useState<number>(
    country === 'CA' ? 13 : country === 'UK' ? 20 : 8.875
  );
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [depositInput, setDepositInput] = useState<string>('0');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<Array<{ itemDetails: string; unitPrice: string; quantity: number }>>([
    { itemDetails: '', unitPrice: '', quantity: 1 },
  ]);

  const { data: fleetsData } = useFleets();
  const { data: customersData } = useCustomers();
  const { data: fleetBillingData } = useFleetBillingSummary(
    invoiceType === 'FLEET' && selectedFleetId ? selectedFleetId : null
  );

  if (!isOpen) return null;

  const fleets = fleetsData?.data || [];
  const customers = customersData?.data || [];

  const isMemberType = invoiceType === 'MEMBER';
  const availableCustomers = customers.filter((c: any) =>
    isMemberType ? c.customerType === 'MEMBERSHIP' : c.customerType !== 'MEMBERSHIP'
  );

  /** Append a blank invoice item with quantity one. */
  const handleAddItem = () => {
    setItems([...items, { itemDetails: '', unitPrice: '', quantity: 1 }]);
  };

  /** Remove an item by zero-based index, keeping at least one item. */
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  /** Update a field of the item at a zero-based index; unitPrice is in major currency units. */
  const handleItemChange = (index: number, field: string, val: any) => {
    const copy = [...items];
    copy[index] = { ...copy[index], [field]: val };
    setItems(copy);
  };

  const subtotalCents = items.reduce((sum, it) => {
    const p = parseFloat(it.unitPrice) || 0;
    return sum + Math.round(p * 100) * (it.quantity || 1);
  }, 0);

  const discountCents = Math.round((parseFloat(discountInput) || 0) * 100);
  const depositCents = Math.round((parseFloat(depositInput) || 0) * 100);
  const taxableBaseCents = Math.max(0, subtotalCents - discountCents);
  const taxAmountCents = isTaxExempt ? 0 : Math.round((taxableBaseCents * taxRatePercent) / 100);
  const totalCents = Math.max(0, taxableBaseCents + taxAmountCents - depositCents);

  /**
   * Require the selected account and at least one described item with a positive price.
   * Submit qualifying items with prices and adjustments converted to cents;
   * close on success and show validation or request failures as error toasts.
   * @throws RangeError if dueDate cannot be converted to an ISO date.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (invoiceType === 'FLEET' && !selectedFleetId) {
      toast.error('Please select a fleet');
      return;
    }
    if ((invoiceType === 'CUSTOMER' || invoiceType === 'MEMBER') && !selectedCustomerId) {
      toast.error('Please select a customer/member');
      return;
    }

    const validItems = items
      .filter((i) => i.itemDetails.trim() && parseFloat(i.unitPrice) > 0)
      .map((i) => ({
        itemDetails: i.itemDetails.trim(),
        unitPriceCents: Math.round(parseFloat(i.unitPrice) * 100),
        quantity: Number(i.quantity) || 1,
      }));

    if (validItems.length === 0) {
      toast.error('Please provide at least one valid invoice item with price');
      return;
    }

    createMutation.mutate(
      {
        invoiceType,
        fleetId: invoiceType === 'FLEET' ? selectedFleetId : undefined,
        customerId: invoiceType === 'CUSTOMER' || invoiceType === 'MEMBER' ? selectedCustomerId : undefined,
        countryCode: (['CA', 'US', 'UK'].includes(country) ? country : 'CA') as 'CA' | 'US' | 'UK',
        dueDate: new Date(dueDate).toISOString(),
        jobIds: selectedJobIds.length > 0 ? selectedJobIds : undefined,
        items: validItems,
        taxRatePercent: isTaxExempt ? 0 : taxRatePercent,
        isTaxExempt,
        discountCents,
        depositCents,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success(`Invoice ${data.invoiceNumber} created successfully!`);
          onClose();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to create invoice');
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Create New Invoice</h3>
              <p className="text-xs text-slate-500">Manual billing & custom commercial statement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 text-xs flex-1">
          {/* Invoice Type Pill Bar */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">Invoice Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(['FLEET', 'MEMBER', 'CUSTOMER', 'CUSTOM'] as InvoiceType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setInvoiceType(t)}
                  className={`py-2 px-2.5 rounded-xl border font-semibold text-center transition-all ${
                    invoiceType === t
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t === 'FLEET' ? 'Fleet' : t === 'MEMBER' ? 'Member' : t === 'CUSTOMER' ? 'Customer' : 'Custom'}
                </button>
              ))}
            </div>
          </div>

          {/* Account Selector */}
          {invoiceType === 'FLEET' && (
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Select Fleet Account</label>
              <select
                required
                value={selectedFleetId}
                onChange={(e) => setSelectedFleetId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
              >
                <option value="">-- Choose Fleet --</option>
                {fleets.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.companyName} ({f.paymentTerms || 'NET_30'})
                  </option>
                ))}
              </select>

              {/* Unbilled Fleet Work Orders Picker */}
              {fleetBillingData?.unbilledJobs && fleetBillingData.unbilledJobs.length > 0 && (
                <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">
                      Attach Unbilled Fleet Jobs ({fleetBillingData.unbilledJobs.length} available)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedJobIds.length === fleetBillingData.unbilledJobs!.length) {
                          setSelectedJobIds([]);
                        } else {
                          const allIds = fleetBillingData.unbilledJobs!.map((j: any) => j.id);
                          setSelectedJobIds(allIds);
                          const newItems = fleetBillingData.unbilledJobs!.map((j: any) => ({
                            itemDetails: `Work Order ${j.jobCode} - ${j.serviceAddress || 'Fleet Service'}`,
                            unitPrice: String((j.totalCents || 0) / 100),
                            quantity: 1,
                          }));
                          if (newItems.length > 0) setItems(newItems);
                        }
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      {selectedJobIds.length === fleetBillingData.unbilledJobs.length ? 'Deselect All' : 'Select & Auto-fill All'}
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {fleetBillingData.unbilledJobs.map((j: any) => {
                      const isChecked = selectedJobIds.includes(j.id);
                      return (
                        <label
                          key={j.id}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                            isChecked ? 'bg-blue-50/80 border-blue-300 text-blue-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedJobIds((prev) => [...prev, j.id]);
                                  setItems((prev) => {
                                    const filtered = prev.filter((it) => it.itemDetails.trim() !== '');
                                    return [
                                      ...filtered,
                                      {
                                        itemDetails: `Work Order ${j.jobCode} - ${j.serviceAddress || 'Fleet Service'}`,
                                        unitPrice: String((j.totalCents || 0) / 100),
                                        quantity: 1,
                                      },
                                    ];
                                  });
                                } else {
                                  setSelectedJobIds((prev) => prev.filter((id) => id !== j.id));
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-mono font-bold text-slate-900">{j.jobCode}</span>
                            <span className="text-slate-500 truncate max-w-[200px]">{j.serviceAddress || 'Fleet Service'}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900">
                            {currencySymbol}{((j.totalCents || 0) / 100).toFixed(2)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {(invoiceType === 'CUSTOMER' || invoiceType === 'MEMBER') && (
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">
                {isMemberType ? 'Select Registered Member' : 'Select Retail Customer'}
              </label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
              >
                <option value="">
                  {isMemberType ? '-- Choose Member Account --' : '-- Choose Retail Customer --'}
                </option>
                {availableCustomers.length === 0 ? (
                  <option value="" disabled>
                    {isMemberType ? 'No registered membership customers found' : 'No retail customers found'}
                  </option>
                ) : (
                  availableCustomers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || c.name} {c.phone ? `(${c.phone})` : ''} {isMemberType && c.membershipTier ? `• Tier: ${c.membershipTier}` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Line Items Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-slate-700">Line Items</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    required
                    placeholder="Description (e.g. 295/75R22.5 Steer Tire replacement)"
                    value={it.itemDetails}
                    onChange={(e) => handleItemChange(idx, 'itemDetails', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="Price ($)"
                    value={it.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                    className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    min="1"
                    value={it.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-14 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tax, Due Date & Adjustments Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-700">Tax Settings</label>
                <button
                  type="button"
                  onClick={() => setIsTaxExempt(!isTaxExempt)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                    isTaxExempt
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {isTaxExempt ? 'Tax Exempt (0%)' : 'Taxable'}
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
                    className="w-24 px-3 py-1.5 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-slate-500">% Tax</span>
                </div>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Discount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Credit Advance Deposit ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={depositInput}
                onChange={(e) => setDepositInput(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">Notes & Purchase Order</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Approved by Fleet Supervisor Dave"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Totals Preview Card */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1 font-mono text-[11px]">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span>{currencySymbol}{(subtotalCents / 100).toFixed(2)}</span>
            </div>
            {discountCents > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Discount:</span>
                <span>-{currencySymbol}{(discountCents / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>Tax ({isTaxExempt ? '0%' : `${taxRatePercent}%`}):</span>
              <span>{currencySymbol}{(taxAmountCents / 100).toFixed(2)}</span>
            </div>
            {depositCents > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Deposit Credited:</span>
                <span>-{currencySymbol}{(depositCents / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-900 font-bold text-xs pt-1 border-t border-slate-200">
              <span>Total Balance Due:</span>
              <span>{currencySymbol}{(totalCents / 100).toFixed(2)}</span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Creating...
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
