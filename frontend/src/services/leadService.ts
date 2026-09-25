import { api } from '../utils/api';

export interface Lead {
  id: string;
  companyName: string;
  contactPerson: string;
  fleetManager?: string | null;
  ceoOwnerName?: string | null;
  phone: string;
  altPhone?: string | null;
  email?: string | null;
  poaEmail?: string | null;
  address?: string | null;
  website?: string | null;
  numberOfUnits?: number | null;
  countryCode: 'CA' | 'US' | 'UK';
  status: 'NEW' | 'CALLED' | 'CALLBACK' | 'CONVERTED' | 'DEAD';
  disposition?: 'CALLBACK' | 'CONVERTED' | 'NOT_INTERESTED' | 'WRONG_NUMBER' | 'NO_ANSWER' | 'VOICEMAIL' | 'RNC' | null;
  notes?: string | null;
  callbackDate?: string | null;
  callbackDay?: string | null;
  callbackTime?: string | null;
  batchId?: string | null;
  uploadedByVaId?: string | null;
  uploadedByVa?: { id: string; fullName: string; role: string } | null;
  assignedAgentId?: string | null;
  assignedAgent?: { id: string; fullName: string; role: string } | null;
  transferredToDm: boolean;
  transferredToDmAt?: string | null;
  whatsappFollowUp: boolean;
  whatsappNotes?: string | null;
  convertedFleetId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadFilters {
  page?: number;
  limit?: number;
  countryCode?: string;
  status?: string;
  disposition?: string;
  search?: string;
  assignedAgentId?: string;
}

export const leadService = {
  async getLeads(filters: LeadFilters = {}) {
    const res = await api.get('/leads', { params: filters });
    return res.data.data;
  },

  async getLeadById(id: string): Promise<Lead> {
    const res = await api.get(`/leads/${id}`);
    return res.data.data;
  },

  async createLead(data: Partial<Lead>): Promise<Lead> {
    const res = await api.post('/leads', data);
    return res.data.data;
  },

  async updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
    const res = await api.patch(`/leads/${id}`, data);
    return res.data.data;
  },

  async transferLeadToDm(id: string, transferNotes?: string, callId?: string) {
    const res = await api.post(`/leads/${id}/transfer`, { transferNotes, callId });
    return res.data.data;
  },

  async convertToFleet(id: string, customFleetCode?: string) {
    const res = await api.post(`/leads/${id}/convert`, { customFleetCode });
    return res.data.data;
  },

  async uploadLeadsFile(formData: FormData) {
    const res = await api.post('/leads/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async getAgentQueue(countryCode?: string) {
    const res = await api.get('/leads/agent-queue', { params: { countryCode } });
    return res.data.data;
  },

  async startBatch(countryCode?: string) {
    const res = await api.post('/leads/start-batch', { countryCode });
    return res.data.data;
  },

  async setDisposition(
    id: string,
    disposition: string,
    notes?: string,
    callbackData?: { callbackDate?: string; callbackDay?: string; callbackTime?: string }
  ) {
    const res = await api.patch(`/leads/${id}/disposition`, {
      disposition,
      notes,
      ...callbackData,
    });
    return res.data.data;
  },
};

export default leadService;
