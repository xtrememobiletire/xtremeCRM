import { api } from '../utils/api';

export interface UserItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  countryCode: string;
  address?: string;
  assignedVehicle?: string;
  latitude?: number | null;
  longitude?: number | null;
  isAgentActive?: boolean;
}
export const UserItem = {};

export const userService = {
  async getDrivers(countryCode?: string): Promise<UserItem[]> {
    const res = await api.get('/users', { params: { role: 'DRIVER', countryCode, limit: 100 } });
    const raw = res.data;
    return Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
  },

  async getVirtualAssistants(countryCode?: string): Promise<UserItem[]> {
    const res = await api.get('/users', { params: { role: 'VIRTUAL_ASSISTANT', countryCode, limit: 100 } });
    const raw = res.data;
    return Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
  },

  async toggleMyPresence(isAgentActive?: boolean) {
    const res = await api.patch('/users/me/active', { isAgentActive });
    return res.data.data;
  },

  async createUser(payload: {
    email?: string;
    password?: string;
    fullName: string;
    role: string;
    countryCode: string;
    phone?: string;
    address?: string;
    assignedVehicle?: string;
    workingDays?: string;
    workingHours?: string;
    approvedByName?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<UserItem> {
    const res = await api.post('/users', payload);
    return res.data.data;
  },

  async updateUser(id: string, payload: Partial<UserItem> & { password?: string }): Promise<UserItem> {
    const res = await api.patch(`/users/${id}`, payload);
    return res.data.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};
