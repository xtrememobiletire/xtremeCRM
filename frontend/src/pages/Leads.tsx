import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  PhoneCall, 
  MessageSquare, 
  Plus, 
  Search, 
  RefreshCw, 
  Truck, 
  ClipboardCheck, 
  Play, 
  Calendar, 
  Zap, 
  Wrench, 
  XCircle, 
  Share2, 
  Layers
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  leadService, 
  type Lead, 
  type LeadStage, 
  type DisqualificationReason 
} from '../services/leadService';
import { toast } from 'sonner';

type LeadPoolTab = 'va' | 'callbacks' | 'dispatcher' | 'admin' | 'disqualified';

export default function Leads() {
  const { country } = useTenant();
  const { user } = useAuth();
  const { dialOutbound } = useSocket();
  const queryClient = useQueryClient();

  const isVa = user?.role === 'VIRTUAL_ASSISTANT';
  const isAgent = user?.role === 'CALL_AGENT';
  const isDispatcher = user?.role === 'DISPATCHER';
  const isAdminOrGm = ['ADMIN', 'GENERAL_MANAGER'].includes(user?.role || '');

  // Determine initial tab based on role
  const initialTab: LeadPoolTab = isVa
    ? 'va'
    : isAgent
    ? 'callbacks'
    : isDispatcher
    ? 'dispatcher'
    : 'admin';

  const [activeTab, setActiveTab] = useState<LeadPoolTab>(initialTab);

  // Modals & form states
  const [selectedDispositionLead, setSelectedDispositionLead] = useState<Lead | null>(null);
  const [selectedDisposition, setSelectedDisposition] = useState('');
  const [dispositionReason, setDispositionReason] = useState<DisqualificationReason>('NOT_INTERESTED');
  const [dispositionNotes, setDispositionNotes] = useState('');
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackDay, setCallbackDay] = useState('');
  const [callbackTime, setCallbackTime] = useState('');

  // Test service booking modal state
  const [testServiceLead, setTestServiceLead] = useState<Lead | null>(null);
  const [testServiceForm, setTestServiceForm] = useState({
    unitNumber: '',
    tireSizes: '',
    location: '',
    description: '',
    scheduledDate: '',
  });

  // Disqualification modal state
  const [disqualifyingLead, setDisqualifyingLead] = useState<Lead | null>(null);
  const [disqualificationCategory, setDisqualificationCategory] = useState<DisqualificationReason>('NOT_INTERESTED');
  const [disqualificationText, setDisqualificationText] = useState('');

  // Auto-dialer toggle
  const [autoDialEnabled, setAutoDialEnabled] = useState(false);

  // Filters & search
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);

  // Manual push form
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    fleetManager: '',
    ceoOwnerName: '',
    phone: '',
    altPhone: '',
    email: '',
    poaEmail: '',
    address: '',
    website: '',
    numberOfUnits: '',
    notes: '',
    priority: 1,
    countryCode: country,
  });

  // 1. Agent / VA 5-cap queue
  const { data: queueResponse, isLoading: isLoadingQueue, refetch: refetchQueue } = useQuery({
    queryKey: ['agent-queue', country],
    queryFn: () => leadService.getAgentQueue(country),
    enabled: activeTab === 'va',
  });

  const queueData = queueResponse || {
    leads: [],
    scheduledCallbacks: [],
    activeCount: 0,
    maxCapacity: 5,
    unassignedPoolCount: 0,
  };

  // 2. Tab-specific leads query
  const { data: leadsResponse, isLoading: isLoadingLeads, refetch: refetchLeads } = useQuery({
    queryKey: ['leads', country, activeTab, stageFilter, search],
    queryFn: () => leadService.getLeads({
      countryCode: country,
      pool: activeTab,
      stage: stageFilter || undefined,
      search: search || undefined,
      limit: 50,
    }),
    enabled: activeTab !== 'va',
  });

  const tabLeads: Lead[] = leadsResponse?.data || [];
  const displayLeads: Lead[] = activeTab === 'va' ? queueData.leads : tabLeads;
  const isLoading = activeTab === 'va' ? isLoadingQueue : isLoadingLeads;

  const refetchAll = () => {
    if (activeTab === 'va') refetchQueue();
    else refetchLeads();
  };

  // Mutations
  const startBatchMutation = useMutation({
    mutationFn: () => leadService.startBatch(country),
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Campaign batch started! 5 leads assigned.');
      queryClient.invalidateQueries({ queryKey: ['agent-queue'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to start campaign batch');
    },
  });

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
      toast.success('Call outcome recorded! 5-cap slot auto-replenished via pg-boss.');
      setSelectedDispositionLead(null);
      setSelectedDisposition('');
      setDispositionNotes('');
      setCallbackDate('');
      setCallbackDay('');
      setCallbackTime('');
      queryClient.invalidateQueries({ queryKey: ['agent-queue'] });
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
      setTestServiceForm({ unitNumber: '', tireSizes: '', location: '', description: '', scheduledDate: '' });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create trial service job');
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => leadService.convertToFleet(id),
    onSuccess: () => {
      toast.success('Lead converted to Fleet Account! All 10 columns preserved.');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to convert lead');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Lead>) => leadService.createLead(data),
    onSuccess: () => {
      toast.success('Fleet lead pushed successfully!');
      setIsPushModalOpen(false);
      setFormData({
        companyName: '',
        contactPerson: '',
        fleetManager: '',
        ceoOwnerName: '',
        phone: '',
        altPhone: '',
        email: '',
        poaEmail: '',
        address: '',
        website: '',
        numberOfUnits: '',
        notes: '',
        priority: 1,
        countryCode: country,
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to push lead');
    },
  });

  const handleCallLead = (lead: Lead) => {
    dialOutbound(lead.phone, `${lead.companyName} (${lead.contactPerson})`, lead.id);
  };

  const handleWhatsAppChat = (lead: Lead) => {
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hi ${lead.contactPerson}, this is Xtreme Mobile Tire dispatch team regarding fleet tire servicing for ${lead.companyName}. Please find our commercial agreement details here.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.phone) {
      toast.error('Please enter Company Name and Phone');
      return;
    }
    createMutation.mutate({
      ...formData,
      numberOfUnits: formData.numberOfUnits ? Number(formData.numberOfUnits) : undefined,
      countryCode: country as any,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Outbound B2B Fleet Sales & Lead Pools"
        subtitle={`Role-based lead pools for ${country} Region: 5-Cap VA Outreach, Callbacks, Dispatcher Feasibility, and Master Pipeline.`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {isAdminOrGm && (
              <>
                <button
                  type="button"
                  onClick={() => distributeMutation.mutate()}
                  disabled={distributeMutation.isPending}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                  title="Evenly distribute unassigned leads to VAs up to 5 cap"
                >
                  <Share2 size={13} />
                  <span>{distributeMutation.isPending ? 'Distributing...' : 'Distribute to VAs'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => startBatchMutation.mutate()}
                  disabled={startBatchMutation.isPending}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                  title="Assign 5 leads to active outbound callers"
                >
                  <Play size={13} fill="currentColor" />
                  <span>{startBatchMutation.isPending ? 'Starting...' : 'Start Campaign Batch'}</span>
                </button>
              </>
            )}

            {activeTab === 'va' && (
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer select-none">
                <Zap size={13} className={autoDialEnabled ? 'text-amber-500 fill-amber-500' : 'text-slate-400'} />
                <span>Auto-Dialer</span>
                <input
                  type="checkbox"
                  checked={autoDialEnabled}
                  onChange={(e) => setAutoDialEnabled(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 ml-0.5 cursor-pointer"
                />
              </label>
            )}

            <button
              type="button"
              onClick={refetchAll}
              className="btn-secondary px-2.5 py-1.5 cursor-pointer"
              title="Refresh queue"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>

            <button
              type="button"
              onClick={() => setIsPushModalOpen(true)}
              className="btn-primary cursor-pointer flex items-center gap-1.5 text-xs py-1.5"
            >
              <Plus size={14} />
              <span>Push Single Lead</span>
            </button>
          </div>
        }
      />

      {/* Role-Based Lead Pool Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('va')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'va'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Zap size={13} />
          <span>VA Outbound (5 Cap)</span>
          {activeTab === 'va' && queueData.activeCount > 0 && (
            <span className="bg-red-700 text-white px-1.5 py-0.2 rounded-full text-[10px]">
              {queueData.activeCount}/5
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('callbacks')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'callbacks'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Calendar size={13} />
          <span>Agent Callbacks</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dispatcher')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'dispatcher'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Truck size={13} />
          <span>Dispatcher Feasibility</span>
        </button>

        {isAdminOrGm && (
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'admin'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers size={13} />
            <span>Master Pipeline</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('disqualified')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'disqualified'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <XCircle size={13} />
          <span>Disqualification Audit</span>
        </button>
      </div>

      {/* VA 5-Cap Banner (Only shown in 'va' pool) */}
      {activeTab === 'va' && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4 border border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-400 bg-red-950/80 px-2.5 py-0.5 rounded-full border border-red-800">
                5-Cap Dynamic Replenishment
              </span>
              <span className="text-xs text-slate-300">
                Active Slot Load: <strong className="text-white font-bold">{queueData.activeCount} / 5</strong>
              </span>
            </div>
            <div className="text-xs text-slate-300">
              {queueData.unassignedPoolCount > 0 ? (
                <span>
                  🚀 <strong className="text-emerald-400 font-bold">{queueData.unassignedPoolCount} unassigned cold leads</strong> waiting in queue. As you log call outcomes, fresh leads replenish your cap instantly via pg-boss!
                </span>
              ) : (
                <span className="text-slate-400">
                  Unassigned pool is fully distributed. New uploaded leads will feed in automatically.
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => refetchQueue()}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw size={12} className={isLoadingQueue ? 'animate-spin' : ''} />
            <span>Sync Queue</span>
          </button>
        </div>
      )}

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

        {activeTab === 'admin' && (
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-slate-500 font-bold text-[11px] uppercase mr-1">Stage:</span>
            {['', 'VA_OUTREACH', 'AGENT_CALLBACK', 'DISPATCHER_REVIEW', 'ADMIN_APPROVAL', 'CONVERTED'].map((stg) => (
              <button
                key={stg}
                type="button"
                onClick={() => setStageFilter(stg)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  stageFilter === stg
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {stg === '' ? 'All Stages' : stg.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
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
              {activeTab === 'va'
                ? 'Your active 5-cap queue is empty. Click Sync Queue above or wait for auto-distribution.'
                : 'No leads match the selected filter in this region.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Company & Units</th>
                  <th className="py-3 px-4">Contact & Leadership</th>
                  <th className="py-3 px-4">Phone & Emails</th>
                  <th className="py-3 px-4">Stage / Status</th>
                  <th className="py-3 px-4">Attribution / Assigned</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayLeads.map((lead) => {
                  const isConverted = lead.stage === 'CONVERTED';
                  const isDisqualified = lead.stage === 'DISQUALIFIED';

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
                          {/* Dial Button */}
                          <button
                            type="button"
                            onClick={() => handleCallLead(lead)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                            title="Dial Prospect"
                          >
                            <PhoneCall size={13} />
                          </button>

                          {/* Log Outcome / Disposition */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDispositionLead(lead);
                              setSelectedDisposition(lead.disposition || '');
                              setDispositionNotes(lead.notes || '');
                            }}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                            title="Log Call Outcome (Triggers Replenishment)"
                          >
                            <ClipboardCheck size={13} />
                          </button>

                          {/* Dispatcher Actions */}
                          {(activeTab === 'dispatcher' || isDispatcher || isAdminOrGm) && !isConverted && !isDisqualified && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setTestServiceLead(lead);
                                  setTestServiceForm({
                                    unitNumber: '',
                                    tireSizes: lead.commonTireSizes || '',
                                    location: lead.address || '',
                                    description: '',
                                    scheduledDate: '',
                                  });
                                }}
                                className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                                title="Book Trial Service Work Order"
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

                          {/* Admin Conversion Action */}
                          {isAdminOrGm && !isConverted && !isDisqualified && (
                            <button
                              type="button"
                              onClick={() => convertMutation.mutate(lead.id)}
                              className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] transition cursor-pointer"
                              title="Convert to Active Contracted Fleet Account"
                            >
                              Convert Fleet
                            </button>
                          )}

                          {/* WhatsApp Pitch */}
                          <button
                            type="button"
                            onClick={() => handleWhatsAppChat(lead)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                            title="WhatsApp Chat"
                          >
                            <MessageSquare size={13} />
                          </button>

                          {/* Disqualify Button */}
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

      {/* Trial Service Booking Modal */}
      {testServiceLead && (
        <Modal
          isOpen={!!testServiceLead}
          onClose={() => setTestServiceLead(null)}
          title={`Book Feasibility Trial Service — ${testServiceLead.companyName}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-3.5 text-xs">
            <p className="text-slate-600">
              Create an operational roadside work order to verify response time and service compatibility before formal B2B contract execution.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit / Fleet Vehicle #</label>
              <input
                type="text"
                placeholder="e.g. Unit #104 (Freightliner Cascadia)"
                value={testServiceForm.unitNumber}
                onChange={(e) => setTestServiceForm({ ...testServiceForm, unitNumber: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tire Size Specification</label>
              <input
                type="text"
                placeholder="e.g. 11R22.5 or 295/75R22.5"
                value={testServiceForm.tireSizes}
                onChange={(e) => setTestServiceForm({ ...testServiceForm, tireSizes: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Depot / Breakdown Location</label>
              <input
                type="text"
                placeholder="e.g. 401 & Dixie Rd or Fleet Depot"
                value={testServiceForm.location}
                onChange={(e) => setTestServiceForm({ ...testServiceForm, location: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Appointment / Trial Date</label>
              <input
                type="datetime-local"
                value={testServiceForm.scheduledDate}
                onChange={(e) => setTestServiceForm({ ...testServiceForm, scheduledDate: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dispatcher Work Order Notes</label>
              <textarea
                rows={2}
                placeholder="Service trial instructions for technician..."
                value={testServiceForm.description}
                onChange={(e) => setTestServiceForm({ ...testServiceForm, description: e.target.value })}
                className="input-field resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTestServiceLead(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={createTestServiceMutation.isPending}
                onClick={() => {
                  createTestServiceMutation.mutate({
                    id: testServiceLead.id,
                    data: testServiceForm,
                  });
                }}
                className="btn-primary"
              >
                {createTestServiceMutation.isPending ? 'Booking...' : 'Confirm Trial Dispatch'}
              </button>
            </div>
          </div>
        </Modal>
      )}

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

      {/* Push Lead Modal */}
      <Modal
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        title="Push Fleet Prospect to Outbound Queue"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Metro Freight Logistics"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Number of Units (NOU)</label>
              <input
                type="number"
                placeholder="e.g. 25"
                value={formData.numberOfUnits}
                onChange={(e) => setFormData({ ...formData, numberOfUnits: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fleet Manager</label>
              <input
                type="text"
                placeholder="e.g. Robert Vance"
                value={formData.fleetManager}
                onChange={(e) => setFormData({ ...formData, fleetManager: e.target.value, contactPerson: e.target.value || formData.contactPerson })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">CEO / Owner Name</label>
              <input
                type="text"
                placeholder="e.g. David Vance"
                value={formData.ceoOwnerName}
                onChange={(e) => setFormData({ ...formData, ceoOwnerName: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone *</label>
              <input
                type="text"
                required
                placeholder="+1 (416) 555-0144"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alt Phone</label>
              <input
                type="text"
                placeholder="+1 (416) 555-0145"
                value={formData.altPhone}
                onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                className="input-field font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                placeholder="dispatch@metrofreight.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">POA Email (Billing)</label>
              <input
                type="email"
                placeholder="accounting@metrofreight.com"
                value={formData.poaEmail}
                onChange={(e) => setFormData({ ...formData, poaEmail: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Depot Address</label>
              <input
                type="text"
                placeholder="e.g. 5000 Dixie Rd, Mississauga, ON"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Website URL</label>
              <input
                type="text"
                placeholder="e.g. metrofreight.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Prospect Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Operating 20 dry vans with 11R22.5 tires."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPushModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary"
            >
              {createMutation.isPending ? 'Pushing...' : 'Push to Outbound Queue'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Call Disposition Modal */}
      {selectedDispositionLead && (
        <Modal
          isOpen={!!selectedDispositionLead}
          onClose={() => setSelectedDispositionLead(null)}
          title={`Log Call Outcome — ${selectedDispositionLead.companyName}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-3.5 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="font-bold text-sm text-slate-900">{selectedDispositionLead.companyName}</div>
              <div className="text-slate-600 mt-0.5">
                Contact: <span className="font-semibold">{selectedDispositionLead.contactPerson}</span> • <span className="font-mono">{selectedDispositionLead.phone}</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                Call Outcome *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'INTERESTED', label: 'Interested / Qualified', color: 'border-purple-500 bg-purple-50 text-purple-800' },
                  { value: 'CALLBACK', label: 'Callback Requested', color: 'border-blue-500 bg-blue-50 text-blue-800' },
                  { value: 'NOT_INTERESTED', label: 'Not Interested', color: 'border-slate-400 bg-slate-100 text-slate-700' },
                  { value: 'WRONG_NUMBER', label: 'Wrong Number', color: 'border-rose-400 bg-rose-50 text-rose-700' },
                  { value: 'NO_ANSWER', label: 'No Answer / Ringing', color: 'border-amber-400 bg-amber-50 text-amber-800' },
                  { value: 'VOICEMAIL', label: 'Left Voicemail', color: 'border-purple-400 bg-purple-50 text-purple-800' },
                  { value: 'CONVERTED', label: 'Direct Fleet Deal', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                ].map((disp) => (
                  <button
                    key={disp.value}
                    type="button"
                    onClick={() => setSelectedDisposition(disp.value)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      selectedDisposition === disp.value
                        ? `${disp.color} ring-2 ring-red-500 ring-offset-1`
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {disp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* If Callback Requested */}
            {selectedDisposition === 'CALLBACK' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <div className="font-bold text-blue-900">Schedule Follow-up Callback</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-blue-800 mb-1">Date</label>
                    <input
                      type="date"
                      value={callbackDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCallbackDate(val);
                        if (val) {
                          const [y, m, d] = val.split('-').map(Number);
                          const dt = new Date(y, m - 1, d);
                          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                          setCallbackDay(days[dt.getDay()]);
                        }
                      }}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-blue-800 mb-1">Day</label>
                    <input
                      type="text"
                      readOnly
                      value={callbackDay}
                      placeholder="e.g. Wed"
                      className="input-field bg-blue-100/50"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-blue-800 mb-1">Time</label>
                    <input
                      type="text"
                      value={callbackTime}
                      placeholder="11:00 AM"
                      onChange={(e) => setCallbackTime(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* If Disqualified outcome */}
            {['NOT_INTERESTED', 'WRONG_NUMBER'].includes(selectedDisposition) && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <div className="font-bold text-rose-900">Disqualification Root Cause</div>
                <select
                  value={dispositionReason}
                  onChange={(e) => setDispositionReason(e.target.value as DisqualificationReason)}
                  className="input-field"
                >
                  <option value="NOT_INTERESTED">Not Interested</option>
                  <option value="WRONG_NUMBER">Wrong Number / Inactive</option>
                  <option value="OUT_OF_SERVICE_AREA">Out of Service Area</option>
                  <option value="COMPETITOR_LOCKED">Locked into Competitor Contract</option>
                  <option value="FLEET_TOO_SMALL">Fleet Too Small</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Call Notes</label>
              <textarea
                rows={2}
                placeholder="Call notes & prospect feedback..."
                value={dispositionNotes}
                onChange={(e) => setDispositionNotes(e.target.value)}
                className="input-field resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedDispositionLead(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedDisposition || dispositionMutation.isPending}
                onClick={() => {
                  dispositionMutation.mutate({
                    id: selectedDispositionLead.id,
                    disposition: selectedDisposition,
                    notes: dispositionNotes,
                    callbackData: {
                      callbackDate: callbackDate || undefined,
                      callbackDay: callbackDay || undefined,
                      callbackTime: callbackTime || undefined,
                      disqualificationReason: ['NOT_INTERESTED', 'WRONG_NUMBER'].includes(selectedDisposition)
                        ? dispositionReason
                        : undefined,
                    },
                  });
                }}
                className="btn-primary"
              >
                {dispositionMutation.isPending ? 'Logging...' : 'Save & Claim Next Lead'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
