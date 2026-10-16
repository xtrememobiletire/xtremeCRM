import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { queryClient } from '../lib/queryClient';
import { BACKEND_ROOT_URL } from '../utils/api';

/**
 * useSSE Hook
 * High-performance Server-Sent Events stream from /api/events/stream
 * 
 * 1. Direct lead/job cache updates plus invalidation of related queries
 * 2. 150ms debounced invalidation batcher for bulk events (stops request storms)
 * 3. Scoped replenishment targeting specific VAs
 * 4. Visibility and online listeners refresh caches and reconnect closed or inactive streams
 * 5. Full entity coverage: Jobs, Leads, Bookings, Customers, Fleets, Invoices
 * STRICT BAN: Zero usage of sessionStorage or localStorage for query caches
 */
export function useSSE() {
  const { user } = useAuth();
  const { country } = useTenant();
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastEventIdRef = useRef<string | null>(null);
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

      const effectiveStatus = (jobPayload.dispositionNotes && ['EN_ROUTE', 'ON_SCENE', 'ARRIVED', 'ACCEPTED'].includes(jobPayload.dispositionNotes) && (jobPayload.status === 'IN_PROGRESS' || jobPayload.status === 'ASSIGNED'))
        ? (jobPayload.dispositionNotes === 'ARRIVED' ? 'ON_SCENE' : (jobPayload.dispositionNotes === 'ACCEPTED' ? 'ASSIGNED' : jobPayload.dispositionNotes))
        : jobPayload.status;

      const normalizedPayload = {
        ...jobPayload,
        ...(effectiveStatus ? { status: effectiveStatus } : {}),
        ...(jobPayload.totalCents !== undefined ? { totalAmount: jobPayload.totalCents } : {}),
      };

      const updateJobItem = (job: any) =>
        (job.id === jobId || job.jobId === jobId) ? { ...job, ...normalizedPayload, id: job.id || jobId } : job;

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

      // 2. Commercial Fleet jobs list
      queryClient.setQueriesData({ queryKey: ['fleet-jobs'] }, (oldData: any) => {
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
        const hasDriverId = 'driverId' in jobPayload;
        const isAssignedToMe = Boolean(
          user?.id && (
            jobPayload.driverId === user.id ||
            jobPayload.driver?.id === user.id
          )
        );

        if (hasDriverId && !isAssignedToMe) {
          // Explicitly unassigned or assigned to someone else: remove from my technician-jobs cache
          if (Array.isArray(oldJobs.data)) {
            const wasPresent = oldJobs.data.some((j: any) => j.id === jobId || j.jobId === jobId);
            if (!wasPresent) return oldJobs;
            return {
              ...oldJobs,
              data: oldJobs.data.filter((j: any) => j.id !== jobId && j.jobId !== jobId),
              total: typeof oldJobs.total === 'number'
                ? Math.max(0, oldJobs.total - 1)
                : Math.max(0, oldJobs.data.length - 1),
            };
          }
          if (Array.isArray(oldJobs)) {
            const wasPresent = oldJobs.some((j: any) => j.id === jobId || j.jobId === jobId);
            if (!wasPresent) return oldJobs;
            return oldJobs.filter((j: any) => j.id !== jobId && j.jobId !== jobId);
          }
          return oldJobs;
        }

        if (Array.isArray(oldJobs.data)) {
          const exists = oldJobs.data.some((j: any) => j.id === jobId || j.jobId === jobId);
          if (exists) {
            return {
              ...oldJobs,
              data: oldJobs.data.map(updateJobItem),
            };
          }
          if (isAssignedToMe) {
            return {
              ...oldJobs,
              data: [jobPayload, ...oldJobs.data],
              total: (oldJobs.total || oldJobs.data.length) + 1,
            };
          }
          return oldJobs;
        }
        if (Array.isArray(oldJobs)) {
          const exists = oldJobs.some((j: any) => j.id === jobId || j.jobId === jobId);
          if (exists) return oldJobs.map(updateJobItem);
          if (isAssignedToMe) return [jobPayload, ...oldJobs];
          return oldJobs;
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

    /**
     * Replace the active SSE connection and subscribe to lead, job, and billing events.
     * Without a stored auth token, close the connection and stop. Closed streams
     * schedule a reconnect after 3.5 seconds while a token remains present.
     */
    const connectSSE = () => {
      const currentToken = typeof window !== 'undefined' ? localStorage.getItem('xtreme_token') : null;
      if (!currentToken) {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        return;
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      let sseUrl = `${BACKEND_ROOT_URL}/api/events/stream?countryCode=${targetCountry}`;
      if (lastEventIdRef.current) {
        sseUrl += `&lastEventId=${encodeURIComponent(lastEventIdRef.current)}`;
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

      /**
       * Record stream activity and schedule invoice list, fleet billing, and accounting
       * query invalidation through the shared debouncer.
       */
      const handleInvoiceChanged = () => {
        lastActivityRef.current = Date.now();
        scheduleInvalidation(['invoices', 'accounting-invoices', 'fleet-billing-summary', 'accounting-reconciliation', 'accounting-summary']);
      };

      const listen = (eventName: string, handler: (e: MessageEvent) => void) => {
        es.addEventListener(eventName, (e: any) => {
          if (e.lastEventId) {
            lastEventIdRef.current = e.lastEventId;
          }
          handler(e);
        });
      };

      // Lead listeners
      listen('lead:updated', handleLeadUpdated);
      listen('lead:created', handleLeadCreated);
      listen('lead:replenished', handleLeadReplenished);
      listen('lead:uploaded', handleBulkLeadsChanged);
      listen('lead:stats_updated', handleLeadStatsUpdated);
      listen('lead:transferred', handleBulkLeadsChanged);
      listen('leads:distributed', handleBulkLeadsChanged);
      listen('campaign:batch_started', handleBulkLeadsChanged);
      listen('batch:activated', handleBulkLeadsChanged);
      listen('batch:completed', handleBulkLeadsChanged);

      // Job listeners
      listen('job:created', handleJobCreated);
      listen('job:updated', handleJobStatusUpdated);
      listen('job:status_updated', handleJobStatusUpdated);
      listen('job:assigned', handleJobStatusUpdated);
      listen('job:driver_assigned', handleJobStatusUpdated);
      listen('job:verified', handleJobStatusUpdated);
      listen('job:deleted', handleJobDeleted);
      listen('booking:created', handleBookingCreated);
      listen('jobs:bulk_updated', handleBulkJobsChanged);

      // Customer, Fleet, Invoice listeners
      listen('customer:created', handleCustomerChanged);
      listen('customer:updated', handleCustomerChanged);
      listen('fleet:created', handleFleetChanged);
      listen('fleet:updated', handleFleetChanged);
      listen('invoice:created', handleInvoiceChanged);
      listen('invoice:updated', handleInvoiceChanged);

      es.onerror = () => {
        // If stream closed or errored, close instance and retry only if user remains logged in
        if (es.readyState === EventSource.CLOSED) {
          es.close();
          const currentToken = typeof window !== 'undefined' ? localStorage.getItem('xtreme_token') : null;
          if (!currentToken) return;
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            const tokenStillValid = typeof window !== 'undefined' ? localStorage.getItem('xtreme_token') : null;
            if (tokenStillValid) {
              connectSSE();
            }
          }, 3500);
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
