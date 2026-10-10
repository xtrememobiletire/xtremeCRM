import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  PhoneCall, 
  MessageSquare, 
  Search, 
  RefreshCw, 
  Truck, 
  ClipboardCheck, 
  Calendar, 
  Zap, 
  Wrench, 
  XCircle, 
  Layers,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  Edit3
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import LeadCommandCenter from '../components/leads/LeadCommandCenter';
import UploadSpreadsheetModal from '../components/leads/UploadSpreadsheetModal';
import ConvertFleetModal from '../components/leads/ConvertFleetModal';
import DispositionModal from '../components/leads/DispositionModal';
import TrialServiceModal from '../components/leads/TrialServiceModal';
import VaFocusCard from '../components/leads/VaFocusCard';
import ManagementBatchDashboard from '../components/leads/ManagementBatchDashboard';
import VaBatchHub from '../components/leads/VaBatchHub';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { 
  leadService, 
  type Lead, 
  type LeadStage, 
  type DisqualificationReason 
} from '../services/leadService';
import {
  getAllowedPipelineTabs,
  canPerformPipelineAction,
  TAB_LABELS,
  type LeadPoolTab
} from '../config/pipelineAccessConfig';
import { toast } from 'sonner';

const countryFlags: Record<string, string> = {
  CA: '🇨🇦',
  US: '🇺🇸',
  UK: '🇬🇧',
};

export default function Leads() {
  const { country } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isVa = user?.role === 'VIRTUAL_ASSISTANT';
  const isAgent = user?.role === 'CALL_AGENT';
  const isDispatcher = user?.role === 'DISPATCHER';
  const isAdminOrGm = ['ADMIN', 'GENERAL_MANAGER'].includes(user?.role || '');

  // Determine initial tab strictly along lifecycle
  const initialTab: LeadPoolTab = isVa
    ? 'unassigned'
    : isAgent
    ? 'callbacks'
    : isDispatcher
    ? 'dispatcher'
    : 'unassigned';

  const [activeTab, setActiveTab] = useState<LeadPoolTab>(initialTab);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const handleTabChange = (tab: LeadPoolTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // Reset page when region changes
  useEffect(() => {
    setCurrentPage(1);
  }, [country]);

  // Modals & form states
  const [selectedDispositionLead, setSelectedDispositionLead] = useState<Lead | null>(null);

  // Test service booking modal state
  const [testServiceLead, setTestServiceLead] = useState<Lead | null>(null);

  // Disqualification modal state
  const [disqualifyingLead, setDisqualifyingLead] = useState<Lead | null>(null);
  const [disqualificationCategory, setDisqualificationCategory] = useState<DisqualificationReason>('NOT_INTERESTED');
  const [disqualificationText, setDisqualificationText] = useState('');

  // Fleet conversion modal state
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  // Dispatcher Feasibility Notes modal state
  const [editingNotesLead, setEditingNotesLead] = useState<Lead | null>(null);
  const [dispatcherNotesText, setDispatcherNotesText] = useState('');

  // Auto-dialer toggle
  const [autoDialEnabled, setAutoDialEnabled] = useState(false);

  // Filters & search
  const [search, setSearch] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [vaInSession, setVaInSession] = useState(false);

  // Upper Management container view mode: 'BATCHES' | 'DRILLDOWN' | 'GLOBAL'
  const [managementViewMode, setManagementViewMode] = useState<'BATCHES' | 'DRILLDOWN' | 'GLOBAL'>(
    isDispatcher ? 'GLOBAL' : 'BATCHES'
  );
  const [inspectedBatchId, setInspectedBatchId] = useState<string | null>(null);

  // 1. Available active batches for VA campaign selection (Zero country friction, never future batches)
  const { data: availableBatches = [], isLoading: isLoadingVaBatches, refetch: refetchBatches } = useQuery({
    queryKey: ['available-batches-va'],
    queryFn: () => leadService.getAvailableBatchesForVa(),
    enabled: isVa || isAgent,
    refetchInterval: 30000,
  });

  // 2. Batches query for Upper Management
  const { data: managementBatches = [], isLoading: isLoadingBatches, refetch: refetchBatchesMgmt } = useQuery({
    queryKey: ['management-batches'],
    queryFn: () => leadService.getBatches(),
    enabled: isAdminOrGm || isDispatcher,
  });

  const inspectedBatch = managementBatches.find((b: any) => b.id === inspectedBatchId) || null;

  // 3. Agent / VA 1-cap focus queue (refills synchronously on disposition)
  const { data: queueResponse, isLoading: isLoadingQueue, refetch: refetchQueue } = useQuery({
    queryKey: ['agent-queue', country, selectedBatchId],
    queryFn: () => leadService.getAgentQueue(country, selectedBatchId || undefined),
    enabled: (isVa || isAgent) && vaInSession,
  });

  const queueData = queueResponse || {
    leads: [],
    scheduledCallbacks: [],
    activeCount: 0,
    maxCapacity: 1,
    unassignedPoolCount: 0,
  };

  // 4. Tab-specific leads query with server-side pagination (scoped to batch when in drilldown)
  const { data: leadsResponse, isLoading: isLoadingLeads, refetch: refetchLeads } = useQuery({
    queryKey: ['leads', country, activeTab, search, currentPage, pageSize, inspectedBatchId, managementViewMode],
    queryFn: () => leadService.getLeads({
      countryCode: managementViewMode === 'GLOBAL' ? undefined : (inspectedBatch?.countryCode || country),
      batchId: inspectedBatchId || undefined,
      pool: activeTab,
      search: search || undefined,
      page: currentPage,
      limit: pageSize,
    }),
    enabled: managementViewMode === 'DRILLDOWN' || managementViewMode === 'GLOBAL' || !isAdminOrGm,
  });

  const tabLeads: Lead[] = leadsResponse?.data || [];
  const pagination = leadsResponse?.pagination || {
    total: tabLeads.length,
    page: currentPage,
    limit: pageSize,
    totalPages: Math.max(1, Math.ceil((tabLeads.length || 1) / pageSize)),
  };
  const displayLeads: Lead[] = tabLeads;
  const isLoading = (isVa || isAgent) && vaInSession ? isLoadingQueue : isLoadingLeads;

  const refetchAll = () => {
    if (isVa || isAgent) {
      refetchQueue();
      refetchBatches();
    } else {
      refetchLeads();
      refetchBatchesMgmt();
    }
  };

  const startBatchByIdMutation = useMutation({
    mutationFn: (id: string) => leadService.startBatchById(id),
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Batch activated successfully!');
      queryClient.invalidateQueries({ queryKey: ['management-batches'] });
      queryClient.invalidateQueries({ queryKey: ['available-batches-va'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['agent-queue'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to start batch');
    },
  });

  const closeBatchMutation = useMutation({
    mutationFn: (id: string) => leadService.closeBatch(id),
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Batch marked as COMPLETED');
      queryClient.invalidateQueries({ queryKey: ['management-batches'] });
      queryClient.invalidateQueries({ queryKey: ['available-batches-va'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['agent-queue'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to close batch');
    },
  });

  // Mutations
  const distributeMutation = useMutation({
    mutationFn: () => leadService.distributeLeads({ countryCode: country }),
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Leads evenly distributed across active VAs!');
      queryClient.invalidateQueries({ queryKey: ['agent-queue'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to distribute leads');
    },
  });

  const dispositionMutation = useMutation({
    mutationFn: ({ 
      id, 
      disposition, 
      notes, 
      callbackData 
    }: { 
      id: string; 
      disposition: string; 
      notes?: string; 
      callbackData?: any; 
    }) => leadService.setDisposition(id, disposition, notes, callbackData),
    onSuccess: async () => {
      toast.success('Call outcome recorded! 1-cap slot auto-replenished.');
      setSelectedDispositionLead(null);
      queryClient.invalidateQueries({ queryKey: ['agent-queue'] });
      queryClient.invalidateQueries({ queryKey: ['available-batches-va'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      if (autoDialEnabled && isAgent) {
        setTimeout(async () => {
          const freshQueue: any = await queryClient.fetchQuery({
            queryKey: ['agent-queue', country],
            queryFn: () => leadService.getAgentQueue(country),
          });
          const nextLead = freshQueue?.scheduledCallbacks?.[0] || freshQueue?.leads?.[0];
          if (nextLead && nextLead.phone) {
            handleCallLead(nextLead);
          }
        }, 1200);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to record disposition');
    },
  });

  const advanceStageMutation = useMutation({
    mutationFn: ({ id, stage, notes }: { id: string; stage: LeadStage; notes?: string }) =>
      leadService.advanceStage(id, { stage, notes }),
    onSuccess: () => {
      toast.success('Lead stage advanced!');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['agent-queue'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to advance stage');
    },
  });

  const disqualifyMutation = useMutation({
    mutationFn: ({ id, reason, notes }: { id: string; reason: DisqualificationReason; notes?: string }) =>
      leadService.disqualifyLead(id, reason, notes),
    onSuccess: () => {
      toast.success('Lead disqualified and logged in metrics audit trail');
      setDisqualifyingLead(null);
      setDisqualificationText('');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['agent-queue'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to disqualify lead');
    },
  });

  const createTestServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => leadService.createTestService(id, data),
    onSuccess: () => {
      toast.success('Trial service work order created! Dispatched for feasibility verification.');
      setTestServiceLead(null);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create trial service job');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => leadService.reactivateLead(id),
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Lead restored to active outreach pipeline!');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['agent-queue'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to reactivate lead');
    },
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, customFleetCode, extraData }: { id: string; customFleetCode?: string; extraData?: any }) =>
      leadService.convertToFleet(id, customFleetCode, extraData),
    onSuccess: () => {
      toast.success('Lead converted to Fleet Account! All 10 columns preserved.');
      setConvertingLead(null);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to convert lead');
    },
  });

  const updateDispatcherNotesMutation = useMutation({
    mutationFn: ({ id, dispatcherNotes }: { id: string; dispatcherNotes: string }) =>
      leadService.updateLead(id, { dispatcherNotes } as any),
    onSuccess: () => {
      toast.success('Dispatcher feasibility notes saved!');
      setEditingNotesLead(null);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save feasibility notes');
    },
  });

  const handleCallLead = (lead: Lead) => {
    const cleanPhone = lead.phone?.replace(/[^0-9+]/g, '') || lead.phone;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cleanPhone);
      toast.success(`Copied ${cleanPhone} to clipboard`);
    }
    window.open(`tel:${cleanPhone}`, '_self');
    setSelectedDispositionLead(lead);
  };

  const handleWhatsAppChat = (lead: Lead) => {
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hi ${lead.contactPerson}, this is Xtreme Mobile Tire dispatch team regarding fleet tire servicing for ${lead.companyName}. Please find our commercial agreement details here.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* 1. VA / CALL AGENT WORKFLOW: ZERO FRICTION CAMPAIGN CHOOSER & 1-LEAD FOCUS CARD */}
      {(isVa || isAgent) && !isAdminOrGm && !isDispatcher ? (
        !vaInSession ? (
          <VaBatchHub
            batches={availableBatches}
            isLoading={isLoadingVaBatches}
            onSelectBatch={(batchId) => {
              setSelectedBatchId(batchId);
              setVaInSession(true);
            }}
            onRefresh={refetchBatches}
            onOpenUpload={() => setIsUploadModalOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            {/* VA Session Header: Switch Campaign + Active Slot status */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4 border border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setVaInSession(false);
                    setSelectedBatchId(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <ArrowLeft size={13} />
                  <span>Switch Campaign</span>
                </button>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-400 bg-red-950/80 px-2.5 py-0.5 rounded-full border border-red-800">
                      1-Cap Focus Replenishment
                    </span>
                    <span className="text-xs text-slate-300">
                      Active Campaign:{' '}
                      <strong className="text-white font-bold">
                        {selectedBatchId
                          ? availableBatches.find((b) => b.id === selectedBatchId)?.batchName || 'Selected Campaign'
                          : 'All Active Campaigns (Auto FIFO)'}
                      </strong>
                    </span>
                    <span className="text-xs text-slate-300 ml-2">
                      Active Slot Load: <strong className="text-white font-bold">{queueData.activeCount} / 1</strong>
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {queueData.unassignedPoolCount > 0 ? (
                      <span>
                        🚀 <strong className="text-emerald-400 font-bold">{queueData.unassignedPoolCount} unassigned cold leads</strong> waiting in queue. Next lead replenishes instantly upon call outcome!
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        No unassigned leads remaining in this campaign. Click &quot;Switch Campaign&quot; to pick another active batch.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Quick Campaign Switch Dropdown */}
                <div className="flex items-center gap-1.5">
                  <Layers size={13} className="text-slate-400" />
                  <select
                    value={selectedBatchId || ''}
                    onChange={(e) => setSelectedBatchId(e.target.value || null)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 outline-none focus:ring-1 focus:ring-red-500 cursor-pointer max-w-[280px]"
                  >
                    <option value="">All Active Campaigns (Auto FIFO)</option>
                    {availableBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        [{b.countryCode}] {b.batchName} ({b.unassignedLeads} leads left)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto-Dialer Toggle for Call Agents / VAs */}
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 cursor-pointer select-none">
                  <Zap size={13} className={autoDialEnabled ? 'text-amber-400 fill-amber-400' : 'text-slate-400'} />
                  <span>Auto-Dial</span>
                  <input
                    type="checkbox"
                    checked={autoDialEnabled}
                    onChange={(e) => setAutoDialEnabled(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500 ml-0.5 cursor-pointer"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Upload leads spreadsheet to an existing batch"
                >
                  <UploadCloud size={12} className="text-slate-400" />
                  <span>Upload Leads</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    refetchQueue();
                    refetchBatches();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                  title="Sync Queue"
                >
                  <RefreshCw size={12} className={isLoadingQueue ? 'animate-spin' : ''} />
                  <span>Sync Queue</span>
                </button>
              </div>
            </div>

            {/* VA Single-Lead Focus Card */}
            <VaFocusCard
              lead={queueData.leads[0]}
              onDisposition={(params) => dispositionMutation.mutate(params)}
              isSubmitting={dispositionMutation.isPending}
              onRefreshQueue={() => {
                refetchQueue();
                refetchBatches();
              }}
              onOpenUpload={() => setIsUploadModalOpen(true)}
            />

            {/* Scheduled Callbacks Due (Priority Queue) */}
            {queueData.scheduledCallbacks && queueData.scheduledCallbacks.length > 0 && (
              <div className="max-w-2xl mx-auto bg-white border border-blue-200 rounded-3xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-600" /> Scheduled Callbacks Due ({queueData.scheduledCallbacks.length})
                  </span>
                  <span className="text-[10px] text-blue-600 font-mono font-bold uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Priority Outreach
                  </span>
                </div>
                <div className="space-y-2">
                  {queueData.scheduledCallbacks.map((cb: any) => (
                    <div key={cb.id} className="flex items-center justify-between bg-blue-50/50 hover:bg-blue-50 rounded-2xl p-3 border border-blue-100 text-xs transition">
                      <div>
                        <div className="font-bold text-slate-900">{cb.companyName}</div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {cb.contactPerson} • <span className="font-mono font-semibold text-slate-800">{cb.phone}</span>
                          {cb.callbackTime && <span className="text-blue-700 ml-1.5 font-bold">({cb.callbackTime})</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCallLead(cb)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                        >
                          <PhoneCall size={12} />
                          <span>Dial</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDispositionLead(cb)}
                          className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition"
                          title="Log Outcome"
                        >
                          <ClipboardCheck size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        /* 2. UPPER MANAGEMENT WORKFLOW: BATCH CONTAINERS DASHBOARD OR DRILLDOWN / GLOBAL LEDGER */
        managementViewMode === 'BATCHES' ? (
          <ManagementBatchDashboard
            batches={managementBatches}
            isLoading={isLoadingBatches}
            onInspectBatch={(batchId: string) => {
              setInspectedBatchId(batchId);
              setManagementViewMode('DRILLDOWN');
              setActiveTab(isDispatcher ? 'dispatcher' : 'all');
              setCurrentPage(1);
            }}
            onOpenGlobalLedger={() => {
              setInspectedBatchId(null);
              setManagementViewMode('GLOBAL');
              setActiveTab(isDispatcher ? 'dispatcher' : 'all');
              setCurrentPage(1);
            }}
            onStartBatch={(id) => startBatchByIdMutation.mutate(id)}
            onCloseBatch={(id) => closeBatchMutation.mutate(id)}
            onDistributeBatch={isAdminOrGm ? () => distributeMutation.mutate() : undefined}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onRefresh={refetchBatchesMgmt}
            isAdmin={isAdminOrGm}
          />
        ) : (
          <div className="space-y-4">
            {/* Breadcrumb Navigation & Batch Metadata Strip */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setManagementViewMode('BATCHES');
                    setInspectedBatchId(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Back to Batches Dashboard</span>
                </button>
                <div className="h-5 w-px bg-slate-200" />
                <div>
                  {managementViewMode === 'DRILLDOWN' && inspectedBatch ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">{countryFlags[inspectedBatch.countryCode] || '🌐'}</span>
                      <span className="font-bold text-slate-900 text-sm">{inspectedBatch.batchName}</span>
                      <span className="text-xs text-slate-500 font-mono">({inspectedBatch.countryCode})</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        inspectedBatch.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                        inspectedBatch.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {inspectedBatch.status}
                      </span>
                      <span className="text-xs text-slate-500">
                        • {inspectedBatch.totalLeads} total leads ({inspectedBatch.unassignedLeads} unassigned)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-base">🌐</span>
                      <span className="font-bold text-slate-900 text-sm">Global Master Ledger</span>
                      <span className="text-xs text-slate-500">(All Batches & Regions)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refetchAll}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  title="Refresh Leads"
                >
                  <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Batch-Specific Metrics Cards (or Global if inspecting all) */}
            <LeadCommandCenter
              country={inspectedBatch?.countryCode || country}
              batch={managementViewMode === 'DRILLDOWN' ? inspectedBatch : null}
              isAdminOrGm={isAdminOrGm}
              isDispatcher={isDispatcher}
              onSelectTab={(tab) => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
            />

            {/* Upper Management Lifecycle Pipeline Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 overflow-x-auto">
              {getAllowedPipelineTabs(user?.role).map((tab) => {
                const label = TAB_LABELS[tab] || tab;
                const Icon = 
                  tab === 'unassigned' ? Layers :
                  tab === 'assigned' ? PhoneCall :
                  tab === 'callbacks' ? Calendar :
                  tab === 'dispatcher' ? Truck :
                  tab === 'approval' ? ShieldCheck :
                  tab === 'converted' ? ClipboardCheck :
                  tab === 'disqualified' ? XCircle : Layers;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => handleTabChange(tab)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      activeTab === tab
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search & Filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search company, contact, phone, email, units..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

      {/* Main Leads Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-slate-500">Loading pool records...</div>
        ) : displayLeads.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No leads found in this pool</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No leads match the selected filter in this region.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {activeTab === 'unassigned' ? (
                    <>
                      <th className="py-3 px-4">Company & Units</th>
                      <th className="py-3 px-4">Campaign Batch</th>
                      <th className="py-3 px-4">Contact Person</th>
                      <th className="py-3 px-4">Phone & Emails</th>
                      <th className="py-3 px-4">Priority & Ingested</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </>
                  ) : activeTab === 'assigned' ? (
                    <>
                      <th className="py-3 px-4">Company & Units</th>
                      <th className="py-3 px-4">Contact & Leadership</th>
                      <th className="py-3 px-4">Phone & Emails</th>
                      <th className="py-3 px-4">Assigned VA / Caller</th>
                      <th className="py-3 px-4">Outreach Outcome</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </>
                  ) : activeTab === 'callbacks' ? (
                    <>
                      <th className="py-3 px-4">Company & Units</th>
                      <th className="py-3 px-4">Contact Person</th>
                      <th className="py-3 px-4">Phone & Communications</th>
                      <th className="py-3 px-4">Scheduled Callback Time</th>
                      <th className="py-3 px-4">Assigned Agent</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </>
                  ) : activeTab === 'dispatcher' ? (
                    <>
                      <th className="py-3 px-4">Company & Fleet Scale</th>
                      <th className="py-3 px-4">Tires & Specs</th>
                      <th className="py-3 px-4">Trial Work Order</th>
                      <th className="py-3 px-4">Dispatcher Feasibility Notes</th>
                      <th className="py-3 px-4">Assigned Staff</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </>
                  ) : activeTab === 'approval' ? (
                    <>
                      <th className="py-3 px-4">Company & Fleet Scale</th>
                      <th className="py-3 px-4">Leadership & Signing Authority</th>
                      <th className="py-3 px-4">Trial Verification Proof</th>
                      <th className="py-3 px-4">Tires & Unit Details</th>
                      <th className="py-3 px-4">Onboarding Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </>
                  ) : activeTab === 'converted' ? (
                    <>
                      <th className="py-3 px-4">Company & Fleet Code</th>
                      <th className="py-3 px-4">Fleet Units Onboarded</th>
                      <th className="py-3 px-4">Contact & Leadership</th>
                      <th className="py-3 px-4">Phone & Emails</th>
                      <th className="py-3 px-4">Conversion Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </>
                  ) : activeTab === 'disqualified' ? (
                    <>
                      <th className="py-3 px-4">Company & Units</th>
                      <th className="py-3 px-4">Contact & Phone</th>
                      <th className="py-3 px-4">Disqualification Reason</th>
                      <th className="py-3 px-4">Audit Notes & Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-4">Company & Fleet Scale</th>
                      <th className="py-3 px-4">Decision Makers & Contacts</th>
                      <th className="py-3 px-4">Phone & Communications</th>
                      <th className="py-3 px-4">Assignment Status</th>
                      <th className="py-3 px-4">Pipeline Stage & Outcome</th>
                      <th className="py-3 px-4">Campaign Batch & Ingested</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayLeads.map((lead) => {
                  const isConverted = lead.stage === 'CONVERTED';
                  const isDisqualified = lead.stage === 'DISQUALIFIED';

                  // TAB: ALL LEADS (MASTER LEDGER - ASSIGNED & UNASSIGNED)
                  if (activeTab === 'all') {
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                        {/* 1. Company & Fleet Scale */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{countryFlags[lead.countryCode] || '🌐'}</span>
                            <span className="font-bold text-slate-900 text-sm">{lead.companyName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {lead.numberOfUnits ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                <Truck size={10} />
                                <span>{lead.numberOfUnits} Units</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Scale pending</span>
                            )}
                            {lead.website && (
                              <a
                                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-blue-600 hover:underline font-medium"
                              >
                                Web
                              </a>
                            )}
                          </div>
                        </td>

                        {/* 2. Decision Makers & Leadership */}
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <div className="text-slate-900">{lead.contactPerson}</div>
                          {(lead.fleetManager || lead.ceoOwnerName) && (
                            <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                              {lead.fleetManager && <span>FM: {lead.fleetManager}</span>}
                              {lead.fleetManager && lead.ceoOwnerName && <span> • </span>}
                              {lead.ceoOwnerName && <span>CEO: {lead.ceoOwnerName}</span>}
                            </div>
                          )}
                        </td>

                        {/* 3. Phone & Communications */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-800">{lead.phone}</div>
                          {lead.altPhone && (
                            <div className="text-[10px] text-slate-500 font-mono">Alt: {lead.altPhone}</div>
                          )}
                          {lead.email && (
                            <div className="text-[11px] text-slate-500 truncate max-w-[170px]" title={lead.email}>
                              {lead.email}
                            </div>
                          )}
                          {lead.poaEmail && (
                            <div className="text-[10px] text-amber-700 font-semibold truncate max-w-[170px]" title="POA Billing Email">
                              POA: {lead.poaEmail}
                            </div>
                          )}
                        </td>

                        {/* 4. Assignment Status (Assigned vs Unassigned) */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            {lead.assignedAgent ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                <span>Agent: {lead.assignedAgent.fullName}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <span>Unassigned (Cold Pool)</span>
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              Uploaded by: {lead.uploadedBy?.fullName || 'System'}
                            </span>
                          </div>
                        </td>

                        {/* 5. Pipeline Stage & Outcome */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                isConverted
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : isDisqualified
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : lead.stage === 'AGENT_CALLBACK'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : lead.stage === 'ADMIN_APPROVAL'
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {lead.stage?.replace(/_/g, ' ')}
                            </span>

                            {lead.disposition && (
                              <span className="text-[10px] font-semibold text-slate-600">
                                Outcome: {lead.disposition.replace(/_/g, ' ')}
                              </span>
                            )}

                            {lead.callbackDate && (
                              <span className="text-[10px] font-semibold text-blue-700 flex items-center gap-1">
                                <Calendar size={10} />
                                <span>{lead.callbackDay || 'Callback'}: {lead.callbackTime || new Date(lead.callbackDate).toLocaleDateString()}</span>
                              </span>
                            )}

                            {isDisqualified && lead.disqualificationReason && (
                              <span className="text-[10px] text-rose-600 font-semibold">
                                {lead.disqualificationReason.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Campaign Batch & Ingested */}
                        <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                          <div className="font-semibold text-slate-800 truncate max-w-[140px]" title={lead.batch?.batchName || 'General'}>
                            {lead.batch?.batchName || 'General Batch'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        {/* 7. Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCallLead(lead)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                              title="Dial Lead"
                            >
                              <PhoneCall size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedDispositionLead(lead)}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                              title="Log Call Outcome"
                            >
                              <ClipboardCheck size={13} />
                            </button>
                            {isAdminOrGm && !isConverted && (
                              <button
                                type="button"
                                onClick={() => setConvertingLead(lead)}
                                className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] transition cursor-pointer"
                                title="Convert to Active Contracted Fleet Account"
                              >
                                Convert Fleet
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleWhatsAppChat(lead)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                              title="WhatsApp Chat"
                            >
                              <MessageSquare size={13} />
                            </button>
                            {!isDisqualified && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDisqualifyingLead(lead);
                                  setDisqualificationCategory('NOT_INTERESTED');
                                  setDisqualificationText('');
                                }}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                                title="Disqualify Lead"
                              >
                                <XCircle size={13} />
                              </button>
                            )}
                            {isDisqualified && (
                              <button
                                type="button"
                                onClick={() => reactivateMutation.mutate(lead.id)}
                                disabled={reactivateMutation.isPending}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                                title="Reactivate Lead"
                              >
                                <RefreshCw size={13} className={reactivateMutation.isPending ? 'animate-spin' : ''} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // TAB 1: UNASSIGNED LEADS
                  if (activeTab === 'unassigned') {
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{lead.companyName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {lead.numberOfUnits ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                <Truck size={10} />
                                <span>{lead.numberOfUnits} Units</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">NOU pending</span>
                            )}
                            {lead.website && (
                              <a
                                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-blue-600 hover:underline"
                              >
                                Web
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {lead.batch?.batchName ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              <Layers size={11} className="text-slate-500" />
                              <span className="truncate max-w-[170px]">{lead.batch.batchName}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Direct Ingestion</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <div>{lead.contactPerson}</div>
                          {(lead.fleetManager || lead.ceoOwnerName) && (
                            <div className="text-[10px] text-slate-500 font-normal">
                              {lead.fleetManager && <span>FM: {lead.fleetManager}</span>}
                              {lead.fleetManager && lead.ceoOwnerName && <span> • </span>}
                              {lead.ceoOwnerName && <span>CEO: {lead.ceoOwnerName}</span>}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-800">{lead.phone}</div>
                          {lead.altPhone && (
                            <div className="text-[10px] text-slate-500 font-mono">Alt: {lead.altPhone}</div>
                          )}
                          {lead.email && <div className="text-[11px] text-slate-500 truncate max-w-[170px]">{lead.email}</div>}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              P{lead.priority}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(lead.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-[10px] text-emerald-700 font-semibold mt-1">Ready for VA</div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCallLead(lead)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                              title="Dial Lead"
                            >
                              <PhoneCall size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedDispositionLead(lead)}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                              title="Log Call Outcome"
                            >
                              <ClipboardCheck size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDisqualifyingLead(lead);
                                setDisqualificationCategory('NOT_INTERESTED');
                                setDisqualificationText('');
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                              title="Disqualify Lead"
                            >
                              <XCircle size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // TAB 2: ASSIGNED / IN-PROGRESS OUTREACH
                  if (activeTab === 'assigned') {
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{lead.companyName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {lead.numberOfUnits ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                <Truck size={10} />
                                <span>{lead.numberOfUnits} Units</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">NOU pending</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <div>{lead.contactPerson}</div>
                          {(lead.fleetManager || lead.ceoOwnerName) && (
                            <div className="text-[10px] text-slate-500 font-normal">
                              {lead.fleetManager && <span>FM: {lead.fleetManager}</span>}
                              {lead.fleetManager && lead.ceoOwnerName && <span> • </span>}
                              {lead.ceoOwnerName && <span>CEO: {lead.ceoOwnerName}</span>}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-800">{lead.phone}</div>
                          {lead.email && <div className="text-[11px] text-slate-500 truncate max-w-[170px]">{lead.email}</div>}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                          {lead.assignedAgent ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                              VA: {lead.assignedAgent.fullName}
                            </span>
                          ) : (
                            <span className="text-slate-400">Unassigned Caller</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            {lead.disposition ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
                                {lead.disposition.replace(/_/g, ' ')}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-blue-50 text-blue-800 border-blue-200">
                                In Calling Queue
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCallLead(lead)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                              title="Dial Lead"
                            >
                              <PhoneCall size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedDispositionLead(lead)}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                              title="Log Call Outcome"
                            >
                              <ClipboardCheck size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleWhatsAppChat(lead)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                              title="WhatsApp Chat"
                            >
                              <MessageSquare size={13} />
                            </button>
                            {canPerformPipelineAction(user?.role, 'DISQUALIFY_LEAD') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDisqualifyingLead(lead);
                                  setDisqualificationCategory('NOT_INTERESTED');
                                  setDisqualificationText('');
                                }}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                                title="Disqualify Lead"
                              >
                                <XCircle size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // TAB: CALLBACKS (AGENT PRIORITY)
                  if (activeTab === 'callbacks') {
                    const isOverdue = lead.callbackDate && new Date(lead.callbackDate) <= new Date();
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{lead.companyName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {lead.numberOfUnits ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                <Truck size={10} />
                                <span>{lead.numberOfUnits} Units</span>
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <div>{lead.contactPerson}</div>
                          {(lead.fleetManager || lead.ceoOwnerName) && (
                            <div className="text-[10px] text-slate-500 font-normal">
                              {lead.fleetManager && <span>FM: {lead.fleetManager}</span>}
                              {lead.fleetManager && lead.ceoOwnerName && <span> • </span>}
                              {lead.ceoOwnerName && <span>CEO: {lead.ceoOwnerName}</span>}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-800">{lead.phone}</div>
                          {lead.email && <div className="text-[11px] text-slate-500 truncate max-w-[170px]">{lead.email}</div>}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isOverdue 
                                ? 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse' 
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                              <Calendar size={10} />
                              <span>{lead.callbackDay || 'Due'}: {lead.callbackTime || (lead.callbackDate ? new Date(lead.callbackDate).toLocaleDateString() : 'Scheduled')}</span>
                            </span>
                            {isOverdue && (
                              <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider">
                                Overdue Callback
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                          {lead.assignedAgent ? (
                            <span className="font-bold text-slate-800">Agent: {lead.assignedAgent.fullName}</span>
                          ) : (
                            <span className="text-amber-700 font-medium">Unassigned (Open Pool)</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCallLead(lead)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                              title="Dial Callback"
                            >
                              <PhoneCall size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedDispositionLead(lead)}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                              title="Log Call Outcome"
                            >
                              <ClipboardCheck size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleWhatsAppChat(lead)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                              title="WhatsApp Chat"
                            >
                              <MessageSquare size={13} />
                            </button>
                            {canPerformPipelineAction(user?.role, 'DISQUALIFY_LEAD') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDisqualifyingLead(lead);
                                  setDisqualificationCategory('NOT_INTERESTED');
                                  setDisqualificationText('');
                                }}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                                title="Disqualify Lead"
                              >
                                <XCircle size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // TAB: DISPATCHER REVIEW QUEUE
                  if (activeTab === 'dispatcher') {
                    const latestTrial = lead.testServices && lead.testServices.length > 0 ? lead.testServices[0] : null;
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{lead.companyName}</div>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            {lead.contactPerson} • <span className="font-mono text-slate-800 font-semibold">{lead.phone}</span>
                          </div>
                          {lead.numberOfUnits && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 mt-1">
                              <Truck size={10} />
                              <span>{lead.numberOfUnits} Units</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {lead.commonTireSizes ? (
                              <div className="font-mono font-bold text-slate-800 text-[11px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded inline-block">
                                {lead.commonTireSizes}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">Tires pending</span>
                            )}
                            {lead.vehicleTypes && (
                              <div className="text-[10px] text-slate-500 font-medium">
                                {lead.vehicleTypes}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {latestTrial ? (
                            <div className="flex flex-col gap-1 items-start">
                              <span className="font-mono font-bold text-[10px] text-purple-900 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                                {latestTrial.jobCode}
                              </span>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                latestTrial.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                latestTrial.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {latestTrial.status}
                              </span>
                              {latestTrial.driver && (
                                <div className="text-[10px] text-slate-500">
                                  Tech: <span className="font-semibold text-slate-700">{latestTrial.driver.fullName}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No trial work order</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {lead.dispatcherNotes ? (
                            <div className="max-w-[200px]">
                              <p className="text-[11px] text-slate-700 line-clamp-2 italic" title={lead.dispatcherNotes}>
                                &quot;{lead.dispatcherNotes}&quot;
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNotesLead(lead);
                                  setDispatcherNotesText(lead.dispatcherNotes || '');
                                }}
                                className="text-[10px] text-purple-700 hover:underline font-bold mt-0.5 cursor-pointer"
                              >
                                Edit note
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNotesLead(lead);
                                setDispatcherNotesText('');
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-700 text-[10px] font-bold border border-slate-200 transition cursor-pointer"
                            >
                              <Edit3 size={10} />
                              <span>Add Feasibility Note</span>
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                          {lead.assignedDispatcher ? (
                            <span className="font-bold text-purple-900 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md text-[10px]">
                              {lead.assignedDispatcher.fullName}
                            </span>
                          ) : (
                            <span className="text-slate-400">Unassigned Dispatcher</span>
                          )}
                          <div className="text-[10px] text-slate-400 mt-1">
                            From: {lead.uploadedBy?.fullName || 'VA Outreach'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleCallLead(lead)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                              title="Dial Lead"
                            >
                              <PhoneCall size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedDispositionLead(lead)}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                              title="Log Call Outcome"
                            >
                              <ClipboardCheck size={13} />
                            </button>

                            {canPerformPipelineAction(user?.role, 'BOOK_TRIAL_JOB') && (
                              <button
                                type="button"
                                onClick={() => setTestServiceLead(lead)}
                                className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Book Feasibility Trial Service Job"
                              >
                                <Wrench size={11} />
                                <span>Trial Job</span>
                              </button>
                            )}

                            {canPerformPipelineAction(user?.role, 'ADVANCE_TO_GM_SIGNOFF') && (
                              <button
                                type="button"
                                onClick={() => advanceStageMutation.mutate({ id: lead.id, stage: 'ADMIN_APPROVAL' })}
                                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Feasibility verified: Advance to GM Signoff"
                              >
                                <ShieldCheck size={11} />
                                <span>GM Signoff</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleWhatsAppChat(lead)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                              title="WhatsApp Chat"
                            >
                              <MessageSquare size={13} />
                            </button>

                            {canPerformPipelineAction(user?.role, 'DISQUALIFY_LEAD') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDisqualifyingLead(lead);
                                  setDisqualificationCategory('OUT_OF_SERVICE_AREA');
                                  setDisqualificationText('');
                                }}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                                title="Disqualify Lead (e.g. Infeasible, Out of Service Area)"
                              >
                                <XCircle size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // TAB: GM / ADMIN APPROVAL
                  if (activeTab === 'approval') {
                    const latestTrial = lead.testServices && lead.testServices.length > 0 ? lead.testServices[0] : null;
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{lead.companyName}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Ingested: {new Date(lead.createdAt).toLocaleDateString()}
                          </div>
                          {lead.numberOfUnits && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 mt-1">
                              <Truck size={10} />
                              <span>{lead.numberOfUnits} Units</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <div>{lead.contactPerson}</div>
                          {lead.poaEmail && (
                            <div className="text-[10px] text-amber-700 font-semibold truncate max-w-[170px]" title="POA Billing Email">
                              POA: {lead.poaEmail}
                            </div>
                          )}
                          <div className="font-mono text-slate-700 text-xs mt-0.5">{lead.phone}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          {latestTrial ? (
                            <div className="flex flex-col gap-1 items-start">
                              <span className="font-mono font-bold text-[10px] text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                Trial: {latestTrial.jobCode}
                              </span>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                                latestTrial.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {latestTrial.status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              Direct Feasibility Verified
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-800 text-[11px]">
                            {lead.commonTireSizes || 'Standard Fleet Sizes'}
                          </div>
                          {lead.dispatcherNotes && (
                            <p className="text-[10px] text-slate-600 line-clamp-1 italic mt-0.5">
                              Note: {lead.dispatcherNotes}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-900 border border-purple-200 flex items-center gap-1 w-max">
                            <ShieldCheck size={11} />
                            <span>Awaiting Onboarding</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canPerformPipelineAction(user?.role, 'CONVERT_FLEET') && (
                              <button
                                type="button"
                                onClick={() => setConvertingLead(lead)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Execute contract & convert to active B2B Fleet"
                              >
                                <ClipboardCheck size={13} />
                                <span>Convert Fleet</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCallLead(lead)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                              title="Dial Lead"
                            >
                              <PhoneCall size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleWhatsAppChat(lead)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                              title="WhatsApp Chat"
                            >
                              <MessageSquare size={13} />
                            </button>
                            {canPerformPipelineAction(user?.role, 'DISQUALIFY_LEAD') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDisqualifyingLead(lead);
                                  setDisqualificationCategory('NOT_INTERESTED');
                                  setDisqualificationText('');
                                }}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                                title="Disqualify Lead"
                              >
                                <XCircle size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // TAB 3: DISQUALIFIED AUDIT
                  if (activeTab === 'disqualified') {
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{lead.companyName}</div>
                          {lead.numberOfUnits && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              {lead.numberOfUnits} Units
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <div>{lead.contactPerson}</div>
                          <div className="font-mono text-xs text-slate-600 mt-0.5">{lead.phone}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-rose-50 text-rose-800 border-rose-200">
                            {lead.disqualificationReason ? lead.disqualificationReason.replace(/_/g, ' ') : 'NOT INTERESTED'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                          {lead.disqualifiedNotes ? (
                            <p className="text-slate-700 italic max-w-xs">{lead.disqualifiedNotes}</p>
                          ) : (
                            <span className="text-slate-400">No audit notes</span>
                          )}
                          <div className="text-[10px] text-slate-400 font-mono mt-1">
                            Logged: {new Date(lead.updatedAt).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => reactivateMutation.mutate(lead.id)}
                            disabled={reactivateMutation.isPending}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition cursor-pointer inline-flex items-center gap-1 shadow-xs disabled:opacity-50"
                            title="Reactivate lead back into unassigned pool"
                          >
                            <RefreshCw size={11} className={reactivateMutation.isPending ? 'animate-spin' : ''} />
                            <span>Reactivate Lead</span>
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  // TAB 4: CONVERTED FLEETS
                  if (activeTab === 'converted') {
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{lead.companyName}</div>
                          {lead.resultingFleet?.fleetCode ? (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-lg text-[10px] mt-0.5">
                              Fleet: {lead.resultingFleet.fleetCode}
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-semibold">Converted</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            <Truck size={12} className="text-slate-600" />
                            <span>{lead.numberOfUnits || 0} Units Onboarded</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <div>{lead.contactPerson}</div>
                          {lead.fleetManager && (
                            <div className="text-[10px] text-slate-500">FM: {lead.fleetManager}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-800">{lead.phone}</div>
                          {lead.email && <div className="text-[11px] text-slate-500 truncate max-w-[170px]">{lead.email}</div>}
                          {lead.poaEmail && (
                            <div className="text-[10px] text-amber-700 font-semibold truncate max-w-[170px]">
                              POA: {lead.poaEmail}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                          <div className="font-mono font-semibold text-slate-700">
                            {new Date(lead.updatedAt).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-slate-400">Won Agreement</div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <a
                            href={`/fleets?search=${encodeURIComponent(lead.resultingFleet?.fleetCode || lead.companyName)}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] transition"
                          >
                            <span>View Fleet Profile</span>
                          </a>
                        </td>
                      </tr>
                    );
                  }

                  // Default Fallback Table Row for Legacy / Staff Tabs
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                      {/* Column 1: Company & Units */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{lead.companyName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {lead.numberOfUnits ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              <Truck size={10} />
                              <span>{lead.numberOfUnits} Units</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">NOU pending</span>
                          )}
                          {lead.website && (
                            <a
                              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-600 hover:underline"
                            >
                              Web
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Column 2: Contact Person, Fleet Manager, CEO */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <div>{lead.contactPerson}</div>
                        {(lead.fleetManager || lead.ceoOwnerName) && (
                          <div className="text-[10px] text-slate-500 font-normal">
                            {lead.fleetManager && <span>FM: {lead.fleetManager}</span>}
                            {lead.fleetManager && lead.ceoOwnerName && <span> • </span>}
                            {lead.ceoOwnerName && <span>CEO: {lead.ceoOwnerName}</span>}
                          </div>
                        )}
                      </td>

                      {/* Column 3: Phone, Alt Phone, Email, POA Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-800">{lead.phone}</div>
                        {lead.altPhone && (
                          <div className="text-[10px] text-slate-500 font-mono">Alt: {lead.altPhone}</div>
                        )}
                        {lead.email && <div className="text-[11px] text-slate-500 truncate max-w-[170px]">{lead.email}</div>}
                        {lead.poaEmail && (
                          <div className="text-[10px] text-amber-700 font-semibold truncate max-w-[170px]" title="Power of Attorney Billing Email">
                            POA: {lead.poaEmail}
                          </div>
                        )}
                      </td>

                      {/* Column 4: Stage & Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              isConverted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : isDisqualified
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : lead.stage === 'DISPATCHER_REVIEW'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : lead.stage === 'AGENT_CALLBACK'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {lead.stage?.replace('_', ' ')}
                          </span>

                          {isConverted && lead.resultingFleet?.fleetCode && (
                            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-1.5 py-0.5 rounded">
                              Fleet: {lead.resultingFleet.fleetCode}
                            </span>
                          )}

                          {lead.callbackDate && (
                            <span className="text-[10px] font-medium text-blue-700 flex items-center gap-1">
                              <Calendar size={10} />
                              <span>{lead.callbackDay || 'Callback'}: {lead.callbackTime || 'Scheduled'}</span>
                            </span>
                          )}

                          {isDisqualified && lead.disqualificationReason && (
                            <span className="text-[10px] text-rose-600 font-semibold">
                              Reason: {lead.disqualificationReason.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 5: Staff Handover Chain */}
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        <div>VA: {lead.uploadedBy?.fullName || 'System'}</div>
                        {lead.assignedAgent && (
                          <div className="text-[10px] text-slate-500">Agent: {lead.assignedAgent.fullName}</div>
                        )}
                        {lead.assignedDispatcher && (
                          <div className="text-[10px] text-purple-700 font-semibold">Dispatcher: {lead.assignedDispatcher.fullName}</div>
                        )}
                      </td>

                      {/* Column 6: Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCallLead(lead)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                            title="Dial Prospect"
                          >
                            <PhoneCall size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedDispositionLead(lead)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                            title="Log Call Outcome (Triggers Replenishment)"
                          >
                            <ClipboardCheck size={13} />
                          </button>

                          {isAdminOrGm && !isConverted && !isDisqualified && (
                            <>
                              <button
                                type="button"
                                onClick={() => setTestServiceLead(lead)}
                                className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                                title="Book Feasibility Trial Service (Admin / GM Only)"
                              >
                                <Wrench size={11} />
                                <span>Trial Job</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => advanceStageMutation.mutate({ id: lead.id, stage: 'ADMIN_APPROVAL' })}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] transition cursor-pointer"
                                title="Advance to GM / Admin Signoff"
                              >
                                GM Signoff
                              </button>
                            </>
                          )}

                          {isAdminOrGm && !isConverted && !isDisqualified && (
                            <button
                              type="button"
                              onClick={() => setConvertingLead(lead)}
                              className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] transition cursor-pointer"
                              title="Convert to Active Contracted Fleet Account"
                            >
                              Convert Fleet
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleWhatsAppChat(lead)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                            title="WhatsApp Chat"
                          >
                            <MessageSquare size={13} />
                          </button>

                          {!isDisqualified && !isConverted && (
                            <button
                              type="button"
                              onClick={() => {
                                setDisqualifyingLead(lead);
                                setDisqualificationCategory('NOT_INTERESTED');
                                setDisqualificationText('');
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                              title="Disqualify Lead"
                            >
                              <XCircle size={13} />
                            </button>
                          )}

                          {isDisqualified && (isAdminOrGm || isAgent || isVa) && (
                            <button
                              type="button"
                              onClick={() => reactivateMutation.mutate(lead.id)}
                              disabled={reactivateMutation.isPending}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                              title="Reactivate lead back into outreach queue"
                            >
                              <RefreshCw size={11} className={reactivateMutation.isPending ? 'animate-spin' : ''} />
                              <span>Reactivate</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Server-Side Pagination Bar */}
      {pagination.total > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="text-slate-600 flex items-center gap-2">
            <span>
              Showing <strong className="font-mono text-slate-900">{(pagination.page - 1) * pagination.limit + 1}</strong> to{' '}
              <strong className="font-mono text-slate-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of{' '}
              <strong className="font-mono text-slate-900">{pagination.total}</strong> records
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-[11px] font-medium">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Previous & Next Page Navigation */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1 || isLoading}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
              </button>

              <span className="px-2.5 py-1 text-slate-700 font-mono font-bold text-xs">
                Page {currentPage} of {pagination.totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                disabled={currentPage >= pagination.totalPages || isLoading}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
          </div>
        )
      )}

      {/* Trial Service Booking Modal (Admin & GM Exclusive) */}
      <TrialServiceModal
        lead={testServiceLead}
        isOpen={!!testServiceLead}
        onClose={() => setTestServiceLead(null)}
        onSubmit={(payload) => {
          createTestServiceMutation.mutate({
            id: payload.id,
            data: payload.data,
          });
        }}
        isPending={createTestServiceMutation.isPending}
      />

      {/* Disqualification Modal */}
      {disqualifyingLead && (
        <Modal
          isOpen={!!disqualifyingLead}
          onClose={() => setDisqualifyingLead(null)}
          title={`Disqualify Lead — ${disqualifyingLead.companyName}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Root Cause Category *</label>
              <select
                value={disqualificationCategory}
                onChange={(e) => setDisqualificationCategory(e.target.value as DisqualificationReason)}
                className="input-field"
              >
                <option value="NOT_INTERESTED">Not Interested</option>
                <option value="WRONG_NUMBER">Wrong Number / Inactive</option>
                <option value="OUT_OF_SERVICE_AREA">Out of Service Area</option>
                <option value="COMPETITOR_LOCKED">Locked into Competitor Contract</option>
                <option value="FLEET_TOO_SMALL">Fleet Too Small (&lt; 3 Units)</option>
                <option value="NO_COMMERCIAL_FLEET">No Commercial Fleet (Personal Vehicles)</option>
                <option value="CREDIT_TERMS_REJECTED">Credit / Terms Rejected</option>
                <option value="OTHER">Other Operational Constraint</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Audit Notes & Reason Details</label>
              <textarea
                rows={3}
                placeholder="Specific feedback from prospect..."
                value={disqualificationText}
                onChange={(e) => setDisqualificationText(e.target.value)}
                className="input-field resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDisqualifyingLead(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={disqualifyMutation.isPending}
                onClick={() => {
                  disqualifyMutation.mutate({
                    id: disqualifyingLead.id,
                    reason: disqualificationCategory,
                    notes: disqualificationText,
                  });
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                {disqualifyMutation.isPending ? 'Logging...' : 'Confirm Disqualification'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Dispatcher Feasibility Notes Modal */}
      {editingNotesLead && (
        <Modal
          isOpen={!!editingNotesLead}
          onClose={() => setEditingNotesLead(null)}
          title={`Dispatcher Feasibility Assessment — ${editingNotesLead.companyName}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-3.5 text-xs">
            <p className="text-slate-500">
              Record logistical constraints, route coverage notes, fleet tire specs, or dispatch requirements before trial service or GM signoff.
            </p>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Feasibility & Operational Notes</label>
              <textarea
                rows={4}
                placeholder="E.g., Requires 22.5 commercial drive tires, located in north corridor zone 2, dock access available after 4 PM..."
                value={dispatcherNotesText}
                onChange={(e) => setDispatcherNotesText(e.target.value)}
                className="input-field resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingNotesLead(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateDispatcherNotesMutation.isPending}
                onClick={() => {
                  updateDispatcherNotesMutation.mutate({
                    id: editingNotesLead.id,
                    dispatcherNotes: dispatcherNotesText,
                  });
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                {updateDispatcherNotesMutation.isPending ? 'Saving...' : 'Save Feasibility Notes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Fleet Account Conversion Modal */}
      <ConvertFleetModal
        lead={convertingLead}
        isOpen={!!convertingLead}
        onClose={() => setConvertingLead(null)}
        onConvert={(params) => {
          convertMutation.mutate({
            id: params.id,
            customFleetCode: params.customFleetCode,
            extraData: {
              discountPercent: params.discountPercent,
              ...params.extraData,
            },
          });
        }}
        isPending={convertMutation.isPending}
      />



      {/* Call Disposition Modal */}
      <DispositionModal
        lead={selectedDispositionLead}
        isOpen={!!selectedDispositionLead}
        onClose={() => setSelectedDispositionLead(null)}
        onSubmit={(payload) => {
          dispositionMutation.mutate({
            id: payload.id,
            disposition: payload.disposition,
            notes: payload.notes,
            callbackData: payload.callbackData,
          });
        }}
        isPending={dispositionMutation.isPending}
      />

      {/* Spreadsheet Upload Modal */}
      <UploadSpreadsheetModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        defaultCountry={country}
        defaultBatchId={selectedBatchId || inspectedBatchId}
      />
    </div>
  );
}
