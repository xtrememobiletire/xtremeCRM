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
  Truck
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

  const { data: leadsResponse, isLoading, refetch } = useQuery({
    queryKey: ['leads', country, statusFilter, search],
    queryFn: () => leadService.getLeads({
      countryCode: country,
      status: statusFilter || undefined,
      search: search || undefined,
      limit: 50,
    }),
  });

  const leads: Lead[] = leadsResponse?.data || [];

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
    all: leads.length,
    new: leads.filter((l) => l.status === 'NEW').length,
    called: leads.filter((l) => l.status === 'CALLED' || l.status === 'CALLBACK').length,
    converted: leads.filter((l) => l.status === 'CONVERTED').length,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Outbound B2B Fleet Sales & Leads"
        subtitle={`Virtual Assistant prospect queue, click-to-call qualification, and Dispatch Manager warm transfer (${country} Region)`}
        actions={
          <div className="flex items-center gap-2">
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
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No Outbound Leads Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Virtual Assistants can push fleet prospects using the "Push New Lead" button above to populate the call queue.
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
                  <th className="py-3 px-4">Status & Disposition</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => {
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
                          {lead.uploadedByVa?.fullName || 'VA Acquisition'}
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
    </div>
  );
}
