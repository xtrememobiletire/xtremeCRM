import { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Plus,
  RefreshCw,
  Building2,
  User,
  Users,
  CreditCard,
  Printer,
  CheckCircle2,
  Car,
} from 'lucide-react';
import { toast } from 'sonner';
import { useInvoices, useFleetBillingSummary, useGenerateFleetConsolidatedInvoice } from '../hooks/useInvoices';
import { useFleets } from '../hooks/useFleets';
import { useTenant } from '../context/TenantContext';
import type { InvoiceRecord } from '../services/invoiceService';
import InvoicePdfModal from '../components/invoices/InvoicePdfModal';
import CreateInvoiceModal from '../components/invoices/CreateInvoiceModal';
import RecordPaymentModal from '../components/invoices/RecordPaymentModal';

type InvoicesTabType = 'FLEET' | 'MEMBER' | 'CUSTOMER';
type FleetSubTabType = 'INVOICES' | 'UNBILLED';

/**
 * Render fleet, member, and customer invoice lists with creation, payment, and
 * print actions, plus fleet job selection for consolidated billing.
 */
export default function Invoices() {
  const { country, currencySymbol } = useTenant();

  // Tab State: Fleets (default), Members, Customers
  const [activeTab, setActiveTab] = useState<InvoicesTabType>('FLEET');
  const [fleetSubTab, setFleetSubTab] = useState<FleetSubTabType>('INVOICES');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoiceForPdf, setSelectedInvoiceForPdf] = useState<string | null>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<InvoiceRecord | null>(null);
  const [lumpSumModalFleet, setLumpSumModalFleet] = useState<any | null>(null);
  const [isConsolidateModalOpen, setIsConsolidateModalOpen] = useState(false);
  const [consolidateTaxRate, setConsolidateTaxRate] = useState<number>(
    country === 'CA' ? 13 : country === 'UK' ? 20 : 8.875
  );
  const [consolidateIsTaxExempt, setConsolidateIsTaxExempt] = useState(false);
  const [consolidateNotes, setConsolidateNotes] = useState('');
  const [consolidateDueDate, setConsolidateDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  // Fleet Selection
  const [selectedFleetId, setSelectedFleetId] = useState<string>('');
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [includeActiveJobs, setIncludeActiveJobs] = useState<boolean>(true);

  // Fetch Invoices
  const { data: invoicesResponse, isLoading, refetch, isFetching } = useInvoices({
    countryCode: (country as any) || undefined,
    invoiceType: activeTab,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    fleetId: activeTab === 'FLEET' && selectedFleetId ? selectedFleetId : undefined,
    search: searchQuery.trim() || undefined,
  });

  // Safe Invoices Array
  const invoices: InvoiceRecord[] = useMemo(() => {
    const raw = invoicesResponse?.data;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(invoicesResponse)) return invoicesResponse;
    if (raw && typeof raw === 'object' && Array.isArray((raw as any).invoices)) {
      return (raw as any).invoices;
    }
    return [];
  }, [invoicesResponse]);

  // Strict Tab Filtering: Filter invoices by customer type and fleet attribution
  const displayInvoices: InvoiceRecord[] = useMemo(() => {
    return invoices.filter((inv) => {
      if (activeTab === 'FLEET') {
        return (inv.invoiceType as string) === 'FLEET' || Boolean(inv.fleetId) || Boolean(inv.fleet);
      }
      if (activeTab === 'MEMBER') {
        return (inv.invoiceType as string) === 'MEMBER' || inv.customer?.customerType === 'MEMBERSHIP';
      }
      if (activeTab === 'CUSTOMER') {
        return ((inv.invoiceType as string) === 'CUSTOMER' || ((Boolean(inv.customerId) || Boolean(inv.customer)) && !inv.fleetId && !inv.fleet)) && inv.customer?.customerType !== 'MEMBERSHIP';
      }
      return true;
    });
  }, [invoices, activeTab]);

  // Fetch Fleets
  const { data: fleetsData } = useFleets();
  const fleets = fleetsData?.data || [];

  // Fetch Fleet Billing Summary
  const { data: fleetBillingSummary, refetch: refetchFleetSummary } = useFleetBillingSummary(
    selectedFleetId || null
  );

  const unbilledJobs = useMemo(() => {
    const list = (includeActiveJobs
      ? (fleetBillingSummary?.unbilledJobs || fleetBillingSummary?.unbilledCompletedJobs || [])
      : (fleetBillingSummary?.unbilledCompletedJobs || [])) as Array<{
      id: string;
      jobCode: string;
      status?: string;
      totalCents?: number;
      [key: string]: any;
    }>;
    return list;
  }, [fleetBillingSummary, includeActiveJobs]);

  const consolidatedMutation = useGenerateFleetConsolidatedInvoice();

  // Toggle job selection in unbilled queue
  /** Toggle a job ID in the selection for consolidated billing. */
  const toggleJobSelection = (jobId: string) => {
    setSelectedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  /**
   * Clear selection when its count matches the unbilled list; otherwise select
   * all job IDs in the current unbilled list.
   */
  const handleSelectAllUnbilled = () => {
    if (selectedJobIds.length === unbilledJobs.length) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(unbilledJobs.map((j) => j.id));
    }
  };

  const selectedUnbilledTotalCents = useMemo(() => {
    return unbilledJobs
      .filter((j) => selectedJobIds.includes(j.id))
      .reduce((sum, j) => sum + (j.totalCents || 0), 0);
  }, [unbilledJobs, selectedJobIds]);

  /**
   * Open consolidation options only when a fleet and at least one job are selected;
   * show an error toast for missing selections.
   */
  const handleOpenConsolidateModal = () => {
    if (!selectedFleetId) {
      toast.error('Please select a fleet first');
      return;
    }
    if (selectedJobIds.length === 0) {
      toast.error('Please select at least one completed job to consolidate');
      return;
    }
    setIsConsolidateModalOpen(true);
  };

  /**
   * Submit selected fleet jobs and tax/due-date options; success clears selection,
   * refreshes invoices/billing, and opens the new invoice preview. Missing selections
   * skip submission; request failures are shown as error toasts.
   */
  const handleConfirmConsolidated = () => {
    if (!selectedFleetId || selectedJobIds.length === 0) return;

    consolidatedMutation.mutate(
      {
        fleetId: selectedFleetId,
        jobIds: selectedJobIds,
        includeActiveJobs,
        taxRatePercent: consolidateIsTaxExempt ? 0 : consolidateTaxRate,
        isTaxExempt: consolidateIsTaxExempt,
        dueDate: consolidateDueDate,
        notes: consolidateNotes.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success(`Consolidated Weekly Invoice ${data.invoiceNumber} generated!`);
          setSelectedJobIds([]);
          setIsConsolidateModalOpen(false);
          setFleetSubTab('INVOICES');
          refetch();
          refetchFleetSummary();
          setSelectedInvoiceForPdf(data.id);
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to generate consolidated invoice');
        },
      }
    );
  };

  const selectedFleet = fleets.find((f: any) => f.id === selectedFleetId);

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-16 px-1 sm:px-2">
      {/* 1. Minimal Header like TechnicianHeader */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Invoices
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {displayInvoices.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition cursor-pointer disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Invoice</span>
          </button>
        </div>
      </div>

      {/* 2. Minimalist Tabs styled exactly like TechnicianTabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto select-none">
        {[
          { id: 'FLEET' as const, label: 'Fleets', icon: Building2 },
          { id: 'MEMBER' as const, label: 'Members', icon: Users },
          { id: 'CUSTOMER' as const, label: 'Customers', icon: User },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setStatusFilter('ALL');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Fleets Filter & Sub-Tabs Bar */}
      {activeTab === 'FLEET' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Sub-Pills: Invoices vs Unbilled Work Orders */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFleetSubTab('INVOICES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                fleetSubTab === 'INVOICES'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Issued Invoices
            </button>
            <button
              type="button"
              onClick={() => setFleetSubTab('UNBILLED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                fleetSubTab === 'UNBILLED'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Unbilled Orders</span>
              {selectedFleetId && unbilledJobs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                  {unbilledJobs.length}
                </span>
              )}
            </button>
          </div>

          {/* Fleet Dropdown Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedFleetId}
              onChange={(e) => {
                setSelectedFleetId(e.target.value);
                setSelectedJobIds([]);
              }}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
            >
              <option value="">All Fleets</option>
              {fleets.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.companyName} ({f.paymentTerms || 'NET_30'})
                </option>
              ))}
            </select>

            {selectedFleet && fleetSubTab === 'INVOICES' && (
              <button
                type="button"
                onClick={() => setLumpSumModalFleet(selectedFleet)}
                className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Lump-Sum Pay</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4A. Unbilled Work Orders View */}
      {activeTab === 'FLEET' && fleetSubTab === 'UNBILLED' ? (
        <div className="space-y-3">
          {!selectedFleetId ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900">Select a fleet account above</h3>
              <p className="text-xs text-slate-500 mt-1">
                Choose a fleet to view their completed jobs queue and generate a consolidated weekly invoice.
              </p>
            </div>
          ) : unbilledJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900">All work orders are invoiced</h3>
              <p className="text-xs text-slate-500 mt-1">
                No unbilled completed jobs found for {selectedFleet?.companyName || 'this fleet'}.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Batch Action Bar */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedJobIds.length === unbilledJobs.length && unbilledJobs.length > 0}
                      onChange={handleSelectAllUnbilled}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300"
                    />
                    <span>Select All ({unbilledJobs.length})</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={includeActiveJobs}
                      onChange={(e) => {
                        setIncludeActiveJobs(e.target.checked);
                        setSelectedJobIds([]);
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Include In-Progress Active Orders</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleOpenConsolidateModal}
                  disabled={selectedJobIds.length === 0 || consolidatedMutation.isPending}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-40 transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Consolidate ({selectedJobIds.length}) Jobs</span>
                </button>
              </div>

              {/* Unbilled Jobs List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {unbilledJobs.map((j) => {
                  const isSelected = selectedJobIds.includes(j.id);
                  return (
                    <div
                      key={j.id}
                      onClick={() => toggleJobSelection(j.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 shadow-2xs'
                          : 'border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 mt-1 pointer-events-none"
                        />
                        <div className="space-y-1">
                          <div className="font-mono font-bold text-xs text-slate-900">
                            {j.jobCode}
                          </div>
                          {j.vehicle && (
                            <div className="text-xs text-slate-700 flex items-center gap-1">
                              <Car className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {j.vehicle.year} {j.vehicle.make} {j.vehicle.model}
                              </span>
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {j.serviceAddress}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-sm text-slate-900">
                          {currencySymbol}{((j.totalCents || 0) / 100).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {j.completedAt ? new Date(j.completedAt).toLocaleDateString() : 'Completed'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 4B. Standard Invoices List View */
        <div className="space-y-3">
          {/* Search & Status Filters */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice number, client..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'UNPAID_AND_PARTIAL', label: 'Unpaid & Partial' },
                { id: 'PENDING', label: 'Pending' },
                { id: 'PARTIAL', label: 'Partial' },
                { id: 'OVERDUE', label: 'Overdue' },
                { id: 'PAID', label: 'Paid' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    statusFilter === id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Invoices Cards */}
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-400">
              Loading invoices...
            </div>
          ) : displayInvoices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900">No invoices found</h3>
              <p className="text-xs text-slate-500 mt-1">
                No invoices matching the current filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayInvoices.map((inv) => {
                const clientName =
                  inv.fleet?.companyName || inv.customer?.fullName || inv.notes || 'Commercial Client';
                const balanceDue =
                  inv.balanceDueCents > 0
                    ? inv.balanceDueCents
                    : inv.status === 'PAID'
                    ? 0
                    : inv.totalCents;

                return (
                  <div
                    key={inv.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between hover:border-slate-300 transition space-y-3"
                  >
                    {/* Top Row: Invoice Number, Badge, Country */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {inv.invoiceNumber}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[9px] font-bold">
                          {inv.countryCode}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'PARTIAL'
                            ? 'bg-purple-100 text-purple-800'
                            : inv.status === 'OVERDUE'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>

                    {/* Client Name & Linked Jobs */}
                    <div>
                      <div className="text-xs font-bold text-slate-800 truncate">{clientName}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Issued: {new Date(inv.issueDate).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                        {inv.jobs && inv.jobs.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{inv.jobs.length} jobs</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Financials & Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Balance Due</span>
                        <span
                          className={`font-mono font-bold text-xs ${
                            balanceDue > 0 ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {currencySymbol}{(balanceDue / 100).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {balanceDue > 0 && inv.status !== 'VOID' && (
                          <button
                            type="button"
                            onClick={() => setPaymentModalInvoice(inv)}
                            className="px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Pay</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForPdf(inv.id)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3 text-slate-500" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PDF Modal */}
      {selectedInvoiceForPdf && (
        <InvoicePdfModal
          isOpen={Boolean(selectedInvoiceForPdf)}
          onClose={() => setSelectedInvoiceForPdf(null)}
          invoiceId={selectedInvoiceForPdf}
          onStatusUpdated={() => refetch()}
        />
      )}

      {/* Create Invoice Modal */}
      {isCreateOpen && (
        <CreateInvoiceModal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            refetch();
          }}
          defaultType={activeTab}
        />
      )}

      {/* Single Payment Modal */}
      {paymentModalInvoice && (
        <RecordPaymentModal
          isOpen={Boolean(paymentModalInvoice)}
          onClose={() => setPaymentModalInvoice(null)}
          invoice={paymentModalInvoice}
          onSuccess={() => refetch()}
        />
      )}

      {/* Fleet Lump-Sum Payment Modal */}
      {lumpSumModalFleet && (
        <RecordPaymentModal
          isOpen={Boolean(lumpSumModalFleet)}
          onClose={() => setLumpSumModalFleet(null)}
          fleet={lumpSumModalFleet}
          onSuccess={() => {
            refetch();
            refetchFleetSummary();
          }}
        />
      )}

      {/* Weekly Fleet Consolidated Invoicing Modal */}
      {isConsolidateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Weekly Consolidated Invoice</h3>
                  <p className="text-xs text-slate-500">{selectedFleet?.companyName || 'Corporate Fleet'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConsolidateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1">
                <div className="flex justify-between items-center text-slate-600 font-medium">
                  <span>Selected Jobs:</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedJobIds.length} completed work orders</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 font-medium">
                  <span>Unbilled Subtotal:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {currencySymbol}{(selectedUnbilledTotalCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Tax Settings */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700">Tax Settings</label>
                  <button
                    type="button"
                    onClick={() => setConsolidateIsTaxExempt(!consolidateIsTaxExempt)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                      consolidateIsTaxExempt
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {consolidateIsTaxExempt ? 'Tax Exempt (0%)' : 'Standard Tax'}
                  </button>
                </div>

                {!consolidateIsTaxExempt && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      value={consolidateTaxRate}
                      onChange={(e) => setConsolidateTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                    <span className="text-slate-500 font-medium">% Tax Rate</span>
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Invoice Due Date</label>
                <input
                  type="date"
                  value={consolidateDueDate}
                  onChange={(e) => setConsolidateDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">Invoice Notes / PO Reference (Optional)</label>
                <input
                  type="text"
                  value={consolidateNotes}
                  onChange={(e) => setConsolidateNotes(e.target.value)}
                  placeholder="e.g. Weekly consolidation billing for Week 41"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConsolidateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmConsolidated}
                disabled={consolidatedMutation.isPending}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {consolidatedMutation.isPending ? 'Generating...' : 'Confirm & Generate Statement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
