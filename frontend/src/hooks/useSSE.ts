import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { queryClient } from '../lib/queryClient';
import { BACKEND_ROOT_URL } from '../utils/api';

/**
 * useSSE Hook
 * Establishes Server-Sent Events stream from /api/events/stream
 * Performs purely IN-MEMORY TanStack Query cache invalidations
 * STRICT BAN: Zero usage of sessionStorage
 */
export function useSSE() {
  const { user } = useAuth();
  const { country } = useTenant();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!user) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem('xtreme_token');
    const targetCountry = country || user.countryCode || 'CA';
    const sseUrl = `${BACKEND_ROOT_URL}/api/events/stream?countryCode=${targetCountry}${token ? `&token=${encodeURIComponent(token)}` : ''}`;

    const es = new EventSource(sseUrl, { withCredentials: true });
    eventSourceRef.current = es;

    es.addEventListener('open', () => {
      // Stream connected
    });

    // In-memory query invalidation on lead events
    const handleLeadInvalidation = () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['agent-queue'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    };

    // In-memory query invalidation on job events
    const handleJobInvalidation = () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['technician-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    };

    es.addEventListener('lead:updated', handleLeadInvalidation);
    es.addEventListener('lead:created', handleLeadInvalidation);
    es.addEventListener('lead:replenished', handleLeadInvalidation);
    es.addEventListener('lead:uploaded', handleLeadInvalidation);
    es.addEventListener('leads:distributed', handleLeadInvalidation);
    es.addEventListener('campaign:batch_started', handleLeadInvalidation);
    es.addEventListener('batch:activated', handleLeadInvalidation);

    es.addEventListener('job:created', handleJobInvalidation);
    es.addEventListener('job:status_updated', handleJobInvalidation);
    es.addEventListener('job:assigned', handleJobInvalidation);

    es.onerror = () => {
      // EventSource automatically handles reconnect with exponential backoff
    };

    return () => {
      es.close();
      if (eventSourceRef.current === es) {
        eventSourceRef.current = null;
      }
    };
  }, [user?.id, country]);
}
