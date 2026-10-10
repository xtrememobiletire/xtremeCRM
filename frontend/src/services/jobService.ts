import { api } from '../utils/api';

export interface JobItem {
  id: string;
  jobNumber?: string;
  jobCode?: string;
  serviceAddress?: string;
  locationAddress?: string;
  status: string;
  urgency: string;
  totalAmount?: number;
  totalCents?: number;
  quotedPriceCents?: number;
  taxCents?: number;
  currency?: 'CAD' | 'USD' | 'GBP';
  paymentMethod?: string;
  createdAt: string;
  scheduledFor?: string;
  appointmentDate?: string;
  arrivalWindowStart?: string;
  arrivalWindowEnd?: string;
  estimatedArrivalAt?: string;
  driverEstimatedArrivalAt?: string;
  driverEtaMinutes?: number;
  countryCode?: string;
  materialCostCents?: number;
  repairerFeeCents?: number;
  otherExpenseCents?: number;
  expenseNotes?: string;
  itPlatformFeeCents?: number;
  customer?: {
    id?: string;
    name?: string;
    fullName?: string;
    phone?: string;
    email?: string;
  } | null;
  vehicle?: {
    id?: string;
    year?: number;
    make?: string;
    model?: string;
    tireSize?: string;
    licensePlate?: string;
  } | null;
  driver?: {
    id: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  } | null;
  assignedDriver?: {
    id: string;
    fullName?: string;
    phone?: string;
  } | null;
  lineItems?: Array<{ serviceName: string; price: number; quantity?: number }>;
  services?: string[];
  problemNotes?: string;
  notes?: string;
  recipientName?: string;
  recipientPhone?: string;
  completedAt?: string;
  cashCollectedCents?: number;
  receiptUrl?: string;
}

export interface PaginationMeta {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}

export interface JobsResponse {
  success: boolean;
  data: JobItem[];
  pagination: PaginationMeta;
}

export const jobService = {
  async getJobs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    urgency?: string;
    countryCode?: string;
    driverId?: string;
    fleetId?: string;
    isFleetJob?: boolean | string;
    source?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<JobsResponse> {
    const res = await api.get('/jobs', { params });
    const rawData = res.data;
    // Normalize data & pagination
    const items = Array.isArray(rawData.data) ? rawData.data : (Array.isArray(rawData) ? rawData : []);
    const normalizedItems = items.map((j: any) => ({
      ...j,
      jobNumber: j.jobNumber || j.jobCode || `JOB-${j.id.slice(0, 6)}`,
      totalAmount: j.totalAmount ?? j.totalCents ?? 0,
      locationAddress: j.locationAddress || j.serviceAddress || '',
    }));
    return {
      success: true,
      data: normalizedItems,
      pagination: {
        page: rawData.meta?.currentPage || rawData.pagination?.page || params?.page || 1,
        totalPages: rawData.meta?.totalPages || rawData.pagination?.totalPages || 1,
        total: rawData.meta?.totalCount || rawData.pagination?.total || normalizedItems.length,
        limit: params?.limit || 10,
      },
    };
  },

  async getPendingJobsCount(countryCode?: string): Promise<number> {
    const res = await api.get('/jobs', {
      params: {
        status: 'PENDING',
        isFleetJob: 'false',
        countryCode: countryCode && countryCode !== 'ALL' ? countryCode : undefined,
        limit: 1,
      },
    });
    return res.data?.meta?.totalCount ?? res.data?.pagination?.total ?? 0;
  },

  async getJobById(id: string): Promise<JobItem> {
    const res = await api.get(`/jobs/${id}`);
    const j = res.data.data;
    return {
      ...j,
      jobNumber: j.jobNumber || j.jobCode || `JOB-${j.id.slice(0, 6)}`,
      totalAmount: j.totalAmount ?? j.totalCents ?? 0,
      locationAddress: j.locationAddress || j.serviceAddress || '',
    };
  },

  async createJob(payload: any): Promise<JobItem> {
    const res = await api.post('/jobs', payload);
    return res.data.data;
  },

  async createPublicBooking(payload: any): Promise<any> {
    const res = await api.post('/jobs/public-booking', payload);
    return res.data.data;
  },

  async updateJobStatus(
    id: string,
    statusOrPayload: string | FormData | { status: string; paymentMethod?: string; amountCents?: number; cashAmountCents?: number; receiptUrl?: string },
    cashAmountCents?: number
  ): Promise<JobItem> {
    if (statusOrPayload instanceof FormData) {
      const res = await api.patch(`/jobs/${id}/status`, statusOrPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    }
    const payload = typeof statusOrPayload === 'string'
      ? { status: statusOrPayload, cashAmountCents }
      : statusOrPayload;
    const res = await api.patch(`/jobs/${id}/status`, payload);
    return res.data.data;
  },

  async assignDriver(
    id: string, 
    driverId: string, 
    etaMinutes?: number,
    driverEstimatedArrivalAt?: string
  ): Promise<JobItem> {
    const res = await api.patch(`/jobs/${id}/assign-driver`, { 
      driverId, 
      etaMinutes, 
      driverEtaMinutes: etaMinutes,
      driverEstimatedArrivalAt 
    });
    return res.data.data;
  },

  async verifyBookingAddress(id: string, payload: {
    serviceAddress: string;
    serviceLatitude?: number | null;
    serviceLongitude?: number | null;
    recipientName?: string;
    recipientPhone?: string;
    problemNotes?: string;
    urgency?: string;
    paymentMethod?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    tireSize?: string;
    licensePlate?: string;
    serviceItems?: any[];
  }): Promise<JobItem> {
    const res = await api.patch(`/jobs/${id}/verify-booking`, payload);
    return res.data.data;
  },

  async deleteJob(id: string): Promise<JobItem> {
    const res = await api.delete(`/jobs/${id}`);
    return res.data.data;
  },

  async recordDisposition(payload: {
    callerPhone: string;
    disposition: string;
    reason: string;
    countryCode: string;
  }): Promise<void> {
    await api.post('/jobs/disposition', payload);
  },
};
