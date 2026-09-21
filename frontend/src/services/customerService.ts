import { api } from '../utils/api';

export interface CustomerItem {
  id: string;
  name: string;
  fullName?: string;
  phone: string;
  altPhone?: string;
  email?: string;
  customerType?: string;
  countryCode?: string;
  totalSpendCents?: number;
  fleetCompany?: {
    id: string;
    companyName: string;
  } | null;
  vehicles?: any[];
  jobs?: any[];
  createdAt: string;
}

export interface CustomerResponse {
  data: CustomerItem[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
  };
}

export const customerService = {
  async getCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    countryCode?: string;
  }): Promise<CustomerResponse> {
    const res = await api.get('/customers', { params });
    const raw = res.data;
    const items = Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
    const normalized = items.map((c: any) => ({
      ...c,
      name: c.name || c.fullName || 'Valued Customer',
      createdAt: c.createdAt || new Date().toISOString(),
    }));
    return {
      data: normalized,
      pagination: {
        page: raw.meta?.currentPage || raw.pagination?.page || params?.page || 1,
        totalPages: raw.meta?.totalPages || raw.pagination?.totalPages || 1,
        total: raw.meta?.totalCount || raw.pagination?.total || normalized.length,
      },
    };
  },

  async getCustomerById(id: string): Promise<CustomerItem> {
    const res = await api.get(`/customers/${id}`);
    return res.data.data;
  },

  async createCustomer(payload: any): Promise<CustomerItem> {
    const res = await api.post('/customers', payload);
    return res.data.data;
  },

  async lookupCustomer(phone: string): Promise<{
    found: boolean;
    isReturning: boolean;
    customer: any | null;
    fleet: any | null;
    driver: any | null;
  }> {
    const res = await api.get('/customers/lookup', { params: { phone } });
    return res.data.data;
  },

  async updateCustomer(id: string, payload: any): Promise<CustomerItem> {
    const res = await api.patch(`/customers/${id}`, payload);
    return res.data.data;
  },

  async deleteCustomer(id: string): Promise<void> {
    await api.delete(`/customers/${id}`);
  },
};
