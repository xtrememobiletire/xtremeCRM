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
  driverId?: string;
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
      queryClient.invalidateQueries({ queryKey: ['technician-jobs'] });
    },
  });
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, cashAmountCents }: { id: string; status: string; cashAmountCents?: number }) =>
      jobService.updateJobStatus(id, status, cashAmountCents),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['technician-jobs'] });
      await queryClient.cancelQueries({ queryKey: ['jobs'] });

      const prevTech = queryClient.getQueriesData({ queryKey: ['technician-jobs'] });
      const prevJobs = queryClient.getQueriesData({ queryKey: ['jobs'] });

      queryClient.setQueriesData({ queryKey: ['technician-jobs'] }, (old: any) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.map((j: any) => (j.id === id ? { ...j, status } : j)),
        };
      });

      queryClient.setQueriesData({ queryKey: ['jobs'] }, (old: any) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.map((j: any) => (j.id === id ? { ...j, status } : j)),
        };
      });

      return { prevTech, prevJobs };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.prevTech) {
        context.prevTech.forEach(([key, val]: any) => queryClient.setQueryData(key, val));
      }
      if (context?.prevJobs) {
        context.prevJobs.forEach(([key, val]: any) => queryClient.setQueryData(key, val));
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['technician-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
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
      queryClient.invalidateQueries({ queryKey: ['technician-jobs'] });
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
