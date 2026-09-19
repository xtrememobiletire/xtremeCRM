import { useState } from 'react';
import { DollarSign, TrendingUp, Receipt, Plus } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import ReconciliationTable from '../components/pages/accounting/ReconciliationTable';
import ExpenseStatingModal from '../components/pages/accounting/ExpenseStatingModal';
import { useAccountingSummary } from '../hooks/useAccounting';
import { useTenant } from '../context/TenantContext';
import { formatCurrency, centsToDollars } from '../utils/currency';

const MOCK_RECONCILIATION_RECORDS = [
  { id: '1', jobNumber: 'JOB-CA-1001', customerName: 'Metro Couriers Corp', revenueCents: 24500, costCents: 8500, profitCents: 16000, marginPercent: 65.3, date: new Date().toISOString() },
  { id: '2', jobNumber: 'JOB-CA-1002', customerName: 'Sarah Jenkins', revenueCents: 18500, costCents: 4500, profitCents: 14000, marginPercent: 75.7, date: new Date().toISOString() },
  { id: '3', jobNumber: 'JOB-CA-1003', customerName: 'Apex Transport', revenueCents: 42000, costCents: 18500, profitCents: 23500, marginPercent: 56.0, date: new Date().toISOString() },
  { id: '4', jobNumber: 'JOB-CA-1004', customerName: 'Mark Thompson', revenueCents: 15000, costCents: 5000, profitCents: 10000, marginPercent: 66.7, date: new Date().toISOString() },
  { id: '5', jobNumber: 'JOB-CA-1005', customerName: 'Swift Delivery Logistics', revenueCents: 38000, costCents: 12000, profitCents: 26000, marginPercent: 68.4, date: new Date().toISOString() },
];

export default function Accounting() {
  const { country, currencySymbol } = useTenant();
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  useAccountingSummary();

  const totalRevenue = MOCK_RECONCILIATION_RECORDS.reduce((sum, r) => sum + r.revenueCents, 0);
  const totalCost = MOCK_RECONCILIATION_RECORDS.reduce((sum, r) => sum + r.costCents, 0);
  const totalProfit = totalRevenue - totalCost;
  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Costing & Financial Reconciliation"
        subtitle={`Real-time margin analysis and COGS ledger for ${country} Region`}
        actions={
          <button
            type="button"
            onClick={() => setIsExpenseOpen(true)}
            className="btn-primary"
          >
            <Plus size={14} />
            <span>Record Job Expense / Part</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Period Gross Revenue"
          value={formatCurrency(centsToDollars(totalRevenue), currencySymbol)}
          subtitle="All dispatched & billed jobs"
          subtitleColor="text-slate-500"
          icon={DollarSign}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Direct Operating Costs"
          value={formatCurrency(centsToDollars(totalCost), currencySymbol)}
          subtitle="Tires, patches, subcontractor fees"
          subtitleColor="text-rose-500"
          icon={Receipt}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
        <StatCard
          title="Net Gross Profit"
          value={formatCurrency(centsToDollars(totalProfit), currencySymbol)}
          subtitle="Contribution margin after job costs"
          subtitleColor="text-emerald-600"
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Average Margin"
          value={`${overallMargin.toFixed(1)}%`}
          subtitle="Target: > 50% on mobile services"
          subtitleColor="text-emerald-600"
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      <div className="space-y-2">
        <h3 className="font-bold text-sm text-slate-800">Job Cost Breakdown & Reconciliation</h3>
        <ReconciliationTable records={MOCK_RECONCILIATION_RECORDS} />
      </div>

      <ExpenseStatingModal isOpen={isExpenseOpen} onClose={() => setIsExpenseOpen(false)} />
    </div>
  );
}
