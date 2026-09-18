import { Car, ExternalLink } from 'lucide-react';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { useTenant } from '../../context/TenantContext';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  fleetCompany?: {
    id: string;
    companyName: string;
  } | null;
  vehicles?: any[];
  jobs?: any[];
  totalSpendCents?: number;
  createdAt: string;
}

interface CustomerTableProps {
  customers: Customer[];
  onSelectCustomer?: (customer: Customer) => void;
}

export default function CustomerTable({ customers, onSelectCustomer }: CustomerTableProps) {
  const { currencySymbol } = useTenant();

  if (!customers || customers.length === 0) return null;

  return (
    <div className="table-container">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className="table-th">Customer Name</th>
            <th className="table-th">Phone & Contact</th>
            <th className="table-th">Account Type</th>
            <th className="table-th">Vehicles</th>
            <th className="table-th text-right">Lifetime Spent</th>
            <th className="table-th text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="table-td">
                <div className="font-bold text-slate-900 text-xs sm:text-sm">{c.name}</div>
                {c.email && <div className="text-[11px] text-slate-400">{c.email}</div>}
              </td>
              <td className="table-td">
                <div className="font-mono text-xs text-slate-700 font-semibold">{c.phone}</div>
              </td>
              <td className="table-td">
                {c.fleetCompany ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Fleet: {c.fleetCompany.companyName}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    Retail Customer
                  </span>
                )}
              </td>
              <td className="table-td">
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <Car size={13} className="text-slate-400" />
                  <span>{c.vehicles?.length || 0} Registered</span>
                </div>
              </td>
              <td className="table-td text-right font-mono font-bold text-slate-900">
                {formatCurrency(centsToDollars(c.totalSpendCents || 0), currencySymbol)}
              </td>
              <td className="table-td text-center">
                <button
                  type="button"
                  onClick={() => onSelectCustomer?.(c)}
                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="View History"
                >
                  <ExternalLink size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
