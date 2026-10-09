import { api } from '../utils/api';

export interface MapCustomer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  customerType: string;
  membershipTier?: string;
  createdAt: string;
  _count?: {
    jobs: number;
    vehicles: number;
  };
}

export interface MapFleet {
  id: string;
  fleetCode: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  status: string;
  _count?: {
    vehicles: number;
    drivers: number;
    jobs: number;
  };
}

export interface MapJob {
  id: string;
  jobCode: string;
  serviceAddress: string;
  serviceLatitude: number;
  serviceLongitude: number;
  status: string;
  urgency: string;
  source: string;
  countryCode: string;
  currency: string;
  totalCents: number;
  recipientName?: string;
  recipientPhone?: string;
  problemNotes?: string;
  appointmentDate?: string;
  estimatedArrivalAt?: string;
  customer?: {
    id: string;
    fullName: string;
    phone: string;
  };
  fleet?: {
    id: string;
    name: string;
    fleetCode: string;
  };
  vehicle?: {
    id: string;
    year: number;
    make: string;
    model: string;
    licensePlate?: string;
    tireSize?: string;
  };
  driver?: {
    id: string;
    fullName: string;
    phone: string;
    role: string;
  };
}

export interface GeocodeResponse {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  placeName?: string;
}

export const mapService = {
  async getCustomers(countryCode?: string): Promise<MapCustomer[]> {
    const res = await api.get('/map/customers', { params: { countryCode } });
    return res.data?.data || res.data || [];
  },

  async getFleets(params?: { countryCode?: string; status?: string }): Promise<MapFleet[]> {
    const res = await api.get('/map/fleets', { params });
    return res.data?.data || res.data || [];
  },

  async getJobs(params?: { countryCode?: string; status?: string; driverId?: string }): Promise<MapJob[]> {
    const res = await api.get('/map/jobs', { params });
    return res.data?.data || res.data || [];
  },

  async geocode(address: string, countryCode?: string): Promise<GeocodeResponse> {
    const res = await api.post('/map/geocode', { address, countryCode });
    return res.data?.data || res.data;
  },
};

export default mapService;
