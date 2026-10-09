import { api } from '../utils/api';

export type LeadStage =
  | 'VA_OUTREACH'
  | 'AGENT_CALLBACK'
  | 'DISPATCHER_REVIEW'
  | 'ADMIN_APPROVAL'
  | 'CONVERTED'
  | 'DISQUALIFIED';

export type DisqualificationReason =
  | 'WRONG_NUMBER'
  | 'NOT_INTERESTED'
  | 'OUT_OF_SERVICE_AREA'
  | 'COMPETITOR_LOCKED'
  | 'FLEET_TOO_SMALL'
  | 'NO_COMMERCIAL_FLEET'
  | 'CREDIT_TERMS_REJECTED'
  | 'OTHER';

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
  stage: LeadStage;
  priority: number;
  disposition?: 'CALLBACK' | 'CONVERTED' | 'NOT_INTERESTED' | 'WRONG_NUMBER' | 'NO_ANSWER' | 'VOICEMAIL' | 'RNC' | null;
  disqualificationReason?: DisqualificationReason | null;
  disqualifiedAtStage?: LeadStage | null;
  disqualifiedNotes?: string | null;
  notes?: string | null;
  callbackDate?: string | null;
  callbackDay?: string | null;
  callbackTime?: string | null;
  batchId?: string | null;
  uploadedById?: string | null;
  uploadedBy?: { id: string; fullName: string; role: string } | null;
  assignedAgentId?: string | null;
  assignedAgent?: { id: string; fullName: string; role: string } | null;
  assignedDispatcherId?: string | null;
  assignedDispatcher?: { id: string; fullName: string; role: string } | null;
  vehicleTypes?: string | null;
  commonTireSizes?: string | null;
  testServices?: Array<{
    id: string;
    jobCode: string;
    status: string;
    appointmentDate?: string;
    serviceAddress?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface LeadFilters {
  page?: number;
  limit?: number;
  countryCode?: string;
  status?: string;
  stage?: LeadStage | string;
  pool?: 'va' | 'callbacks' | 'dispatcher' | 'admin' | 'disqualified' | string;
  disposition?: string;
  search?: string;
  assignedAgentId?: string;
  priority?: number;
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

  async advanceStage(id: string, data: { stage: LeadStage; assignedDispatcherId?: string; notes?: string; vehicleTypes?: string; commonTireSizes?: string }): Promise<Lead> {
    const res = await api.post(`/leads/${id}/advance-stage`, data);
    return res.data.data;
  },

  async disqualifyLead(id: string, reason: DisqualificationReason, notes?: string): Promise<Lead> {
    const res = await api.post(`/leads/${id}/disqualify`, { reason, notes });
    return res.data.data;
  },

  async reactivateLead(id: string): Promise<Lead> {
    const res = await api.post(`/leads/${id}/reactivate`);
    return res.data.data;
  },

  async distributeLeads(data: { countryCode?: string; targetVaIds?: string[] } = {}) {
    const res = await api.post('/leads/distribute', data);
    return res.data.data;
  },

  async createTestService(id: string, data: { driverId?: string; description?: string; scheduledDate?: string; tireSizes?: string; unitNumber?: string; location?: string }) {
    const res = await api.post(`/leads/${id}/test-service`, data);
    return res.data.data;
  },

  async transferLeadToDm(id: string, transferNotes?: string, callId?: string) {
    const res = await api.post(`/leads/${id}/transfer`, { transferNotes, callId });
    return res.data.data;
  },

  async convertToFleet(id: string, customFleetCode?: string, extraData?: any) {
    const res = await api.post(`/leads/${id}/convert`, { customFleetCode, ...extraData });
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
    callbackData?: { callbackDate?: string; callbackDay?: string; callbackTime?: string; disqualificationReason?: DisqualificationReason }
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
