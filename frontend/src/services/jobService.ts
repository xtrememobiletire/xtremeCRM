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
  source?: string;
  fleetId?: string | null;
  fleet?: any;
  subtotalCents?: number;
  taxRateBps?: number;
  taxAmountCents?: number;
  customer?: {
    id?: string;
    name?: string;
    fullName?: string;
    phone?: string;
    email?: string;
    customerType?: string;
    membershipTier?: string;
  } | null;
  vehicle?: {
    id?: string;
    year?: number;
    make?: string;
    model?: string;
    tireSize?: string;
    licensePlate?: string;
    unitNumber?: string;
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
  serviceItems?: Array<{
    id?: string;
    serviceName: string;
    category?: string;
    unitPriceCents?: number;
    quantity?: number;
    notes?: string;
  }>;
  services?: string[];
  problemNotes?: string;
  notes?: string;
  recipientName?: string;
  recipientPhone?: string;
  cashCollectedCents?: number;
  receiptUrl?: string;
  externalDispatchToken?: string | null;
  externalDispatchStatus?: string | null;
  externalDriverFeeCents?: number | null;
  driverType?: 'INTERNAL' | 'EXTERNAL';
  paymentStatus?: string;
  invoiceId?: string | null;
  invoice?: any;
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
    jobCategory?: string;
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
    statusOrPayload: string | FormData | {
      status?: string;
      paymentMethod?: string;
      amountCents?: number;
      cashAmountCents?: number;
      receiptUrl?: string;
      driverDeclineReason?: string;
      upfrontAmountCents?: number;
      upfrontReceiptUrl?: string;
      isUpfrontVerified?: boolean;
      notes?: string;
      problemNotes?: string;
      driverId?: string | null;
      urgency?: string;
      serviceItems?: Array<{
        serviceName: string;
        category?: 'TIRE_SERVICE' | 'ROADSIDE_ASSISTANCE' | 'MAINTENANCE';
        unitPriceCents: number;
        quantity: number;
        notes?: string;
      }>;
    },
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
    unitNumber?: string;
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

  /**
   * Create or update an external contractor dispatch link and assign the job.
   * A numeric payload supplies only the contractor fee in cents; object ETA is
   * in minutes. Return the job, token aliases, and relative public URL aliases.
   * @throws The API request error, including rejection of completed/cancelled jobs.
   */
  async generateExternalDispatch(
    id: string,
    payload: {
      externalCompanyName?: string;
      externalDriverPhone?: string;
      externalDriverAddress?: string;
      latitude?: number;
      longitude?: number;
      externalDriverFeeCents?: number;
      contractorPayoutFeeCents?: number;
      driverEtaMinutes?: number;
      paymentCollectionMode?: 'COMPANY' | 'DRIVER';
    } | number
  ): Promise<{ message: string; externalDispatchToken: string; externalDispatchUrl: string; token?: string; publicUrl?: string; job: JobItem }> {
    const body = typeof payload === 'number'
      ? { externalDriverFeeCents: payload }
      : payload;
    const res = await api.post(`/jobs/${id}/external-dispatch`, body);
    return res.data.data;
  },

  /**
   * Revoke the public token and reset the job's assignment and contractor details.
   * @returns The updated job.
   * @throws The API request error, including rejection of completed jobs.
   */
  async revokeExternalDispatch(id: string): Promise<{ message: string; job: JobItem }> {
    const res = await api.post(`/jobs/${id}/revoke-external-dispatch`);
    return res.data.data;
  },

  /**
   * Fetch the token-selected public work order, including recipient contact,
   * vehicle/services, payout, total, and collected cash in cents.
   * @throws The API request error, including HTTP 404 for an unmatched token.
   */
  async getPublicExternalJob(token: string): Promise<any> {
    const res = await api.get(`/jobs/public/external/${token}`);
    return res.data.data;
  },

  /**
   * Apply a public dispatch action and return status and externalDispatchStatus.
   * The server reads cashCollectedCents on COMPLETE; cashAmountCents is not consumed.
   * @throws The API request error, including unmatched tokens, terminal jobs, or unknown actions.
   */
  async updatePublicExternalJobStatus(
    token: string,
    payload: {
      action: 'ACCEPT' | 'DECLINE' | 'EN_ROUTE' | 'ARRIVED' | 'ON_SCENE' | 'COMPLETE';
      reason?: string;
      cashAmountCents?: number;
      cashCollectedCents?: number;
    }
  ): Promise<any> {
    const res = await api.patch(`/jobs/public/external/${token}/status`, payload);
    return res.data.data;
  },
};
