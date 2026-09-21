import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobService, type JobsResponse } from '../services/jobService';
import { useTenant } from '../context/TenantContext';

export function useJobs(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  urgency?: string;
  countryCode?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const { country } = useTenant();
  const effectiveCountry = params?.countryCode || country;
  const effectiveParams = {
    ...params,
    countryCode: effectiveCountry,
  };

  return useQuery<JobsResponse>({
    queryKey: ['jobs', effectiveCountry, effectiveParams],
    queryFn: () => jobService.getJobs(effectiveParams),
    staleTime: 10000,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => jobService.createJob(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      jobService.updateJobStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useAssignDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, driverId }: { jobId: string; driverId: string }) =>
      jobService.assignDriver(jobId, driverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobService.deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}
