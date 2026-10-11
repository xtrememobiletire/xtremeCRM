import { useState } from 'react';
import { Trash2, Wrench } from 'lucide-react';
import { SERVICES_CATALOG } from '../../constants/services';
import { formatCurrency, centsToDollars, dollarsToCents } from '../../utils/currency';

export interface SelectedServiceItem {
  serviceId: string;
  serviceName: string;
  category: 'TIRE_SERVICE' | 'ROADSIDE_ASSISTANCE' | 'MAINTENANCE';
  unitPriceCents: number;
  quantity: number;
}

export interface MultiServiceSelectorProps {
  items?: SelectedServiceItem[];
  selectedItems?: SelectedServiceItem[];
  onChange: (items: SelectedServiceItem[]) => void;
  countryCode?: string;
  currencySymbol?: string;
  taxRate?: number;
  isTaxIncluded: boolean;
  setIsTaxIncluded?: (val: boolean) => void;
  onToggleTaxIncluded?: (val: boolean) => void;
}

export default function MultiServiceSelector({
  items,
  selectedItems,
  onChange,
  countryCode: _countryCode,
  currencySymbol = '$',
  taxRate = 0.13,
  isTaxIncluded,
  setIsTaxIncluded,
  onToggleTaxIncluded,
}: MultiServiceSelectorProps) {
  const activeItems = selectedItems || items || [];
  const handleToggleTax = setIsTaxIncluded || onToggleTaxIncluded || (() => {});
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');

  const handleAddService = (catalogId: string) => {
    if (!catalogId) return;
    const catItem = SERVICES_CATALOG.find((s) => s.id === catalogId);
    if (!catItem) return;

    // Map catalog category
    const mappedCat: 'TIRE_SERVICE' | 'ROADSIDE_ASSISTANCE' | 'MAINTENANCE' =
      catItem.category === 'TIRE'
        ? 'TIRE_SERVICE'
        : catItem.category === 'MAINTENANCE'
        ? 'MAINTENANCE'
        : 'ROADSIDE_ASSISTANCE';

    const existingIndex = activeItems.findIndex((i) => i.serviceId === catalogId);
    if (existingIndex >= 0) {
      // Increment quantity if already added
      const updated = [...activeItems];
      updated[existingIndex].quantity += 1;
      onChange(updated);
    } else {
      // Add new item
      onChange([
        ...activeItems,
        {
          serviceId: catItem.id,
          serviceName: catItem.name,
          category: mappedCat,
          unitPriceCents: catItem.defaultPriceCents || 12000,
          quantity: 1,
        },
      ]);
    }
    setSelectedCatalogId('');
  };

  const handleUpdatePrice = (index: number, dollars: number) => {
    const updated = [...activeItems];
    updated[index].unitPriceCents = Math.max(0, dollarsToCents(dollars));
    onChange(updated);
  };

  const handleUpdateQuantity = (index: number, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const updated = [...activeItems];
    updated[index].quantity = qty;
    onChange(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = activeItems.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Financial calculations
  const subtotalCents = activeItems.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0
  );

  const taxCents = isTaxIncluded
    ? 0
    : Math.round(subtotalCents * taxRate);

  const totalCents = isTaxIncluded ? subtotalCents : subtotalCents + taxCents;

  return (
    <div className="space-y-3">
      {/* Selector Header & Add Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-red-600" />
          <span>Services & Breakdown Work Order <span className="text-red-500">*</span></span>
        </label>

        {/* Add Service Dropdown Picker */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCatalogId}
            onChange={(e) => {
              setSelectedCatalogId(e.target.value);
              handleAddService(e.target.value);
            }}
            className="text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer shadow-2xs"
          >
            <option value="">+ Add Service to Ticket...</option>
            {SERVICES_CATALOG.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({formatCurrency(centsToDollars(cat.defaultPriceCents), currencySymbol)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Service Line Items */}
      {activeItems.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center bg-slate-50/50">
          <p className="text-xs text-slate-500 font-medium">
            No services added yet. Select a service from the dropdown above to add it to the ticket.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeItems.map((item, idx) => {
            const lineSubtotal = item.unitPriceCents * item.quantity;
            return (
              <div
                key={`${item.serviceId}-${idx}`}
                className="p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left: Service Title & Badge */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {item.serviceName}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 uppercase">
                      {item.category.replace('_SERVICE', '').replace('_ASSISTANCE', '')}
                    </span>
                  </div>
                </div>

                {/* Right: Quantity Controls, Editable Unit Price & Line Total */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  {/* Quantity Counter */}
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 shadow-inner">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(idx, item.quantity - 1)}
                      className="px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                      title="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="px-2.5 py-0.5 text-xs font-bold font-mono text-slate-900 bg-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(idx, item.quantity + 1)}
                      className="px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                      title="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  {/* Unit Price (Editable) */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 font-mono">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={centsToDollars(item.unitPriceCents)}
                      onChange={(e) => handleUpdatePrice(idx, parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-500"
                      title="Editable unit price"
                    />
                  </div>

                  {/* Line Total */}
                  <div className="text-right w-18 font-mono font-bold text-xs text-slate-900">
                    {formatCurrency(centsToDollars(lineSubtotal), currencySymbol)}
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tax Setting & Live Summary Card */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Tax Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isTaxIncluded}
            onChange={(e) => handleToggleTax(e.target.checked)}
            className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer"
          />
          <span className="font-semibold text-slate-700">
            Quote includes tax / Tax-exempt (No added tax)
          </span>
        </label>

        {/* Live Financial Totals */}
        <div className="flex items-center gap-4 text-xs font-mono justify-end">
          <div>
            <span className="text-slate-500">Subtotal: </span>
            <span className="font-bold text-slate-800">
              {formatCurrency(centsToDollars(subtotalCents), currencySymbol)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Tax ({Math.round(taxRate * 100)}%): </span>
            <span className="font-bold text-slate-800">
              {isTaxIncluded ? '$0.00' : formatCurrency(centsToDollars(taxCents), currencySymbol)}
            </span>
          </div>
          <div className="pl-2 border-l border-slate-200">
            <span className="text-slate-500">Total: </span>
            <span className="font-black text-red-600 text-sm">
              {formatCurrency(centsToDollars(totalCents), currencySymbol)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
