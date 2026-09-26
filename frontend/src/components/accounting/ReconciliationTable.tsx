import { TrendingUp, TrendingDown, Edit3, PlusCircle, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import type { JobReconciliationRecord } from '../../services/accountingService';

interface ReconciliationTableProps {
  records: JobReconciliationRecord[];
  onSelectJob?: (job: JobReconciliationRecord) => void;
  isLoading?: boolean;
}

export default function ReconciliationTable({
  records,
  onSelectJob,
  isLoading = false,
}: ReconciliationTableProps) {
  if (isLoading) {
    return (
      <div className="table-container p-8 text-center bg-white rounded-xl border border-slate-200">
        <div className="inline-flex items-center gap-2 text-slate-500 font-medium text-xs">
          <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span>Loading financial ledger...</span>
        </div>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="table-container p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-700">No completed jobs found for this period</p>
        <p className="text-xs text-slate-400 mt-1">
          Adjust the date or region filter to view historical completed jobs.
        </p>
      </div>
    );
  }

  return (
    <div className="table-container bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            <th className="table-th">Job # / Region</th>
            <th className="table-th">Customer / Vehicle</th>
            <th className="table-th text-right">Job Revenue</th>
            <th className="table-th text-right">Direct Costs (COGS)</th>
            <th className="table-th text-right">Net Profit</th>
            <th className="table-th text-right">Gross Margin %</th>
            <th className="table-th text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((r) => {
            const isProfitable = r.profitCents >= 0;
            const hasRecordedExpenses = r.costCents > 0;
            const itemSymbol = r.currencySymbol || (r.countryCode === 'UK' ? '£' : r.countryCode === 'CA' ? 'CA$' : '$');
            const flag = r.countryCode === 'UK' ? '🇬🇧' : r.countryCode === 'US' ? '🇺🇸' : '🇨🇦';

            return (
              <tr
                key={r.id}
                onClick={() => onSelectJob?.(r)}
                className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                <td className="table-td font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm" title={r.countryCode}>{flag}</span>
                    <span className="font-bold text-slate-900 text-xs group-hover:text-emerald-600 transition">
                      {r.jobNumber}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {r.countryCode || 'CA'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">{formatDate(r.date)}</div>
                </td>

                <td className="table-td">
                  <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[180px]">
                    {r.customerName}
                  </div>
                  {r.vehicle ? (
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[180px]">
                      {r.vehicle.year} {r.vehicle.make} {r.vehicle.model} •{' '}
                      <span className="font-mono font-semibold text-slate-600">{r.vehicle.licensePlate}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 mt-0.5">Mobile roadside service</div>
                  )}
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        r.paymentStatus === 'VERIFIED_PAID' || r.paymentStatus === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {r.paymentStatus === 'VERIFIED_PAID' || r.paymentStatus === 'PAID' ? (
                        <CheckCircle2 size={10} />
                      ) : (
                        <Clock size={10} />
                      )}
                      <span>{r.paymentStatus || 'UNPAID'}</span>
                    </span>
                  </div>
                </td>

                <td className="table-td text-right font-mono font-bold text-slate-900 text-xs sm:text-sm">
                  {formatCurrency(centsToDollars(r.revenueCents), itemSymbol)}
                </td>

                <td className="table-td text-right font-mono text-xs">
                  <div className="font-bold text-slate-800">
                    {formatCurrency(centsToDollars(r.costCents), itemSymbol)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    TC: {formatCurrency(centsToDollars(r.materialCostCents), itemSymbol)} • DC:{' '}
                    {formatCurrency(centsToDollars(r.repairerFeeCents), itemSymbol)}
                  </div>
                </td>

                <td
                  className={`table-td text-right font-mono font-bold text-xs sm:text-sm ${
                    isProfitable ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  <div>{formatCurrency(centsToDollars(r.profitCents), itemSymbol)}</div>
                </td>

                <td className="table-td text-right">
                  <span
                    className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
                      isProfitable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {isProfitable ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    <span>{r.marginPercent.toFixed(1)}%</span>
                  </span>
                </td>

                <td className="table-td text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectJob?.(r);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      hasRecordedExpenses
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {hasRecordedExpenses ? (
                      <>
                        <Edit3 size={11} />
                        <span>Edit COGS</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle size={11} />
                        <span>State COGS</span>
                      </>
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
