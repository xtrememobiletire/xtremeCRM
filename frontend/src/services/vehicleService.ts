import { api } from '../utils/api';

export interface VehicleItem {
  id: string;
  year?: number;
  make: string;
  model: string;
  licensePlate?: string;
  tireSize?: string;
  vin?: string;
  countryCode?: 'CA' | 'US' | 'UK';
  customer?: {
    id: string;
    name: string;
    phone: string;
  } | null;
  fleetCompany?: {
    id: string;
    companyName: string;
  } | null;
  createdAt?: string;
}

export interface VehiclesResponse {
  data: VehicleItem[];
}

export const vehicleService = {
  async getVehicles(params?: { countryCode?: string }): Promise<VehiclesResponse> {
    const res = await api.get('/vehicles', { params });
    const raw = res.data;
    const items = Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
    return { data: items };
  },

  async getVehicleById(id: string): Promise<VehicleItem> {
    const res = await api.get(`/vehicles/${id}`);
    return res.data.data;
  },
};
