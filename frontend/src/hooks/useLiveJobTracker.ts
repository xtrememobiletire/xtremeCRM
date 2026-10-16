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
  destinationCoords?: [number, number] | null; // [lng, lat]
  autoStatusEnabled?: boolean;
  movementThresholdMeters?: number; // Distance moved to trigger EN_ROUTE (default: 40m)
  arrivalRadiusMeters?: number;     // Distance to job to trigger ON_SCENE (default: 150m)
}

export function useLiveJobTracker({
  activeJob,
  destinationCoords,
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
  const myLocationRef = useRef(myLocation);
  useEffect(() => {
    myLocationRef.current = myLocation;
  }, [myLocation]);

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
      (err) => {
        // Fallback to standard network/wifi accuracy if high accuracy times out (e.g. desktop/laptop or indoors)
        if (err.code === err.TIMEOUT) {
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
            (fallbackErr) => {
              if (!myLocationRef.current) {
                setGpsError(fallbackErr.message);
              }
            },
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 30000 }
          );
          return;
        }
        if (!myLocationRef.current) {
          setGpsError(err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
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

        // Resolve destination coordinates from prop or job object
        const destLat = destinationCoords
          ? destinationCoords[1]
          : activeJob.latitude ?? activeJob.serviceLatitude;
        const destLng = destinationCoords
          ? destinationCoords[0]
          : activeJob.longitude ?? activeJob.serviceLongitude;

        // Establish initial anchor point when job is accepted
        if (!initialAnchorRef.current) {
          initialAnchorRef.current = { lat, lng };
        }

        // Calculate distance to job destination if destination has valid coordinates
        let distToDest: number | null = null;
        if (destLat && destLng && !isNaN(Number(destLat)) && !isNaN(Number(destLng))) {
          distToDest = getDistanceInMeters(lat, lng, Number(destLat), Number(destLng));
          setDistanceToJobMeters(Math.round(distToDest));
        }

        // AUTO-UPDATES ONLY APPLY TO MIDDLE TWO OPTIONS:
        // Accept and Complete are strictly manual; completion requires payment amount.
        if (!autoStatusEnabled) return;

        // 2. AUTO-TRANSITION (Middle 1): ACCEPTED -> EN_ROUTE (When technician moves > 40m or speed > 2 m/s)
        const isAcceptedStage =
          activeJob.status === 'ACCEPTED' ||
          activeJob.status === 'ASSIGNED' ||
          activeJob.dispositionNotes === 'ACCEPTED';

        if (
          isAcceptedStage &&
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

        // 3. AUTO-TRANSITION (Middle 2): EN_ROUTE -> ON_SCENE (When arriving at job location <= 150m)
        const isEnRouteStage =
          activeJob.status === 'EN_ROUTE' || activeJob.dispositionNotes === 'EN_ROUTE';

        if (
          isEnRouteStage &&
          !transitionLockRef.current['ON_SCENE'] &&
          distToDest !== null &&
          distToDest <= arrivalRadiusMeters
        ) {
          transitionLockRef.current['ON_SCENE'] = true;
          updateStatusMutation.mutate(
            { id: activeJob.id, status: 'ON_SCENE' },
            {
              onError: () => {
                transitionLockRef.current['ON_SCENE'] = false;
              },
            }
          );
        }
      },
      (error) => {
        // Timeout expired is normal during idle/stationary intervals or weak satellite reception
        if (error.code === error.TIMEOUT) {
          // If we already have a valid position, keep tracking and do not alarm user
          if (myLocationRef.current) {
            return;
          }
          // Try acquiring with standard accuracy as fallback
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
            () => {},
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
          );
          return;
        }

        if (error.code === error.PERMISSION_DENIED) {
          setGpsError('Location permission denied. Please allow GPS access in browser settings.');
          setIsTracking(false);
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          if (!myLocationRef.current) {
            setGpsError('GPS signal unavailable. Searching for satellite or network fix...');
            setIsTracking(false);
          }
        } else {
          if (!myLocationRef.current) {
            setGpsError(error.message);
            setIsTracking(false);
          }
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 30000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsTracking(false);
    };
  }, [
    activeJob,
    destinationCoords,
    autoStatusEnabled,
    movementThresholdMeters,
    arrivalRadiusMeters,
    socket,
    updateStatusMutation,
  ]);

  return {
    myLocation,
    distanceToJobMeters,
    displacementMeters: distanceToJobMeters,
    gpsError,
    isTracking,
    isUpdatingStatus: updateStatusMutation.isPending,
    requestImmediateLocation,
  };
}

export default useLiveJobTracker;
