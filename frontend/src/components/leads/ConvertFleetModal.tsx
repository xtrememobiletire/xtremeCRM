import { useState, useEffect } from 'react';
import { Truck } from 'lucide-react';
import Modal from '../ui/Modal';

interface ConvertFleetModalProps {
  lead: any | null;
  isOpen: boolean;
  onClose: () => void;
  onConvert: (params: { id: string; customFleetCode?: string; discountPercent?: number }) => void;
  isPending: boolean;
}

export default function ConvertFleetModal({
  lead,
  isOpen,
  onClose,
  onConvert,
  isPending,
}: ConvertFleetModalProps) {
  const [customFleetCode, setCustomFleetCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  useEffect(() => {
    if (lead) {
      setCustomFleetCode(`XMT-${Math.floor(1000 + Math.random() * 9000)}`);
      setDiscountPercent(0);
    }
  }, [lead]);

  if (!lead) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Convert Lead to Active Fleet — ${lead.companyName}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-950 text-sm">{lead.companyName}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900 font-bold text-[10px]">
              100% Data Preservation
            </span>
          </div>
          <p className="text-emerald-800 text-[11px]">
            Converting prospect to commercial fleet account. All 10 attributes from database sample are preserved in the Fleet record.
          </p>
        </div>

        {/* Captured Lead Attributes Grid */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            Preserved Prospect Details
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <div className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Company</div>
              <div className="font-bold text-slate-800 truncate">{lead.companyName}</div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <div className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Fleet Manager</div>
              <div className="font-bold text-slate-800 truncate">{lead.fleetManager || lead.contactPerson}</div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <div className="text-[10px] text-slate-400 font-semibold uppercase font-mono">CEO / Owner</div>
              <div className="font-bold text-slate-800 truncate">{lead.ceoOwnerName || '—'}</div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <div className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Phone</div>
              <div className="font-bold text-slate-800 font-mono truncate">{lead.phone}</div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <div className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Alt Phone</div>
              <div className="font-bold text-slate-800 font-mono truncate">{lead.altPhone || '—'}</div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <div className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Units (NOU)</div>
              <div className="font-bold text-slate-800">{lead.numberOfUnits ? `${lead.numberOfUnits} Units` : '—'}</div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <div className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Official Email</div>
              <div className="font-bold text-slate-800 truncate">{lead.email || '—'}</div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <div className="text-[10px] text-slate-400 font-semibold uppercase font-mono">POA Email</div>
              <div className="font-bold text-slate-800 truncate">{lead.poaEmail || '—'}</div>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200/80">
              <div className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Website</div>
              <div className="font-bold text-slate-800 truncate">{lead.website || '—'}</div>
            </div>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200/80">
            <div className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Depot Address</div>
            <div className="font-medium text-slate-700 truncate">{lead.address || '—'}</div>
          </div>
        </div>

        {/* Editable Contract Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block font-bold text-slate-700 mb-1 text-xs">Custom Fleet Code *</label>
            <input
              type="text"
              value={customFleetCode}
              onChange={(e) => setCustomFleetCode(e.target.value)}
              placeholder="e.g. XMT-4501"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1 text-xs">Contract Discount %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              onConvert({
                id: lead.id,
                customFleetCode: customFleetCode || undefined,
                discountPercent,
              });
            }}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer shadow-xs disabled:opacity-50 transition"
          >
            <Truck size={14} />
            <span>{isPending ? 'Converting...' : 'Execute Fleet Conversion'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
