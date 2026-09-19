import { DollarSign, CheckCircle2 } from 'lucide-react';
import Card from '../ui/Card';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { useTenant } from '../../context/TenantContext';
import { toast } from 'sonner';

const MOCK_CASH_HOLDINGS = [
  { driverId: 'drv-1', driverName: 'Marcus Vance', van: 'Van #04', cashCollectedCents: 42000, unremittedJobs: 2 },
  { driverId: 'drv-2', driverName: 'Devon Lee', van: 'Truck #08', cashCollectedCents: 18500, unremittedJobs: 1 },
  { driverId: 'drv-3', driverName: 'Samir Patel', van: 'Rig #12', cashCollectedCents: 65000, unremittedJobs: 3 },
];

export default function DriverCashTracker() {
  const { currencySymbol } = useTenant();

  const handleReconcile = (driverName: string, amount: number) => {
    toast.success(`Successfully recorded ${formatCurrency(centsToDollars(amount), currencySymbol)} settlement for ${driverName}`);
  };

  return (
    <Card title="Driver Cash-on-Hand Ledger" icon={DollarSign}>
      <div className="divide-y divide-slate-100">
        {MOCK_CASH_HOLDINGS.map((item) => (
          <div key={item.driverId} className="py-3 flex items-center justify-between gap-2">
            <div>
              <div className="font-bold text-xs sm:text-sm text-slate-900">{item.driverName}</div>
              <div className="text-[11px] text-slate-500">
                {item.van} • {item.unremittedJobs} Cash Job(s) Unsettled
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Cash Held</div>
                <div className="text-xs sm:text-sm font-mono font-bold text-emerald-600">
                  {formatCurrency(centsToDollars(item.cashCollectedCents), currencySymbol)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleReconcile(item.driverName, item.cashCollectedCents)}
                className="btn-secondary py-1 px-2 text-[11px] font-semibold"
                title="Settle driver cash collection"
              >
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Settle</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
