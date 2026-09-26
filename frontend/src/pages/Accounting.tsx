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
  FileText,
  Printer,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import ReconciliationTable from '../components/accounting/ReconciliationTable';
import ExpenseStatingModal from '../components/accounting/ExpenseStatingModal';
import InvoicePdfModal from '../components/invoices/InvoicePdfModal';
import { useAccountingSummary, useReconciliationJobs } from '../hooks/useAccounting';
import { useTenant } from '../context/TenantContext';
import { formatCurrency, centsToDollars } from '../utils/currency';
import { accountingService, type JobReconciliationRecord } from '../services/accountingService';

export default function Accounting() {
  const { country, currencySymbol } = useTenant();

  // Navigation tab
  const [accountingTab, setAccountingTab] = useState<'reconciliation' | 'invoices'>('reconciliation');

  // Filters
  const [timeframe, setTimeframe] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Modal State
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobReconciliationRecord | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Queries
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useAccountingSummary({
    timeframe: timeframe === 'all' ? undefined : timeframe,
  });

  const {
    data: invoices = [],
    isLoading: isInvoicesLoading,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ['accounting-invoices', country],
    queryFn: () => accountingService.getInvoices({ countryCode: country }),
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

  const filteredInvoices = invoices.filter((inv) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.customer?.fullName?.toLowerCase().includes(q) ||
      inv.fleet?.name?.toLowerCase().includes(q)
    );
  });

  const totalInvoicedCents = invoices.reduce((s, inv) => s + (inv.totalCents || 0), 0);
  const totalPaidCents = invoices.filter(i => i.status === 'PAID').reduce((s, inv) => s + (inv.totalCents || 0), 0);
  const totalOutstandingCents = invoices.filter(i => i.status !== 'PAID').reduce((s, inv) => s + (inv.totalCents || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title={accountingTab === 'reconciliation' ? 'Reconciliation' : 'Invoices'}
        subtitle={`${regionName} (${currencySymbol})`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                handleRefresh();
                refetchInvoices();
              }}
              className="btn-secondary px-2.5 py-2 cursor-pointer"
              title="Refresh ledger data"
            >
              <RefreshCw size={14} className={isSummaryLoading || isJobsLoading || isInvoicesLoading ? 'animate-spin' : ''} />
            </button>

            {accountingTab === 'reconciliation' && (
              <button
                type="button"
                onClick={handleOpenNewExpense}
                className="btn-primary inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Expense</span>
              </button>
            )}
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setAccountingTab('reconciliation')}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition cursor-pointer ${
            accountingTab === 'reconciliation'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Reconciliation</span>
        </button>

        <button
          type="button"
          onClick={() => setAccountingTab('invoices')}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition cursor-pointer ${
            accountingTab === 'invoices'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Invoices</span>
          {invoices.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
              {invoices.length}
            </span>
          )}
        </button>
      </div>

      {accountingTab === 'reconciliation' ? (
        <>
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
                  Completed Jobs — Expense Audit
                </h3>
                <p className="text-xs text-slate-500">
                  Click a row to audit expenses and approve technician payouts.
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
        </>
      ) : (
        /* Invoices Section (FR-5) */
        <div className="space-y-4">
          {/* Invoice Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-semibold block">Total Invoiced</span>
              <span className="text-lg font-mono font-black text-slate-900 mt-1 block">
                {formatCurrency(centsToDollars(totalInvoicedCents), currencySymbol)}
              </span>
              <span className="text-[11px] text-slate-400">{invoices.length} commercial invoices generated</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-emerald-600 font-semibold block">Collected / Settled</span>
              <span className="text-lg font-mono font-black text-emerald-700 mt-1 block">
                {formatCurrency(centsToDollars(totalPaidCents), currencySymbol)}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">Remitted to company account</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-rose-600 font-semibold block">Outstanding Receivables (Net-30)</span>
              <span className="text-lg font-mono font-black text-rose-600 mt-1 block">
                {formatCurrency(centsToDollars(totalOutstandingCents), currencySymbol)}
              </span>
              <span className="text-[11px] text-slate-400">Pending fleet & motorist payment</span>
            </div>
          </div>

          {/* Invoices Search */}
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
            <div className="relative w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice #, customer, fleet..."
                className="input-base pl-8 py-1.5 text-xs w-full"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              {filteredInvoices.length} Invoices Found
            </span>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Billed Account</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-red-600">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(inv.issueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {inv.fleet?.name || inv.customer?.fullName || 'Motorist Client'}
                        </span>
                        {inv.fleet && (
                          <span className="text-[10px] text-slate-400 font-mono">Commercial Account</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right">
                        {formatCurrency(centsToDollars(inv.totalCents), currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.status === 'OVERDUE'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className="btn-secondary py-1 px-2.5 text-[11px] inline-flex items-center gap-1.5 text-slate-800 hover:bg-slate-100"
                        >
                          <Printer className="w-3 h-3 text-red-600" />
                          <span>View PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No commercial invoices recorded. Invoices are generated with 1-click on completed jobs.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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

      {/* Invoice PDF Modal (FR-5) */}
      {selectedInvoiceId && (
        <InvoicePdfModal
          isOpen={!!selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          invoiceId={selectedInvoiceId}
          onStatusUpdated={() => {
            refetchInvoices();
            refetchJobs();
            refetchSummary();
          }}
        />
      )}
    </div>
  );
}
