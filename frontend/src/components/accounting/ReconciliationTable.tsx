import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { useTenant } from '../../context/TenantContext';

interface JobReconciliation {
  id: string;
  jobNumber: string;
  customerName: string;
  revenueCents: number;
  costCents: number;
  profitCents: number;
  marginPercent: number;
  date: string;
}

interface ReconciliationTableProps {
  records: JobReconciliation[];
}

export default function ReconciliationTable({ records }: ReconciliationTableProps) {
  const { currencySymbol } = useTenant();

  if (!records || records.length === 0) return null;

  return (
    <div className="table-container">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className="table-th">Job # / Date</th>
            <th className="table-th">Customer</th>
            <th className="table-th text-right">Job Revenue</th>
            <th className="table-th text-right">Direct Costs (COGS)</th>
            <th className="table-th text-right">Net Profit</th>
            <th className="table-th text-right">Gross Margin %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((r) => {
            const isProfitable = r.profitCents >= 0;
            return (
              <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="table-td font-mono">
                  <div className="font-bold text-red-600 text-xs">{r.jobNumber}</div>
                  <div className="text-[10px] text-slate-400">{formatDate(r.date)}</div>
                </td>
                <td className="table-td text-xs font-semibold text-slate-900">
                  {r.customerName}
                </td>
                <td className="table-td text-right font-mono font-bold text-slate-900 text-xs sm:text-sm">
                  {formatCurrency(centsToDollars(r.revenueCents), currencySymbol)}
                </td>
                <td className="table-td text-right font-mono text-slate-500 text-xs">
                  {formatCurrency(centsToDollars(r.costCents), currencySymbol)}
                </td>
                <td className={`table-td text-right font-mono font-bold text-xs sm:text-sm ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(centsToDollars(r.profitCents), currencySymbol)}
                </td>
                <td className="table-td text-right">
                  <span className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
                    isProfitable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {isProfitable ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    <span>{r.marginPercent.toFixed(1)}%</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
