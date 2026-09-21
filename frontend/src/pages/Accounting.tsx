import { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Plus,
  Calendar,
  Search,
  RefreshCw,
  Landmark,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import ReconciliationTable from '../components/accounting/ReconciliationTable';
import ExpenseStatingModal from '../components/accounting/ExpenseStatingModal';
import { useAccountingSummary, useReconciliationJobs } from '../hooks/useAccounting';
import { useTenant } from '../context/TenantContext';
import { formatCurrency, centsToDollars } from '../utils/currency';
import type { JobReconciliationRecord } from '../services/accountingService';

export default function Accounting() {
  const { country, currencySymbol } = useTenant();

  // Filters
  const [timeframe, setTimeframe] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Modal State
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobReconciliationRecord | null>(null);

  // Queries
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useAccountingSummary({
    timeframe: timeframe === 'all' ? undefined : timeframe,
  });

  const {
    data: jobsResponse,
    isLoading: isJobsLoading,
    refetch: refetchJobs,
  } = useReconciliationJobs({
    timeframe: timeframe === 'all' ? undefined : timeframe,
    search: search.trim() || undefined,
  });

  const records = jobsResponse?.data || [];
  const metrics = summaryData?.metrics;

  const grossRevenue = metrics?.grossRevenueCents ?? 0;
  const directCosts = metrics?.totalDirectCostsCents ?? 0;
  const netProfit = metrics?.netProfitCents ?? 0;
  const netAfterIt = metrics?.netAfterItRoyaltyCents ?? 0;
  const averageMargin = metrics?.averageMarginPercent ?? (grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0);

  const handleRowSelect = (job: JobReconciliationRecord) => {
    setSelectedJob(job);
    setIsExpenseOpen(true);
  };

  const handleOpenNewExpense = () => {
    setSelectedJob(null);
    setIsExpenseOpen(true);
  };

  const handleRefresh = () => {
    refetchSummary();
    refetchJobs();
  };

  const timeFilterPresets = [
    { key: 'all', label: 'All Time' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: '3days', label: 'Last 3 Days' },
    { key: '7days', label: '1 Week' },
    { key: 'month', label: 'Monthly' },
  ];

  const regionName = country === 'CA' ? 'Canada' : country === 'US' ? 'United States' : 'United Kingdom';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Job Costing & Financial Reconciliation"
        subtitle={`Real-time margin analysis and COGS ledger for ${regionName} (${currencySymbol})`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="btn-secondary px-2.5 py-2"
              title="Refresh ledger data"
            >
              <RefreshCw size={14} className={isSummaryLoading || isJobsLoading ? 'animate-spin' : ''} />
            </button>

            <button
              type="button"
              onClick={handleOpenNewExpense}
              className="btn-primary inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Record Job Expense / Part</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Period Gross Revenue"
          value={formatCurrency(centsToDollars(grossRevenue), currencySymbol)}
          subtitle={`${metrics?.completedJobs ?? records.length} completed & billed jobs`}
          subtitleColor="text-slate-500"
          icon={DollarSign}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          isLoading={isSummaryLoading}
        />
        <StatCard
          title="Direct Operating Costs"
          value={formatCurrency(centsToDollars(directCosts), currencySymbol)}
          subtitle="Tires, patches, technician labor fees"
          subtitleColor="text-rose-500"
          icon={Receipt}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          isLoading={isSummaryLoading}
        />
        <StatCard
          title="Net Gross Profit"
          value={formatCurrency(centsToDollars(netProfit), currencySymbol)}
          subtitle={`After IT Royalty: ${formatCurrency(centsToDollars(netAfterIt), currencySymbol)}`}
          subtitleColor="text-emerald-600"
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          isLoading={isSummaryLoading}
        />
        <StatCard
          title="Average Margin"
          value={`${averageMargin.toFixed(1)}%`}
          subtitle="Target: > 50% on mobile roadside"
          subtitleColor={averageMargin >= 50 ? 'text-emerald-600' : 'text-amber-600'}
          icon={Landmark}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          isLoading={isSummaryLoading}
        />
      </div>

      {/* Filter Presets & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Calendar size={14} className="text-slate-400 shrink-0 ml-1 mr-1" />
          {timeFilterPresets.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => setTimeframe(preset.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                timeframe === preset.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px] sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by job #, customer, fleet..."
            className="input-base pl-8 py-1.5 text-xs w-full"
          />
        </div>
      </div>

      {/* Main Ledger Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Job Cost Breakdown & Reconciliation
            </h3>
            <p className="text-xs text-slate-500">
              Click any row to audit wholesale materials (TC), technician fee (DC), and incidental notes.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {records.length} {records.length === 1 ? 'Job' : 'Jobs'} Listed
          </span>
        </div>

        <ReconciliationTable
          records={records}
          onSelectJob={handleRowSelect}
          isLoading={isJobsLoading}
        />
      </div>

      {/* Expense Stating Modal */}
      {isExpenseOpen && (
        <ExpenseStatingModal
          isOpen={isExpenseOpen}
          onClose={() => {
            setIsExpenseOpen(false);
            setSelectedJob(null);
          }}
          job={selectedJob}
          completedJobs={records}
        />
      )}
    </div>
  );
}
