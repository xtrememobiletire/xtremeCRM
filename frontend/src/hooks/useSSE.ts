import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { queryClient } from '../lib/queryClient';
import { BACKEND_ROOT_URL } from '../utils/api';

/**
 * useSSE Hook
 * High-performance Server-Sent Events stream from /api/events/stream
 * 
 * 1. Direct in-memory mutation (setQueriesData) for single entity events (0 network roundtrips)
 * 2. 150ms debounced invalidation batcher for bulk events (stops request storms)
 * 3. Scoped replenishment targeting specific VAs
 * STRICT BAN: Zero usage of sessionStorage or localStorage for query caches
 */
export function useSSE() {
  const { user } = useAuth();
  const { country } = useTenant();
  const eventSourceRef = useRef<EventSource | null>(null);

  // In-memory debouncer for invalidation requests
  const pendingInvalidationsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const scheduleInvalidation = (keys: string[]) => {
      keys.forEach((k) => pendingInvalidationsRef.current.add(k));
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        const keysToInvalidate = Array.from(pendingInvalidationsRef.current);
        pendingInvalidationsRef.current.clear();
        keysToInvalidate.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }, 150);
    };

    // Direct in-memory mutation for lead updates (zero HTTP refetch)
    const patchLeadCache = (updatedLead: any) => {
      if (!updatedLead?.id) return;

      queryClient.setQueriesData({ queryKey: ['leads'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.map((lead: any) =>
              lead.id === updatedLead.id ? { ...lead, ...updatedLead } : lead
            ),
          };
        }
        if (Array.isArray(oldData)) {
          return oldData.map((lead: any) =>
            lead.id === updatedLead.id ? { ...lead, ...updatedLead } : lead
          );
        }
        return oldData;
      });

      queryClient.setQueriesData({ queryKey: ['agent-queue'] }, (oldQueue: any) => {
        if (!oldQueue) return oldQueue;
        const updateList = (list: any[]) =>
          Array.isArray(list)
            ? list.map((l: any) => (l.id === updatedLead.id ? { ...l, ...updatedLead } : l))
            : list;

        return {
          ...oldQueue,
          leads: updateList(oldQueue.leads),
          scheduledCallbacks: updateList(oldQueue.scheduledCallbacks),
        };
      });
    };

    // Direct in-memory mutation for job updates (zero HTTP refetch)
    const patchJobCache = (jobPayload: any) => {
      const jobId = jobPayload?.id || jobPayload?.jobId;
      if (!jobId) return;

      queryClient.setQueriesData({ queryKey: ['jobs'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.map((job: any) =>
              (job.id === jobId ? { ...job, ...jobPayload } : job)
            ),
          };
        }
        if (Array.isArray(oldData)) {
          return oldData.map((job: any) =>
            (job.id === jobId ? { ...job, ...jobPayload } : job)
          );
        }
        return oldData;
      });

      queryClient.setQueriesData({ queryKey: ['technician-jobs'] }, (oldJobs: any) => {
        if (!Array.isArray(oldJobs)) return oldJobs;
        return oldJobs.map((job: any) =>
          (job.id === jobId ? { ...job, ...jobPayload } : job)
        );
      });

      queryClient.setQueriesData({ queryKey: ['job', jobId] }, (oldJob: any) => {
        if (!oldJob) return oldJob;
        return { ...oldJob, ...jobPayload };
      });
    };

    const token = localStorage.getItem('xtreme_token');
    const targetCountry = country || user.countryCode || 'CA';
    const sseUrl = `${BACKEND_ROOT_URL}/api/events/stream?countryCode=${targetCountry}${token ? `&token=${encodeURIComponent(token)}` : ''}`;

    const es = new EventSource(sseUrl, { withCredentials: true });
    eventSourceRef.current = es;

    // Lead Event Handlers
    const handleLeadUpdated = (event: MessageEvent) => {
      try {
        const lead = JSON.parse(event.data);
        patchLeadCache(lead);
      } catch {
        scheduleInvalidation(['leads', 'agent-queue']);
      }
    };

    const handleLeadCreated = (event: MessageEvent) => {
      try {
        const lead = JSON.parse(event.data);
        queryClient.setQueriesData({ queryKey: ['leads'] }, (oldData: any) => {
          if (!oldData) return oldData;
          if (Array.isArray(oldData.data)) {
            if (oldData.data.some((l: any) => l.id === lead.id)) return oldData;
            return {
              ...oldData,
              data: [lead, ...oldData.data],
              total: (oldData.total || oldData.data.length) + 1,
            };
          }
          return oldData;
        });
      } catch {
        scheduleInvalidation(['leads']);
      }
      scheduleInvalidation(['dashboard-stats']);
    };

    const handleLeadReplenished = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data || '{}');
        const isTargetVa = data.vaId && data.vaId === user.id;
        const isAdminOrGm = ['ADMIN', 'GENERAL_MANAGER'].includes(user.role || '');

        if (isTargetVa || isAdminOrGm) {
          scheduleInvalidation(['agent-queue', 'leads', 'dashboard-stats']);
        }
      } catch {
        scheduleInvalidation(['agent-queue', 'leads']);
      }
    };

    const handleBulkLeadsChanged = () => {
      scheduleInvalidation(['leads', 'agent-queue', 'dashboard-stats']);
    };

    // Job Event Handlers
    const handleJobStatusUpdated = (event: MessageEvent) => {
      try {
        const job = JSON.parse(event.data);
        patchJobCache(job);
      } catch {
        scheduleInvalidation(['jobs', 'technician-jobs', 'dispatch-jobs']);
      }
      scheduleInvalidation(['dashboard-stats']);
    };

    const handleJobCreated = (event: MessageEvent) => {
      try {
        const job = JSON.parse(event.data);
        queryClient.setQueriesData({ queryKey: ['jobs'] }, (oldData: any) => {
          if (!oldData) return oldData;
          if (Array.isArray(oldData.data)) {
            if (oldData.data.some((j: any) => j.id === job.id)) return oldData;
            return {
              ...oldData,
              data: [job, ...oldData.data],
              total: (oldData.total || oldData.data.length) + 1,
            };
          }
          return oldData;
        });
      } catch {
        scheduleInvalidation(['jobs', 'dispatch-jobs']);
      }
      scheduleInvalidation(['dashboard-stats']);
    };

    const handleBulkJobsChanged = () => {
      scheduleInvalidation(['jobs', 'technician-jobs', 'dispatch-jobs', 'dashboard-stats']);
    };

    es.addEventListener('lead:updated', handleLeadUpdated);
    es.addEventListener('lead:created', handleLeadCreated);
    es.addEventListener('lead:replenished', handleLeadReplenished);
    es.addEventListener('lead:uploaded', handleBulkLeadsChanged);
    es.addEventListener('leads:distributed', handleBulkLeadsChanged);
    es.addEventListener('campaign:batch_started', handleBulkLeadsChanged);
    es.addEventListener('batch:activated', handleBulkLeadsChanged);

    es.addEventListener('job:created', handleJobCreated);
    es.addEventListener('job:status_updated', handleJobStatusUpdated);
    es.addEventListener('job:assigned', handleJobStatusUpdated);
    es.addEventListener('jobs:bulk_updated', handleBulkJobsChanged);

    es.onerror = () => {
      // EventSource automatically handles reconnect with exponential backoff
    };

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      es.close();
      if (eventSourceRef.current === es) {
        eventSourceRef.current = null;
      }
    };
  }, [user?.id, user?.role, country]);
}
