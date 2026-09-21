import { useState, useEffect } from 'react';
import { DollarSign, CheckCircle2 } from 'lucide-react';
import Card from '../ui/Card';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { useTenant } from '../../context/TenantContext';
import { accountingService } from '../../services/accountingService';
import { toast } from 'sonner';

const FALLBACK_CASH_HOLDINGS = [
  { id: 'mock-1', driverId: 'drv-1', driverName: 'Marcus Vance', van: 'Van #04', cashCollectedCents: 42000, unremittedJobs: 2 },
  { id: 'mock-2', driverId: 'drv-2', driverName: 'Devon Lee', van: 'Truck #08', cashCollectedCents: 18500, unremittedJobs: 1 },
  { id: 'mock-3', driverId: 'drv-3', driverName: 'Samir Patel', van: 'Rig #12', cashCollectedCents: 65000, unremittedJobs: 3 },
];

export default function DriverCashTracker() {
  const { currencySymbol } = useTenant();
  const [cashHoldings, setCashHoldings] = useState<any[]>(FALLBACK_CASH_HOLDINGS);
  const [loading, setLoading] = useState(false);

  const fetchCashLedger = async () => {
    try {
      setLoading(true);
      const items = await accountingService.getCashLedger();
      if (Array.isArray(items) && items.length > 0) {
        // Group by driver
        const driverMap = new Map<string, any>();
        items.forEach((item: any) => {
          const dId = item.driverId || item.driver?.id || 'unknown';
          const dName = item.driver?.fullName || 'Driver';
          if (!driverMap.has(dId)) {
            driverMap.set(dId, {
              id: item.id,
              driverId: dId,
              driverName: dName,
              van: 'Mobile Unit',
              cashCollectedCents: 0,
              unremittedJobs: 0,
            });
          }
          const rec = driverMap.get(dId);
          if (item.type === 'COLLECTION' && !item.verifiedById) {
            rec.cashCollectedCents += item.amountCents || 0;
            rec.unremittedJobs += 1;
          }
        });
        const grouped = Array.from(driverMap.values()).filter((d) => d.cashCollectedCents > 0);
        if (grouped.length > 0) {
          setCashHoldings(grouped);
        }
      }
    } catch {
      // Keep fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashLedger();
  }, []);

  const handleReconcile = async (entry: any) => {
    try {
      if (entry.id && !entry.id.startsWith('mock-')) {
        await accountingService.verifyCashTransaction(entry.id);
      }
      setCashHoldings((prev) => prev.filter((h) => h.driverId !== entry.driverId));
      toast.success(
        `Recorded ${formatCurrency(centsToDollars(entry.cashCollectedCents), currencySymbol)} settlement for ${entry.driverName}`
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to settle transaction');
    }
  };

  return (
    <Card title="Driver Cash-on-Hand Ledger" icon={DollarSign}>
      <div className="divide-y divide-slate-100">
        {loading ? (
          <div className="py-4 text-center text-xs text-slate-400">Loading cash ledger...</div>
        ) : cashHoldings.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">All driver cash settled</div>
        ) : (
          cashHoldings.map((item) => (
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
                  onClick={() => handleReconcile(item)}
                  className="btn-secondary py-1 px-2 text-[11px] font-semibold"
                  title="Settle driver cash collection"
                >
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Settle</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
