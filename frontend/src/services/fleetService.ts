import { api } from '../utils/api';

export interface FleetItem {
  id: string;
  companyName: string;
  name?: string;
  fleetCode?: string;
  contactName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  paymentTerms: string;
  creditLimitCents?: number;
  outstandingBalanceCents?: number;
  vehicles?: any[];
  jobs?: any[];
  createdAt?: string;
}

export interface FleetsResponse {
  data: FleetItem[];
}

export const fleetService = {
  async getFleets(params?: { countryCode?: string }): Promise<FleetsResponse> {
    const res = await api.get('/fleets', { params });
    const raw = res.data;
    const items = Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
    const normalized = items.map((f: any) => ({
      ...f,
      companyName: f.companyName || f.name || 'Fleet Corp',
      paymentTerms: f.paymentTerms || 'NET_30',
    }));
    return { data: normalized };
  },

  async getFleetById(id: string): Promise<FleetItem> {
    const res = await api.get(`/fleets/${id}`);
    const f = res.data.data;
    return {
      ...f,
      companyName: f.companyName || f.name || 'Fleet Corp',
      paymentTerms: f.paymentTerms || 'NET_30',
    };
  },

  async createFleet(payload: any): Promise<FleetItem> {
    const res = await api.post('/fleets', payload);
    return res.data.data;
  },
};
