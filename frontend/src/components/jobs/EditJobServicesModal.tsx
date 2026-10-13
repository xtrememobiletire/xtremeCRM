import { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import Modal from '../ui/Modal';
import { SERVICES_CATALOG } from '../../constants/services';
import { formatCurrency, centsToDollars, dollarsToCents } from '../../utils/currency';
import { type SelectedServiceItem } from '../common/MultiServiceSelector';

interface EditJobServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol: string;
  initialServices: SelectedServiceItem[];
  onSave: (items: SelectedServiceItem[]) => Promise<void>;
  isSaving: boolean;
}

export default function EditJobServicesModal({
  isOpen,
  onClose,
  currencySymbol = '$',
  initialServices,
  onSave,
  isSaving,
}: EditJobServicesModalProps) {
  const [items, setItems] = useState<SelectedServiceItem[]>(initialServices || []);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');

  const handleAddService = (catalogId: string) => {
    if (!catalogId) return;
    const catItem = SERVICES_CATALOG.find((s) => s.id === catalogId);
    if (!catItem) return;

    const mappedCat: 'TIRE_SERVICE' | 'ROADSIDE_ASSISTANCE' | 'MAINTENANCE' =
      catItem.category === 'TIRE'
        ? 'TIRE_SERVICE'
        : catItem.category === 'MAINTENANCE'
        ? 'MAINTENANCE'
        : 'ROADSIDE_ASSISTANCE';

    const existingIndex = items.findIndex((i) => i.serviceId === catalogId);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          serviceId: catItem.id,
          serviceName: catItem.name,
          category: mappedCat,
          unitPriceCents: catItem.defaultPriceCents,
          quantity: 1,
        },
      ]);
    }
    setSelectedCatalogId('');
  };

  const handleUpdatePrice = (index: number, newPriceDollars: number) => {
    const updated = [...items];
    updated[index].unitPriceCents = dollarsToCents(Math.max(0, newPriceDollars));
    setItems(updated);
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const updated = [...items];
    updated[index].quantity = newQty;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Work Order Services"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Catalog Selector Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={selectedCatalogId}
              onChange={(e) => {
                setSelectedCatalogId(e.target.value);
                if (e.target.value) handleAddService(e.target.value);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            >
              <option value="">-- Add service from standard catalog --</option>
              {SERVICES_CATALOG.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({formatCurrency(centsToDollars(cat.defaultPriceCents), currencySymbol)})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={!selectedCatalogId}
            onClick={() => handleAddService(selectedCatalogId)}
            className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition disabled:opacity-40 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {/* Selected Services List */}
        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No services added. Select a service above to add to this work order.
            </div>
          ) : (
            items.map((item, idx) => {
              const lineTotal = item.unitPriceCents * item.quantity;
              return (
                <div key={idx} className="p-3 bg-white flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800 block truncate">{item.serviceName}</span>
                    <span className="text-[10px] text-slate-400 font-mono uppercase">{item.category.replace('_', ' ')}</span>
                  </div>

                  {/* Quantity adjustment */}
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(idx, item.quantity - 1)}
                      className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-2.5 py-1 font-mono font-bold text-xs text-slate-800 bg-slate-50">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(idx, item.quantity + 1)}
                      className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Unit price input */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] font-mono text-slate-400">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={centsToDollars(item.unitPriceCents)}
                      onChange={(e) => handleUpdatePrice(idx, parseFloat(e.target.value) || 0)}
                      className="w-18 px-1.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Line Total */}
                  <div className="text-right w-16 font-mono font-bold text-xs text-slate-900 shrink-0">
                    {formatCurrency(centsToDollars(lineTotal), currencySymbol)}
                  </div>

                  {/* Remove action */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Subtotal Summary */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
          <span className="font-bold text-slate-600 uppercase tracking-wide">Work Order Subtotal:</span>
          <span className="font-mono font-black text-sm text-slate-900">
            {formatCurrency(centsToDollars(subtotalCents), currencySymbol)}
          </span>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving || items.length === 0}
            onClick={() => onSave(items)}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Services'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
