import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  PhoneCall, 
  ArrowRightLeft, 
  MessageSquare, 
  Plus, 
  Search, 
  RefreshCw, 
  Truck,
  ClipboardCheck
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { leadService, type Lead } from '../services/leadService';
import { toast } from 'sonner';

export default function Leads() {
  const { country } = useTenant();
  const { user } = useAuth();
  const { dialOutbound, transferCallToDm } = useSocket();
  const queryClient = useQueryClient();

  const isAgent = user?.role === 'CALL_AGENT';
  const [viewMode, setViewMode] = useState<'queue' | 'all'>(isAgent ? 'queue' : 'all');
  const [selectedDispositionLead, setSelectedDispositionLead] = useState<Lead | null>(null);
  const [selectedDisposition, setSelectedDisposition] = useState('');
  const [dispositionNotes, setDispositionNotes] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [transferringLead, setTransferringLead] = useState<Lead | null>(null);
  const [transferNotes, setTransferNotes] = useState('');

  // Form State for VA pushing leads
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    altPhone: '',
    email: '',
    address: '',
    website: '',
    numberOfUnits: '',
    notes: '',
    countryCode: country,
  });

  // Agent 10-cap round robin auto-fill queue
  const { data: queueResponse, isLoading: isLoadingQueue, refetch: refetchQueue } = useQuery({
    queryKey: ['agent-queue', country],
    queryFn: () => leadService.getAgentQueue(country),
    enabled: isAgent || viewMode === 'queue',
    refetchInterval: 15000,
  });

  const queueData = queueResponse || {
    leads: [],
    activeCount: 0,
    maxCapacity: 10,
    unassignedPoolCount: 0,
  };

  const { data: leadsResponse, isLoading: isLoadingAll, refetch: refetchAll } = useQuery({
    queryKey: ['leads', country, statusFilter, search],
    queryFn: () => leadService.getLeads({
      countryCode: country,
      status: statusFilter || undefined,
      search: search || undefined,
      limit: 50,
    }),
    enabled: !isAgent && viewMode === 'all',
  });

  const allLeads: Lead[] = leadsResponse?.data || [];
  const activeInQueue = isAgent || viewMode === 'queue';
  const displayLeads: Lead[] = activeInQueue ? queueData.leads : allLeads;
  const isLoading = activeInQueue ? isLoadingQueue : isLoadingAll;

  const refetch = () => {
    if (activeInQueue) refetchQueue();
    else refetchAll();
  };

  const dispositionMutation = useMutation({
    mutationFn: ({ id, disposition, notes }: { id: string; disposition: string; notes?: string }) =>
      leadService.setDisposition(id, disposition, notes),
    onSuccess: () => {
      toast.success('Call outcome recorded! Slot freed & next lead auto-assigned.');
      setSelectedDispositionLead(null);
      setSelectedDisposition('');
      setDispositionNotes('');
      queryClient.invalidateQueries({ queryKey: ['agent-queue'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to record disposition');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Lead>) => leadService.createLead(data),
    onSuccess: () => {
      toast.success('Fleet lead pushed successfully to outbound queue!');
      setIsPushModalOpen(false);
      setFormData({
        companyName: '',
        contactPerson: '',
        phone: '',
        altPhone: '',
        email: '',
        address: '',
        website: '',
        numberOfUnits: '',
        notes: '',
        countryCode: country,
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to push lead');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) => leadService.updateLead(id, data),
    onSuccess: () => {
      toast.success('Lead updated');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => leadService.convertToFleet(id),
    onSuccess: () => {
      toast.success('Lead converted to Fleet Account! VA commission recorded.');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to convert lead');
    },
  });

  const handleCallLead = (lead: Lead) => {
    dialOutbound(lead.phone, `${lead.companyName} (${lead.contactPerson})`, lead.id);
    updateMutation.mutate({
      id: lead.id,
      data: { status: 'CALLED' },
    });
  };

  const handleOpenTransferModal = (lead: Lead) => {
    setTransferringLead(lead);
    setTransferNotes(`Qualified prospect: ${lead.companyName}. Fleet units: ${lead.numberOfUnits || 'Pending'}. Interested in standard fleet tire account.`);
  };

  const handleConfirmTransfer = async () => {
    if (!transferringLead) return;
    try {
      await transferCallToDm({
        leadId: transferringLead.id,
        companyName: transferringLead.companyName,
        callerName: transferringLead.contactPerson,
        callerPhone: transferringLead.phone,
        notes: transferNotes,
        transferType: 'OUTBOUND_LEAD',
      });
      await leadService.transferLeadToDm(transferringLead.id, transferNotes);
      toast.success(`Prospect ${transferringLead.companyName} handed over to Dispatcher Manager!`);
      setTransferringLead(null);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch {
      toast.error('Failed to initiate warm transfer');
    }
  };

  const handleWhatsAppChat = (lead: Lead) => {
    const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hi ${lead.contactPerson}, this is Xtreme Mobile Tire dispatch team regarding fleet tire servicing for ${lead.companyName}. Please find our commercial pricing & service agreement terms here.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    updateMutation.mutate({
      id: lead.id,
      data: { whatsappFollowUp: true },
    });
    toast.success('WhatsApp conversation opened');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.contactPerson || !formData.phone) {
      toast.error('Please enter Company Name, Contact Person, and Phone');
      return;
    }
    createMutation.mutate({
      ...formData,
      numberOfUnits: formData.numberOfUnits ? Number(formData.numberOfUnits) : undefined,
      countryCode: country as any,
    });
  };

  const counts = {
    all: displayLeads.length,
    new: displayLeads.filter((l) => l.status === 'NEW').length,
    called: displayLeads.filter((l) => l.status === 'CALLED' || l.status === 'CALLBACK').length,
    converted: displayLeads.filter((l) => l.status === 'CONVERTED').length,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={activeInQueue ? "Outbound Calling Queue (10 Max)" : "Outbound B2B Fleet Sales & Leads"}
        subtitle={
          activeInQueue
            ? `Load-balanced calling queue for ${country} Region. Fast agents auto-receive fresh leads upon dispositioning.`
            : `Prospect pool and lead qualification for ${country} Region.`
        }
        actions={
          <div className="flex items-center gap-2">
            {!isAgent && (
              <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex items-center">
                <button
                  type="button"
                  onClick={() => setViewMode('queue')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    viewMode === 'queue' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  My Queue (10)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    viewMode === 'all' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Leads Pool
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => refetch()}
              className="btn-secondary px-2.5 py-2 cursor-pointer"
              title="Refresh queue"
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              onClick={() => setIsPushModalOpen(true)}
              className="btn-primary cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>Push New Lead</span>
            </button>
          </div>
        }
      />

      {/* Round-Robin Load-Balanced Queue Banner */}
      {activeInQueue && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4 border border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-400 bg-red-950/80 px-2 py-0.5 rounded-full border border-red-800">
                Round-Robin Dispatch Active
              </span>
              <span className="text-xs text-slate-300">
                Agent Workload: <strong className="text-white font-bold">{queueData.activeCount} / {queueData.maxCapacity}</strong> Calls Assigned
              </span>
            </div>
            <div className="text-xs text-slate-300">
              {queueData.unassignedPoolCount > 0 ? (
                <span>
                  🚀 <strong className="text-emerald-400 font-bold">{queueData.unassignedPoolCount} unassigned leads</strong> available in pool. When you log call dispositions, fresh leads are assigned automatically!
                </span>
              ) : (
                <span className="text-slate-400">
                  All unassigned leads are currently distributed among active agents.
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetchQueue()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={12} className={isLoadingQueue ? 'animate-spin' : ''} />
              <span>Sync Queue</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Leads</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{counts.all}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">New Unworked</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{counts.new}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Called / In Progress</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{counts.called}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Converted Fleets</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{counts.converted}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search company, contact person, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['', 'NEW', 'CALLED', 'CALLBACK', 'CONVERTED', 'DEAD'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st === '' ? 'All Statuses' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Leads List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading outbound leads queue...</div>
        ) : displayLeads.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No Outbound Leads in Queue</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {activeInQueue
                ? "Your active queue is empty. Click Sync Queue above to fetch unassigned leads from the pool."
                : "Virtual Assistants can upload CSV or Excel files to populate the outbound lead pool."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Company & Fleet Units</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Phone & Email</th>
                  <th className="py-3 px-4">VA Attribution</th>
                  <th className="py-3 px-4">Status & Outcome</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayLeads.map((lead) => {
                  const isConverted = lead.status === 'CONVERTED';
                  const isNew = lead.status === 'NEW';
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{lead.companyName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {lead.numberOfUnits ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              <Truck size={10} />
                              <span>{lead.numberOfUnits} Units (NOU)</span>
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
                              Website
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {lead.contactPerson}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-800">{lead.phone}</div>
                        {lead.email && <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{lead.email}</div>}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[11px] text-slate-600">
                          {lead.uploadedByVa?.fullName || 'VA Ingestion'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              isConverted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : isNew
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {lead.status}
                          </span>
                          {lead.disposition && (
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {lead.disposition.replace('_', ' ')}
                            </span>
                          )}
                          {lead.transferredToDm && (
                            <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-0.5">
                              <ArrowRightLeft size={10} />
                              <span>Transferred DM</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. Click to Call */}
                          <button
                            type="button"
                            onClick={() => handleCallLead(lead)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                            title="Call Prospect via Telnyx WebRTC"
                          >
                            <PhoneCall size={14} />
                          </button>

                          {/* 2. Set Call Disposition */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDispositionLead(lead);
                              setSelectedDisposition(lead.disposition || '');
                              setDispositionNotes(lead.notes || '');
                            }}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                            title="Log Call Disposition"
                          >
                            <ClipboardCheck size={14} />
                          </button>

                          {/* 2. Warm Transfer to DM */}
                          <button
                            type="button"
                            onClick={() => handleOpenTransferModal(lead)}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                            title="Warm Transfer to Dispatcher Manager"
                          >
                            <ArrowRightLeft size={14} />
                          </button>

                          {/* 3. Send WhatsApp Contract */}
                          <button
                            type="button"
                            onClick={() => handleWhatsAppChat(lead)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                            title="Coordinate Terms / Contract via WhatsApp"
                          >
                            <MessageSquare size={14} />
                          </button>

                          {/* 4. Convert to Fleet (if DM/Admin or qualified) */}
                          {['ADMIN', 'DISPATCHER'].includes(user?.role || '') && !isConverted && (
                            <button
                              type="button"
                              onClick={() => convertMutation.mutate(lead.id)}
                              className="px-2 py-1 rounded-lg bg-slate-900 text-white font-bold text-[10px] hover:bg-slate-800 transition cursor-pointer"
                              title="Convert to Contracted Fleet Account"
                            >
                              Convert Fleet
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

      {/* Push Lead Modal (VA Input) */}
      <Modal
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        title="Push Fleet Prospect to Outbound Queue"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Logistics Corp"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fleet Manager / Contact *</label>
              <input
                type="text"
                required
                placeholder="e.g. Robert Sterling"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone *</label>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alt Contact Phone</label>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email / Decision Maker</label>
              <input
                type="email"
                placeholder="robert@apexlogistics.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Units (NOU)</label>
              <input
                type="number"
                placeholder="e.g. 18"
                value={formData.numberOfUnits}
                onChange={(e) => setFormData({ ...formData, numberOfUnits: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company Depot / Address</label>
            <input
              type="text"
              placeholder="e.g. 5000 Dixie Rd, Mississauga, ON"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">VA Prospect Notes / Pitch Details</label>
            <textarea
              rows={2}
              placeholder="e.g. Fleets running 11R22.5 steer and drive tires, interested in 24/7 emergency roadside coverage."
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

      {/* Warm Transfer to DM Modal */}
      {transferringLead && (
        <Modal
          isOpen={!!transferringLead}
          onClose={() => setTransferringLead(null)}
          title="Warm Transfer to Dispatcher Manager"
          maxWidth="max-w-md"
        >
          <div className="space-y-3.5">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="font-bold text-sm text-slate-900">{transferringLead.companyName}</div>
              <div className="text-xs text-slate-700 mt-0.5">
                Contact: <span className="font-semibold">{transferringLead.contactPerson}</span> ({transferringLead.phone})
              </div>
              {transferringLead.numberOfUnits && (
                <div className="text-xs text-slate-600 mt-0.5">
                  Fleet Size: <span className="font-bold text-slate-900">{transferringLead.numberOfUnits} Units</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Briefing Notes for Dispatcher Manager
              </label>
              <textarea
                rows={3}
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                className="input-field resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTransferringLead(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowRightLeft size={14} />
                <span>Handover to DM Now</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Set Call Disposition Modal */}
      {selectedDispositionLead && (
        <Modal
          isOpen={!!selectedDispositionLead}
          onClose={() => setSelectedDispositionLead(null)}
          title={`Log Call Outcome — ${selectedDispositionLead.companyName}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="font-bold text-sm text-slate-900">{selectedDispositionLead.companyName}</div>
              <div className="text-xs text-slate-600 mt-0.5">
                Contact: <span className="font-semibold text-slate-800">{selectedDispositionLead.contactPerson}</span> • <span className="font-mono text-slate-700 font-semibold">{selectedDispositionLead.phone}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Call Disposition *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'CONVERTED', label: 'Converted / Fleet Deal', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                  { value: 'CALLBACK', label: 'Callback Requested', color: 'border-blue-500 bg-blue-50 text-blue-800' },
                  { value: 'NOT_INTERESTED', label: 'Not Interested', color: 'border-slate-400 bg-slate-100 text-slate-700' },
                  { value: 'WRONG_NUMBER', label: 'Wrong Number', color: 'border-rose-400 bg-rose-50 text-rose-700' },
                  { value: 'NO_ANSWER', label: 'No Answer / Ringing', color: 'border-amber-400 bg-amber-50 text-amber-800' },
                  { value: 'VOICEMAIL', label: 'Left Voicemail', color: 'border-purple-400 bg-purple-50 text-purple-800' },
                  { value: 'RNC', label: 'Relevant Not Converted', color: 'border-orange-400 bg-orange-50 text-orange-800' },
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Disposition Notes & Pitch Feedback
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Spoke with fleet supervisor, requested email quote on 11R22.5 steer tires."
                value={dispositionNotes}
                onChange={(e) => setDispositionNotes(e.target.value)}
                className="input-field resize-none text-xs"
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
                  if (!selectedDisposition) return;
                  dispositionMutation.mutate({
                    id: selectedDispositionLead.id,
                    disposition: selectedDisposition,
                    notes: dispositionNotes,
                  });
                }}
                className={`btn-primary flex items-center gap-1.5 ${
                  !selectedDisposition || dispositionMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <ClipboardCheck size={14} />
                <span>{dispositionMutation.isPending ? 'Saving...' : 'Save & Claim Next Lead'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
