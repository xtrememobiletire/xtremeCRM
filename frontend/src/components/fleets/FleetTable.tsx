import { Truck } from 'lucide-react';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { useTenant } from '../../context/TenantContext';

interface Fleet {
  id: string;
  companyName: string;
  contactName?: string;
  phone?: string;
  email?: string;
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

  if (!fleets || fleets.length === 0) return null;

  return (
    <div className="table-container">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className="table-th">Company Name</th>
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
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <Truck size={15} className="text-red-600" />
                  <span>{f.companyName}</span>
                </div>
              </td>
              <td className="table-td">
                <div className="text-xs font-semibold text-slate-800">{f.contactName || 'Corporate'}</div>
                <div className="text-[11px] font-mono text-slate-500">{f.phone || f.email}</div>
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
