import { useState } from 'react';
import { Truck, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { useTenant } from '../../context/TenantContext';
import type { FleetItem } from '../../services/fleetService';

interface FleetTableProps {
  fleets: FleetItem[];
  onSelectFleet?: (fleet: FleetItem) => void;
}

export default function FleetTable({ fleets, onSelectFleet }: FleetTableProps) {
  const { currencySymbol } = useTenant();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!fleets || fleets.length === 0) return null;

  const handleCopyInvite = (f: FleetItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const inviteText = `🏢 Xtreme Mobile Tire — Fleet Manager Portal
🔗 Portal: ${window.location.origin}/login
📧 Login Email: ${f.email || '—'}
🏷️ Fleet Code: ${f.fleetCode || f.id}`;

    navigator.clipboard.writeText(inviteText);
    setCopiedId(f.id);
    toast.success(`Copied portal link for ${f.companyName || f.name}`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="table-container">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className="table-th">Fleet ID</th>
            <th className="table-th">Company Name</th>
            <th className="table-th">Portal Login</th>
            <th className="table-th">Primary Contact</th>
            <th className="table-th">Payment Terms</th>
            <th className="table-th">Enrolled Vehicles</th>
            <th className="table-th text-right">Credit Limit</th>
            <th className="table-th text-right">Outstanding</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {fleets.map((f) => (
            <tr
              key={f.id}
              onClick={() => onSelectFleet?.(f)}
              className="hover:bg-slate-50/70 transition-colors cursor-pointer"
            >
              <td className="table-td">
                <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200">
                  {f.fleetCode || (f.id ? `XMT-${f.id.slice(0, 4).toUpperCase()}` : '—')}
                </span>
              </td>
              <td className="table-td">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <Truck size={15} className="text-red-600 shrink-0" />
                  <span>{f.companyName || f.name}</span>
                </div>
              </td>
              <td className="table-td" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between gap-1.5">
                  <div>
                    {f.email ? (
                      <span className="text-xs text-slate-800 font-semibold block">
                        {f.email}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs italic">No login email</span>
                    )}
                    {f.poaEmail && (
                      <span className="text-[10px] text-slate-500 block truncate" title={`Billing: ${f.poaEmail}`}>
                        Billing: {f.poaEmail}
                      </span>
                    )}
                  </div>
                  {f.email && (
                    <button
                      type="button"
                      onClick={(e) => handleCopyInvite(f, e)}
                      title="Copy portal URL & login info"
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                    >
                      {copiedId === f.id ? (
                        <Check size={13} className="text-emerald-600" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  )}
                </div>
              </td>
              <td className="table-td">
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  {f.fleetManager ? (
                    <>
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                        FM
                      </span>
                      <span>{f.fleetManager}</span>
                    </>
                  ) : (
                    <span>{f.contactName || f.contactPerson || 'Corporate'}</span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-slate-500">{f.phone || '—'}</div>
              </td>
              <td className="table-td">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  {f.paymentTerms || 'NET_30'}
                </span>
              </td>
              <td className="table-td">
                <div className="text-xs text-slate-600 font-medium">
                  {f.vehicles?.length || 0} fleet rigs
                </div>
              </td>
              <td className="table-td text-right font-mono text-xs text-slate-700">
                {f.creditLimitCents ? formatCurrency(centsToDollars(f.creditLimitCents), currencySymbol) : 'Unlimited'}
              </td>
              <td className="table-td text-right font-mono font-bold text-red-600 text-xs sm:text-sm">
                {formatCurrency(centsToDollars(f.outstandingBalanceCents || 0), currencySymbol)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
