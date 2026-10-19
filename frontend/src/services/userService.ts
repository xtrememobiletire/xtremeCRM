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
  workingDays?: string;
  workingHours?: string;
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

  async getStaffUsers(countryCode?: string): Promise<UserItem[]> {
    const res = await api.get('/users', { params: { limit: 100, countryCode } });
    const raw = res.data;
    const all = Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
    return all.filter((u: any) => ['CALL_AGENT', 'VIRTUAL_ASSISTANT', 'DISPATCHER', 'ADMIN', 'GENERAL_MANAGER'].includes(u.role));
  },

  async toggleMyPresence(isAgentActive?: boolean) {
    const res = await api.patch('/users/me/active', { isAgentActive });
    return res.data.data;
  },

  /**
   * Create a user profile; assignedVehicle tags starting with EXTERNAL identify contractors.
   * The current route requires email and password even though this payload permits omission.
   * @throws The API request error, including validation or duplicate-email rejection.
   */
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

  /**
   * Update supported profile, duty, schedule, or location fields and return the profile.
   * The server does not update email or password from this payload.
   * @throws The API request error on rejection.
   */
  async updateUser(id: string, payload: Partial<UserItem> & { password?: string }): Promise<UserItem> {
    const res = await api.patch(`/users/${id}`, payload);
    return res.data.data;
  },

  /**
   * Soft-delete a user by setting deletedAt; discard the success response.
   * @throws The API request error on rejection.
   */
  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};
