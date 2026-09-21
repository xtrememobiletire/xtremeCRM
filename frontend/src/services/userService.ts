import { api } from '../utils/api';

export interface UserItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  countryCode: string;
  isAgentActive?: boolean;
}

export const userService = {
  async getDrivers(): Promise<UserItem[]> {
    const res = await api.get('/users', { params: { role: 'DRIVER', limit: 100 } });
    const raw = res.data;
    return Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
  },

  async toggleMyPresence(isAgentActive?: boolean) {
    const res = await api.patch('/users/me/active', { isAgentActive });
    return res.data.data;
  },
};
