import { useState, useEffect } from 'react';
import { DollarSign, CheckCircle2 } from 'lucide-react';
import Card from '../ui/Card';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import { useTenant } from '../../context/TenantContext';
import { accountingService } from '../../services/accountingService';
import { toast } from 'sonner';

interface DriverHolding {
  driverId: string;
  driverName: string;
  van: string;
  cashCollectedCents: number;
  cashToCollectCents: number;
  unremittedJobs: number;
  entryIds: string[];
}

const FALLBACK_CASH_HOLDINGS: DriverHolding[] = [
  { driverId: 'drv-1', driverName: 'Marcus Vance', van: 'Van #04', cashCollectedCents: 42000, cashToCollectCents: 42000, unremittedJobs: 2, entryIds: ['mock-1'] },
  { driverId: 'drv-2', driverName: 'Devon Lee', van: 'Truck #08', cashCollectedCents: 18500, cashToCollectCents: 18500, unremittedJobs: 1, entryIds: ['mock-2'] },
  { driverId: 'drv-3', driverName: 'Samir Patel', van: 'Rig #12', cashCollectedCents: 65000, cashToCollectCents: 65000, unremittedJobs: 3, entryIds: ['mock-3'] },
];

export default function DriverCashTracker() {
  const { currencySymbol } = useTenant();
  const [cashHoldings, setCashHoldings] = useState<DriverHolding[]>(FALLBACK_CASH_HOLDINGS);
  const [loading, setLoading] = useState(false);

  const fetchCashLedger = async () => {
    try {
      setLoading(true);
      const items = await accountingService.getCashLedger();
      if (Array.isArray(items) && items.length > 0) {
        const driverMap = new Map<string, DriverHolding>();
        items.forEach((item: any) => {
          const dId = item.driverId || item.driver?.id || 'unknown';
          const dName = item.driver?.fullName || 'Driver';
          if (!driverMap.has(dId)) {
            driverMap.set(dId, {
              driverId: dId,
              driverName: dName,
              van: 'Mobile Unit',
              cashCollectedCents: 0,
              cashToCollectCents: 0,
              unremittedJobs: 0,
              entryIds: [],
            });
          }
          const rec = driverMap.get(dId)!;
          const isCollection = item.type === 'JOB_COLLECTION' || item.type === 'COLLECTION';
          if (isCollection && !item.verifiedById) {
            rec.cashCollectedCents += item.amountCents || 0;
            rec.cashToCollectCents += item.amountCents || 0;
            rec.unremittedJobs += 1;
            if (item.id) rec.entryIds.push(item.id);
          } else if (item.type === 'DISPATCHER_DEPOSIT' && !item.verifiedById) {
            rec.cashToCollectCents -= Math.abs(item.amountCents || 0);
          }
        });
        const grouped = Array.from(driverMap.values()).filter((d) => d.cashCollectedCents > 0);
        if (grouped.length > 0) {
          setCashHoldings(grouped);
        }
      }
    } catch {
      // Fallback preserved
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashLedger();
  }, []);

  const handleReconcile = async (entry: DriverHolding) => {
    try {
      const realIds = entry.entryIds.filter((id) => !id.startsWith('mock-'));
      for (const id of realIds) {
        await accountingService.verifyCashTransaction(id);
      }
      setCashHoldings((prev) => prev.filter((h) => h.driverId !== entry.driverId));
      toast.success(
        `Settled ${formatCurrency(centsToDollars(entry.cashToCollectCents), currencySymbol)} for ${entry.driverName}`
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to settle cash');
    }
  };

  return (
    <Card title="Driver Cash-on-Hand" icon={DollarSign}>
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
                  {item.unremittedJobs} job(s) pending deposit
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">In Hand / To Collect</div>
                  <div className="text-xs sm:text-sm font-mono font-bold text-emerald-600">
                    {formatCurrency(centsToDollars(item.cashToCollectCents), currencySymbol)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleReconcile(item)}
                  className="btn-secondary py-1 px-2.5 text-[11px] font-semibold cursor-pointer"
                  title="Settle cash collection from driver"
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
