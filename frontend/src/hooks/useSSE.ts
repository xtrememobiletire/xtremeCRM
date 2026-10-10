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
 * 4. Visibility & Online auto-reconnection: heals connection immediately on laptop wake/network return
 * 5. Full entity coverage: Jobs, Leads, Bookings, Customers, Fleets, Invoices
 * STRICT BAN: Zero usage of sessionStorage or localStorage for query caches
 */
export function useSSE() {
  const { user } = useAuth();
  const { country } = useTenant();
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastActivityRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      const updateJobItem = (job: any) =>
        (job.id === jobId || job.jobId === jobId) ? { ...job, ...jobPayload, id: job.id || jobId } : job;

      // 1. General jobs list
      queryClient.setQueriesData({ queryKey: ['jobs'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.map(updateJobItem),
          };
        }
        if (Array.isArray(oldData)) {
          return oldData.map(updateJobItem);
        }
        return oldData;
      });

      // 2. Technician assigned jobs (handles envelope { data: [...] } and raw arrays)
      queryClient.setQueriesData({ queryKey: ['technician-jobs'] }, (oldJobs: any) => {
        if (!oldJobs) return oldJobs;
        if (Array.isArray(oldJobs.data)) {
          return {
            ...oldJobs,
            data: oldJobs.data.map(updateJobItem),
          };
        }
        if (Array.isArray(oldJobs)) {
          return oldJobs.map(updateJobItem);
        }
        return oldJobs;
      });

      // 3. Single job view
      queryClient.setQueriesData({ queryKey: ['job', jobId] }, (oldJob: any) => {
        if (!oldJob) return oldJob;
        return { ...oldJob, ...jobPayload, id: oldJob.id || jobId };
      });

      // 4. Inbound Bookings queue
      queryClient.setQueriesData({ queryKey: ['bookings-queue'] }, (oldBookings: any) => {
        if (!oldBookings) return oldBookings;
        if (Array.isArray(oldBookings.data)) {
          return {
            ...oldBookings,
            data: oldBookings.data.map(updateJobItem),
          };
        }
        if (Array.isArray(oldBookings)) {
          return oldBookings.map(updateJobItem);
        }
        return oldBookings;
      });

      scheduleInvalidation(['pending-jobs-count', 'dispatch-map-jobs']);
    };

    const targetCountry = country || user.countryCode || 'CA';
    const sseUrl = `${BACKEND_ROOT_URL}/api/events/stream?countryCode=${targetCountry}`;

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const es = new EventSource(sseUrl, { withCredentials: true });
      eventSourceRef.current = es;
      lastActivityRef.current = Date.now();

      // Hearbeat activity tracker
      es.addEventListener('ping', () => {
        lastActivityRef.current = Date.now();
      });

      // Lead Event Handlers
      const handleLeadUpdated = (event: MessageEvent) => {
        lastActivityRef.current = Date.now();
        try {
          const lead = JSON.parse(event.data);
          patchLeadCache(lead);
        } catch {
          scheduleInvalidation(['leads', 'agent-queue']);
        }
      };

      const handleLeadCreated = (event: MessageEvent) => {
        lastActivityRef.current = Date.now();
        try {
          const payload = JSON.parse(event.data);
          const lead = payload?.lead || payload;
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
        lastActivityRef.current = Date.now();
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
        lastActivityRef.current = Date.now();
        scheduleInvalidation(['lead-stats', 'leads', 'agent-queue', 'dashboard-stats']);
      };

      const handleLeadStatsUpdated = () => {
        lastActivityRef.current = Date.now();
        scheduleInvalidation(['lead-stats', 'leads', 'agent-queue', 'dashboard-stats']);
      };

      // Job Event Handlers
      const handleJobStatusUpdated = (event: MessageEvent) => {
        lastActivityRef.current = Date.now();
        try {
          const job = JSON.parse(event.data);
          patchJobCache(job);
        } catch {
          scheduleInvalidation(['jobs', 'technician-jobs', 'dispatch-jobs']);
        }
        scheduleInvalidation(['dashboard-stats', 'pending-jobs-count']);
      };

      const handleJobCreated = (event: MessageEvent) => {
        lastActivityRef.current = Date.now();
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
        scheduleInvalidation(['dashboard-stats', 'pending-jobs-count', 'dispatch-map-jobs']);
      };

      const handleBookingCreated = (event: MessageEvent) => {
        lastActivityRef.current = Date.now();
        try {
          const booking = JSON.parse(event.data);
          queryClient.setQueriesData({ queryKey: ['bookings-queue'] }, (oldData: any) => {
            if (!oldData) return oldData;
            if (Array.isArray(oldData.data)) {
              if (oldData.data.some((j: any) => j.id === booking.id)) return oldData;
              return {
                ...oldData,
                data: [booking, ...oldData.data],
                total: (oldData.total || oldData.data.length) + 1,
              };
            }
            return oldData;
          });
        } catch {
          scheduleInvalidation(['bookings-queue']);
        }
        scheduleInvalidation(['pending-jobs-count', 'dashboard-stats']);
      };

      const handleJobDeleted = (event: MessageEvent) => {
        lastActivityRef.current = Date.now();
        try {
          const { id } = JSON.parse(event.data);
          if (id) {
            queryClient.setQueriesData({ queryKey: ['jobs'] }, (old: any) => {
              if (!old) return old;
              if (Array.isArray(old.data)) return { ...old, data: old.data.filter((j: any) => j.id !== id) };
              if (Array.isArray(old)) return old.filter((j: any) => j.id !== id);
              return old;
            });
            queryClient.setQueriesData({ queryKey: ['technician-jobs'] }, (old: any) => {
              if (!old) return old;
              if (Array.isArray(old.data)) return { ...old, data: old.data.filter((j: any) => j.id !== id) };
              if (Array.isArray(old)) return old.filter((j: any) => j.id !== id);
              return old;
            });
          }
        } catch {
          scheduleInvalidation(['jobs', 'technician-jobs']);
        }
        scheduleInvalidation(['pending-jobs-count', 'dashboard-stats']);
      };

      const handleBulkJobsChanged = () => {
        lastActivityRef.current = Date.now();
        scheduleInvalidation(['jobs', 'technician-jobs', 'dispatch-jobs', 'dashboard-stats', 'pending-jobs-count']);
      };

      // Customer & Fleet & Accounting Event Handlers
      const handleCustomerChanged = () => {
        lastActivityRef.current = Date.now();
        scheduleInvalidation(['customers', 'dispatch-map-customers']);
      };

      const handleFleetChanged = () => {
        lastActivityRef.current = Date.now();
        scheduleInvalidation(['fleets', 'dispatch-map-fleets', 'fleet-dashboard']);
      };

      const handleInvoiceChanged = () => {
        lastActivityRef.current = Date.now();
        scheduleInvalidation(['invoices', 'accounting-reconciliation', 'accounting-summary']);
      };

      // Lead listeners
      es.addEventListener('lead:updated', handleLeadUpdated);
      es.addEventListener('lead:created', handleLeadCreated);
      es.addEventListener('lead:replenished', handleLeadReplenished);
      es.addEventListener('lead:uploaded', handleBulkLeadsChanged);
      es.addEventListener('lead:stats_updated', handleLeadStatsUpdated);
      es.addEventListener('lead:transferred', handleBulkLeadsChanged);
      es.addEventListener('leads:distributed', handleBulkLeadsChanged);
      es.addEventListener('campaign:batch_started', handleBulkLeadsChanged);
      es.addEventListener('batch:activated', handleBulkLeadsChanged);
      es.addEventListener('batch:completed', handleBulkLeadsChanged);

      // Job listeners
      es.addEventListener('job:created', handleJobCreated);
      es.addEventListener('job:status_updated', handleJobStatusUpdated);
      es.addEventListener('job:assigned', handleJobStatusUpdated);
      es.addEventListener('job:driver_assigned', handleJobStatusUpdated);
      es.addEventListener('job:verified', handleJobStatusUpdated);
      es.addEventListener('job:deleted', handleJobDeleted);
      es.addEventListener('booking:created', handleBookingCreated);
      es.addEventListener('jobs:bulk_updated', handleBulkJobsChanged);

      // Customer, Fleet, Invoice listeners
      es.addEventListener('customer:created', handleCustomerChanged);
      es.addEventListener('customer:updated', handleCustomerChanged);
      es.addEventListener('fleet:created', handleFleetChanged);
      es.addEventListener('fleet:updated', handleFleetChanged);
      es.addEventListener('invoice:created', handleInvoiceChanged);
      es.addEventListener('invoice:updated', handleInvoiceChanged);

      es.onerror = () => {
        // If stream permanently closed, schedule immediate reconnect with backoff
        if (es.readyState === EventSource.CLOSED) {
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSSE();
          }, 2500);
        }
      };
    };

    connectSSE();

    // Wakeup & Online sync: guarantees instant refresh when user returns to their laptop
    const handleWakeup = () => {
      if (document.visibilityState === 'visible' || (typeof navigator !== 'undefined' && navigator.onLine)) {
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        const isClosed = !eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED;

        // If closed or stream went silent during sleep (>35s), reconnect stream immediately
        if (isClosed || timeSinceActivity > 35000) {
          connectSSE();
        }

        // Invalidate active query caches so screens immediately catch up with changes
        scheduleInvalidation([
          'jobs',
          'technician-jobs',
          'leads',
          'agent-queue',
          'pending-jobs-count',
          'bookings-queue',
          'dashboard-stats',
          'dispatch-map-jobs',
          'fleets',
          'customers',
        ]);
      }
    };

    // Stalled connection watchdog (every 20 seconds)
    const watchdogTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        if (Date.now() - lastActivityRef.current > 45000) {
          connectSSE();
        }
      }
    }, 20000);

    document.addEventListener('visibilitychange', handleWakeup);
    window.addEventListener('online', handleWakeup);
    window.addEventListener('focus', handleWakeup);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      clearInterval(watchdogTimer);
      document.removeEventListener('visibilitychange', handleWakeup);
      window.removeEventListener('online', handleWakeup);
      window.removeEventListener('focus', handleWakeup);

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [user?.id, user?.role, country]);
}
