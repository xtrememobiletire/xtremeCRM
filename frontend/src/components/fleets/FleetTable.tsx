import { useState } from 'react';
import { Truck, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';

interface Fleet {
  id: string;
  fleetCode?: string;
  name?: string;
  companyName: string;
  contactName?: string;
  contactPerson?: string;
  fleetManager?: string;
  phone?: string;
  email?: string;
  poaEmail?: string;
  password?: string;
  paymentTerms: string;
  creditLimitCents?: number;
  outstandingBalanceCents?: number;
  vehicles?: any[];
  jobs?: any[];
}

interface FleetTableProps {
  fleets: Fleet[];
  onSelectFleet?: (fleet: Fleet) => void;
}

export default function FleetTable({ fleets, onSelectFleet }: FleetTableProps) {
  const { currencySymbol } = useTenant();
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'GENERAL_MANAGER' || user?.role?.toUpperCase().includes('ADMIN');

  if (!fleets || fleets.length === 0) return null;

  const handleCopyCredentials = (f: Fleet, e: React.MouseEvent) => {
    e.stopPropagation();
    const inviteText = `🏢 Xtreme Mobile Tire — Fleet Manager Portal
🔗 Portal: ${window.location.origin}/login
📧 Login Email: ${f.email || '—'}
🔑 Password: ${f.password || '(Contact Admin)'}
🏷️ Fleet Code: ${f.fleetCode || f.id}`;

    navigator.clipboard.writeText(inviteText);
    setCopiedId(f.id);
    toast.success(`Copied login credentials for ${f.companyName || f.name}`);
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
            {isAdmin && <th className="table-th">Password</th>}
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
              <td className="table-td">
                {f.email ? (
                  <div>
                    <span className="text-xs text-slate-800 font-semibold block">
                      {f.email}
                    </span>
                    {f.poaEmail && (
                      <span className="text-[10px] text-slate-500 block truncate" title={`Billing: ${f.poaEmail}`}>
                        Billing: {f.poaEmail}
                      </span>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="text-slate-400 text-xs italic">No login email</span>
                    {f.poaEmail && (
                      <span className="text-[10px] text-slate-500 block truncate" title={`Billing: ${f.poaEmail}`}>
                        Billing: {f.poaEmail}
                      </span>
                    )}
                  </div>
                )}
              </td>
              {isAdmin && (
                <td className="table-td" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    {f.password ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs bg-slate-100 text-slate-900 border border-slate-200 font-semibold select-all">
                        {f.password}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs italic">—</span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleCopyCredentials(f, e)}
                      title="Copy portal URL & credentials"
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    >
                      {copiedId === f.id ? (
                        <Check size={13} className="text-emerald-600" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </td>
              )}
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
