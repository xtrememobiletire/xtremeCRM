// frontend/src/hooks/useLiveJobTracker.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useUpdateJobStatus } from './useJobs';

// Haversine formula to calculate distance in meters between two GPS coordinates
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface UseLiveJobTrackerOptions {
  activeJob: any | null;
  autoStatusEnabled?: boolean;
  movementThresholdMeters?: number; // Distance moved to trigger EN_ROUTE (default: 40m)
  arrivalRadiusMeters?: number;     // Distance to job to trigger ON_SITE (default: 150m)
}

export function useLiveJobTracker({
  activeJob,
  autoStatusEnabled = true,
  movementThresholdMeters = 40,
  arrivalRadiusMeters = 150,
}: UseLiveJobTrackerOptions) {
  const { socket } = useSocket();
  const updateStatusMutation = useUpdateJobStatus();

  const [myLocation, setMyLocation] = useState<{
    lat: number;
    lng: number;
    heading?: number | null;
    speed?: number | null;
  } | null>(null);

  const [distanceToJobMeters, setDistanceToJobMeters] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && !navigator.geolocation) {
      return 'Geolocation is not supported by your browser.';
    }
    return null;
  });
  const [isTracking, setIsTracking] = useState<boolean>(false);

  // Refs to prevent duplicate API calls during state transitions
  const initialAnchorRef = useRef<{ lat: number; lng: number } | null>(null);
  const transitionLockRef = useRef<Record<string, boolean>>({});
  const lastSocketEmitRef = useRef<number>(0);

  // Reset anchor & locks when switching to a new job
  useEffect(() => {
    initialAnchorRef.current = null;
    transitionLockRef.current = {};
  }, [activeJob?.id]);

  // Center/Recenter trigger for "My Location" button
  const requestImmediateLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        });
        setGpsError(null);
      },
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    setIsTracking(true);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng, heading, speed } = position.coords;
        setMyLocation({ lat, lng, heading, speed });
        setGpsError(null);

        // 1. Throttle Socket.IO emissions to Dispatcher (every 4 seconds)
        const now = Date.now();
        if (socket && now - lastSocketEmitRef.current > 4000) {
          socket.emit('driver:location_update', {
            jobId: activeJob?.id,
            lat,
            lng,
            heading,
            speed,
            timestamp: new Date().toISOString(),
          });
          // Also emit driver:location for backend dispatchers
          socket.emit('driver:location', {
            driverId: activeJob?.driverId || activeJob?.driver?.id,
            lat,
            lng,
            region: activeJob?.countryCode || 'default',
          });
          lastSocketEmitRef.current = now;
        }

        if (!activeJob) return;

        const destLat = activeJob.latitude ?? activeJob.serviceLatitude;
        const destLng = activeJob.longitude ?? activeJob.serviceLongitude;

        // Establish initial anchor point when job is accepted (DISPATCHED or ACCEPTED)
        if (!initialAnchorRef.current) {
          initialAnchorRef.current = { lat, lng };
        }

        // Calculate distance to job destination if job has valid coordinates
        let distToDest: number | null = null;
        if (destLat && destLng) {
          distToDest = getDistanceInMeters(lat, lng, Number(destLat), Number(destLng));
          setDistanceToJobMeters(Math.round(distToDest));
        }

        // AUTO-UPDATES ONLY APPLY TO MIDDLE TWO OPTIONS:
        // Accept and Complete are strictly manual; completion requires payment amount.
        if (!autoStatusEnabled) return;

        // 2. AUTO-TRANSITION (Middle 1): DISPATCHED / ACCEPTED -> EN_ROUTE (When technician moves > 40m or speed > 2 m/s)
        const isDispatchedStage =
          activeJob.status === 'DISPATCHED' ||
          activeJob.status === 'ACCEPTED' ||
          activeJob.dispositionNotes === 'ACCEPTED';

        if (
          isDispatchedStage &&
          !transitionLockRef.current['EN_ROUTE'] &&
          initialAnchorRef.current
        ) {
          const movedDistance = getDistanceInMeters(
            initialAnchorRef.current.lat,
            initialAnchorRef.current.lng,
            lat,
            lng
          );
          const isMovingBySpeed = speed !== null && speed !== undefined && speed > 2.0; // > ~7.2 km/h

          if (movedDistance >= movementThresholdMeters || isMovingBySpeed) {
            transitionLockRef.current['EN_ROUTE'] = true;
            updateStatusMutation.mutate(
              { id: activeJob.id, status: 'EN_ROUTE' },
              {
                onError: () => {
                  transitionLockRef.current['EN_ROUTE'] = false;
                },
              }
            );
          }
        }

        // 3. AUTO-TRANSITION (Middle 2): EN_ROUTE -> ON_SITE (When arriving at job location <= 150m)
        const isEnRouteStage =
          activeJob.status === 'EN_ROUTE' || activeJob.dispositionNotes === 'EN_ROUTE';

        if (
          isEnRouteStage &&
          !transitionLockRef.current['ON_SITE'] &&
          distToDest !== null &&
          distToDest <= arrivalRadiusMeters
        ) {
          transitionLockRef.current['ON_SITE'] = true;
          updateStatusMutation.mutate(
            { id: activeJob.id, status: 'ON_SITE' },
            {
              onError: () => {
                transitionLockRef.current['ON_SITE'] = false;
              },
            }
          );
        }
      },
      (error) => {
        setGpsError(error.message);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsTracking(false);
    };
  }, [
    activeJob,
    autoStatusEnabled,
    movementThresholdMeters,
    arrivalRadiusMeters,
    socket,
    updateStatusMutation,
  ]);

  return {
    myLocation,
    distanceToJobMeters,
    gpsError,
    isTracking,
    isUpdatingStatus: updateStatusMutation.isPending,
    requestImmediateLocation,
  };
}

export default useLiveJobTracker;
