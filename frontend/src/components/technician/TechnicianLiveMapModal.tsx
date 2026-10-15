// frontend/src/components/technician/TechnicianLiveMapModal.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  X,
  Maximize2,
  Minimize2,
  LocateFixed,
  Navigation,
  MapPin,
  Phone,
  Radio,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useMapbox } from '../../hooks/useMapbox';
import { MAPBOX_TOKEN } from '../../constants/mapboxConfig';
import { mapService } from '../../services/mapService';
import { getNavigationUrl } from '../../utils/navigation';
import { TechnicianJobDetailModal } from './TechnicianJobDetailModal';

interface TechnicianLiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any | null;
  currencySymbol?: string;
  onOpenPaymentModal: (job: any) => void;
  onStatusUpdate: (jobId: string, status: string) => void;
  myLocation?: { lat: number; lng: number; heading?: number | null; speed?: number | null } | null;
  distanceToJobMeters?: number | null;
  displacementMeters?: number | null;
  isTracking?: boolean;
  gpsError?: string | null;
  requestImmediateLocation?: () => void;
}

// Calculate straight-line geodesic displacement (shortest path magnitude in physics)
const calculateDisplacementMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDisplacement = (meters: number | null): string => {
  if (meters === null || isNaN(meters)) return '';
  if (meters >= 1000) {
    const km = (meters / 1000).toFixed(1);
    const mi = (meters / 1609.34).toFixed(1);
    return `${km} km (${mi} mi)`;
  }
  return `${Math.round(meters)} m`;
};

export const TechnicianLiveMapModal: React.FC<TechnicianLiveMapModalProps> = ({
  isOpen,
  onClose,
  job,
  currencySymbol = '$',
  onOpenPaymentModal,
  onStatusUpdate,
  myLocation,
  distanceToJobMeters,
  displacementMeters: propDisplacementMeters,
  isTracking = false,
  gpsError,
  requestImmediateLocation,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [roadRouteCoords, setRoadRouteCoords] = useState<[number, number][] | null>(null);
  const [roadDistanceMeters, setRoadDistanceMeters] = useState<number | null>(null);
  const [roadDurationSeconds, setRoadDurationSeconds] = useState<number | null>(null);

  const techMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const jobMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const displacementMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hasAutoFittedRef = useRef<string | null>(null);
  const lastFetchedRouteOriginRef = useRef<[number, number] | null>(null);

  // Initialize Mapbox map instance
  const { containerRef, map, isLoaded } = useMapbox({
    center: [-79.3832, 43.6532],
    zoom: 13,
    enabled: isOpen,
  });

  // Shortest path displacement calculation (Euclidean/geodesic straight-line vector in physics)
  const computedDisplacementMeters = useMemo(() => {
    if (typeof propDisplacementMeters === 'number' && !isNaN(propDisplacementMeters)) {
      return propDisplacementMeters;
    }
    if (typeof distanceToJobMeters === 'number' && !isNaN(distanceToJobMeters)) {
      return distanceToJobMeters;
    }
    if (!myLocation || !destinationCoords) return null;
    return calculateDisplacementMeters(
      myLocation.lat,
      myLocation.lng,
      destinationCoords[1],
      destinationCoords[0]
    );
  }, [propDisplacementMeters, distanceToJobMeters, myLocation, destinationCoords]);

  // Fetch actual driving road route from Mapbox Directions API (following streets, not in the air)
  useEffect(() => {
    if (!myLocation || !destinationCoords || !MAPBOX_TOKEN) {
      setRoadRouteCoords(null);
      return;
    }

    const startLng = myLocation.lng;
    const startLat = myLocation.lat;
    const destLng = destinationCoords[0];
    const destLat = destinationCoords[1];

    // Throttle: if origin moved < 35 meters and we already have route coords, don't re-query
    if (lastFetchedRouteOriginRef.current && roadRouteCoords && roadRouteCoords.length > 0) {
      const movedMeters = calculateDisplacementMeters(
        lastFetchedRouteOriginRef.current[1],
        lastFetchedRouteOriginRef.current[0],
        startLat,
        startLng
      );
      if (movedMeters < 35) {
        return;
      }
    }

    const abortController = new AbortController();

    const dirUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${destLng},${destLat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

    fetch(dirUrl, { signal: abortController.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Directions error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const route = data?.routes?.[0];
        if (route?.geometry?.coordinates && route.geometry.coordinates.length > 1) {
          lastFetchedRouteOriginRef.current = [startLng, startLat];
          setRoadRouteCoords(route.geometry.coordinates as [number, number][]);
          setRoadDistanceMeters(typeof route.distance === 'number' ? route.distance : null);
          setRoadDurationSeconds(typeof route.duration === 'number' ? route.duration : null);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('[TechnicianLiveMapModal] Failed to fetch driving route:', err);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [myLocation?.lat, myLocation?.lng, destinationCoords?.[0], destinationCoords?.[1]]);

  // Resolve Destination Coordinates (From job coords or geocoding fallback)
  useEffect(() => {
    if (!isOpen || !job) {
      return;
    }

    const rawLat = job.latitude ?? job.serviceLatitude;
    const rawLng = job.longitude ?? job.serviceLongitude;

    if (
      rawLat !== null &&
      rawLat !== undefined &&
      rawLng !== null &&
      rawLng !== undefined &&
      !isNaN(Number(rawLat)) &&
      !isNaN(Number(rawLng)) &&
      (Number(rawLat) !== 0 || Number(rawLng) !== 0)
    ) {
      setDestinationCoords([Number(rawLng), Number(rawLat)]);
      return;
    }

    const address = job.locationAddress || job.serviceAddress;
    if (address) {
      setIsGeocoding(true);
      let isMounted = true;
      mapService
        .geocode(address, job.countryCode)
        .then((res) => {
          if (isMounted && res && res.latitude && res.longitude) {
            setDestinationCoords([res.longitude, res.latitude]);
          }
        })
        .catch((err) => {
          console.warn('[TechnicianLiveMapModal] Geocode fallback error:', err);
        })
        .finally(() => {
          if (isMounted) setIsGeocoding(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [
    isOpen,
    job?.id,
    job?.latitude,
    job?.longitude,
    job?.serviceLatitude,
    job?.serviceLongitude,
    job?.locationAddress,
    job?.serviceAddress,
    job?.countryCode,
  ]);

  // Smoothly resize map canvas when toggling expanded mode or opening
  useEffect(() => {
    if (map && isLoaded) {
      const timer = setTimeout(() => map.resize(), 120);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, isOpen, isLoaded, map]);

  // Center/Fly to destination on initial load
  useEffect(() => {
    if (!map || !isLoaded || !destinationCoords) return;
    map.flyTo({
      center: destinationCoords,
      zoom: 14,
      essential: true,
      duration: 1000,
    });
  }, [destinationCoords, map, isLoaded]);

  // Update Technician Live Marker
  useEffect(() => {
    if (!map || !isLoaded || !myLocation) return;

    if (!techMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'tech-live-marker';
      el.innerHTML = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 34px; height: 34px; background: rgba(16, 185, 129, 0.4); border-radius: 9999px; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 18px; height: 18px; background: #10b981; border: 3px solid #ffffff; border-radius: 9999px; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
        </div>
      `;

      techMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([myLocation.lng, myLocation.lat])
        .setPopup(new mapboxgl.Popup({ offset: 16 }).setHTML('<strong>My Location</strong>'))
        .addTo(map);
    } else {
      techMarkerRef.current.setLngLat([myLocation.lng, myLocation.lat]);
    }
  }, [myLocation, isLoaded, map]);

  // Update Job Destination Marker & Highlighted Shortest Displacement Path
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (jobMarkerRef.current) {
      jobMarkerRef.current.remove();
      jobMarkerRef.current = null;
    }

    if (destinationCoords) {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="background: #ef4444; color: white; padding: 5px 10px; border-radius: 999px; font-weight: 700; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; cursor: pointer;">
          <span>#${job?.jobCode || job?.jobNumber || 'JOB'}</span>
        </div>
      `;

      const customerLabel = job?.customer?.fullName || job?.customer?.name || job?.recipientName || 'Customer';
      const addressLabel = job?.locationAddress || job?.serviceAddress || 'Job Location';

      jobMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(destinationCoords)
        .setPopup(
          new mapboxgl.Popup({ offset: 20 }).setHTML(
            `<div style="font-size:12px; padding: 2px;"><strong>${customerLabel}</strong><br/>${addressLabel}</div>`
          )
        )
        .addTo(map);
    }

    // Draw / Highlight Shortest Driving Way (Following roads/streets, NOT in the air)
    const sourceId = 'modal-tech-job-route';
    const casingLayerId = 'modal-tech-job-route-casing';
    const coreLayerId = 'modal-tech-job-route-core';
    const dashLayerId = 'modal-tech-job-route-dash';
    const hasBothPoints = myLocation && destinationCoords;

    // Use actual road network coordinates from Mapbox Directions API
    const routeCoords: [number, number][] =
      roadRouteCoords && roadRouteCoords.length > 1
        ? roadRouteCoords
        : hasBothPoints
        ? [
            [myLocation.lng, myLocation.lat],
            [destinationCoords[0], destinationCoords[1]],
          ]
        : [];

    const geojsonData: any = {
      type: 'FeatureCollection',
      features: routeCoords.length > 0
        ? [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: routeCoords,
              },
              properties: {
                title: 'Shortest Driving Route',
                roadDistance: roadDistanceMeters
                  ? `${(roadDistanceMeters / 1000).toFixed(1)} km`
                  : formatDisplacement(computedDisplacementMeters),
              },
            },
          ]
        : [],
    };

    const applyLayers = () => {
      const existingSource = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
      if (existingSource) {
        existingSource.setData(geojsonData);
      } else {
        map.addSource(sourceId, { type: 'geojson', data: geojsonData });
      }

      // Layer 1: High-visibility glowing aura casing
      if (!map.getLayer(casingLayerId)) {
        map.addLayer({
          id: casingLayerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#2563eb',
            'line-width': 8,
            'line-opacity': 0.4,
            'line-blur': 2,
          },
        });
      }

      // Layer 2: Core solid shortest road path line
      if (!map.getLayer(coreLayerId)) {
        map.addLayer({
          id: coreLayerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#1d4ed8',
            'line-width': 4,
            'line-opacity': 0.95,
          },
        });
      }

      // Layer 3: Contrasting bright animated/directional dash accent
      if (!map.getLayer(dashLayerId)) {
        map.addLayer({
          id: dashLayerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#93c5fd',
            'line-width': 2,
            'line-dasharray': [2, 3],
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      applyLayers();
    } else {
      map.once('style.load', applyLayers);
    }

    // Update midpoint route badge marker directly on the road
    if (displacementMarkerRef.current) {
      displacementMarkerRef.current.remove();
      displacementMarkerRef.current = null;
    }

    if (routeCoords.length > 0) {
      const midIndex = Math.floor(routeCoords.length / 2);
      const [midLng, midLat] = routeCoords[midIndex];

      const displayText = roadDistanceMeters
        ? `${(roadDistanceMeters / 1000).toFixed(1)} km (~${Math.max(1, Math.round((roadDurationSeconds || 0) / 60))} min)`
        : formatDisplacement(computedDisplacementMeters);

      const midEl = document.createElement('div');
      midEl.className = 'road-route-marker';
      midEl.innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.92); color: #ffffff; padding: 3px 8px; border-radius: 9999px; font-weight: 800; font-size: 10px; border: 1.5px solid #60a5fa; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; gap: 4px; white-space: nowrap; pointer-events: none; backdrop-filter: blur(4px);">
          <span style="color: #60a5fa; font-weight: 900;">🚗 Shortest Way:</span>
          <span style="letter-spacing: 0.02em;">${displayText}</span>
        </div>
      `;

      displacementMarkerRef.current = new mapboxgl.Marker({ element: midEl })
        .setLngLat([midLng, midLat])
        .addTo(map);
    }

    return () => {
      if (displacementMarkerRef.current) {
        displacementMarkerRef.current.remove();
        displacementMarkerRef.current = null;
      }
    };
  }, [
    job,
    destinationCoords,
    myLocation,
    roadRouteCoords,
    roadDistanceMeters,
    roadDurationSeconds,
    computedDisplacementMeters,
    isLoaded,
    map,
  ]);

  // Auto-fit bounds on initial load so both driver and job with road route are visible
  useEffect(() => {
    if (!map || !isLoaded || !myLocation || !destinationCoords) return;
    const fitKey = `${job?.id}_${destinationCoords[0].toFixed(4)}_${destinationCoords[1].toFixed(4)}`;
    if (hasAutoFittedRef.current === fitKey) return;
    hasAutoFittedRef.current = fitKey;

    const bounds = new mapboxgl.LngLatBounds();
    if (roadRouteCoords && roadRouteCoords.length > 1) {
      roadRouteCoords.forEach((pt) => bounds.extend(pt));
    } else {
      bounds.extend([myLocation.lng, myLocation.lat]);
      bounds.extend(destinationCoords);
    }
    map.fitBounds(bounds, { padding: 45, maxZoom: 15, duration: 1000 });
  }, [map, isLoaded, myLocation, destinationCoords, roadRouteCoords, job?.id]);

  // Center on My Location
  const handleCenterMyLocation = () => {
    requestImmediateLocation?.();
    if (myLocation && map) {
      map.flyTo({
        center: [myLocation.lng, myLocation.lat],
        zoom: 15,
        duration: 900,
      });
    }
  };

  // Fit Both Points
  const handleFitBounds = () => {
    if (!map) return;
    const bounds = new mapboxgl.LngLatBounds();
    let count = 0;
    if (myLocation) {
      bounds.extend([myLocation.lng, myLocation.lat]);
      count++;
    }
    if (destinationCoords) {
      bounds.extend(destinationCoords);
      count++;
    }
    if (count > 0) {
      map.fitBounds(bounds, { padding: 45, maxZoom: 15, duration: 800 });
    }
  };

  // Determine Current Stage
  const currentStage: 'PENDING' | 'ACCEPTED' | 'EN_ROUTE' | 'ON_SCENE' = useMemo(() => {
    if (!job) return 'PENDING';
    const disp = job.dispositionNotes;
    const st = job.status;
    if (disp === 'ON_SCENE' || disp === 'ARRIVED' || st === 'ON_SCENE' || st === 'ARRIVED' || st === 'IN_PROGRESS') {
      return 'ON_SCENE';
    }
    if (disp === 'EN_ROUTE' || st === 'EN_ROUTE') {
      return 'EN_ROUTE';
    }
    if (disp === 'ACCEPTED' || st === 'ACCEPTED' || st === 'ASSIGNED') {
      return 'ACCEPTED';
    }
    return 'PENDING';
  }, [job]);

  if (!isOpen || !job) return null;

  const customerName = job.customer?.fullName || job.customer?.name || job.recipientName || 'Customer';
  const customerPhone = job.customer?.phone || job.recipientPhone;
  const addressText = job.locationAddress || job.serviceAddress || 'No address specified';
  const navUrl = getNavigationUrl({
    latitude: job.serviceLatitude ?? job.latitude,
    longitude: job.serviceLongitude ?? job.longitude,
    address: addressText,
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all">
      {/* Modal Dialog Container */}
      <div className={`w-full bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
        isExpanded 
          ? 'h-full sm:h-[95vh] sm:max-w-5xl' 
          : 'max-h-[95vh] sm:max-w-2xl rounded-t-2xl'
      }`}>
        {/* Top Header Bar */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <Radio className={`w-3.5 h-3.5 ${isTracking ? 'animate-pulse' : ''}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  #{job.jobCode || job.jobNumber}
                </span>
                <span className="text-xs font-bold text-slate-800 truncate">
                  {customerName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  {isTracking ? 'GPS Active' : 'Standby'}
                </span>
                {roadDistanceMeters !== null ? (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-[10px]">
                      <span>Road Way:</span>
                      <span className="font-mono">{(roadDistanceMeters / 1000).toFixed(1)} km (~{Math.max(1, Math.round((roadDurationSeconds || 0) / 60))}m)</span>
                    </span>
                  </>
                ) : computedDisplacementMeters !== null ? (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-[10px]">
                      <span>Displacement:</span>
                      <span className="font-mono">{formatDisplacement(computedDisplacementMeters)}</span>
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title={isExpanded ? 'Balanced View' : 'Extend Map'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Close Map"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mapbox Section (Decreased height, responsive for mobile) */}
        <div className={`relative w-full bg-slate-100 ${
          isExpanded ? 'flex-1 min-h-[350px]' : 'h-[200px] sm:h-[230px] md:h-[250px] shrink-0'
        }`}>
          <div ref={containerRef} className="absolute inset-0 w-full h-full" />

          {/* Map Floating Tools (Locate & Fit) */}
          <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleCenterMyLocation}
              className="p-2 bg-white/95 backdrop-blur-xs text-slate-700 hover:text-slate-900 rounded-lg shadow-md border border-slate-200/80 transition cursor-pointer active:scale-95"
              title="Center on My Location"
            >
              <LocateFixed className="w-4 h-4 text-emerald-600" />
            </button>
            <button
              type="button"
              onClick={handleFitBounds}
              className="p-2 bg-white/95 backdrop-blur-xs text-slate-700 hover:text-slate-900 rounded-lg shadow-md border border-slate-200/80 transition cursor-pointer active:scale-95"
              title="Fit Both Locations"
            >
              <Navigation className="w-4 h-4 text-blue-600" />
            </button>
          </div>

          {/* Shortest Driving Way Overlay HUD on Map */}
          {!isGeocoding && (roadDistanceMeters !== null || computedDisplacementMeters !== null) && (
            <div className="absolute top-2.5 left-2.5 z-10 bg-slate-950/85 backdrop-blur-xs text-white px-2.5 py-1.5 rounded-lg border border-blue-500/40 shadow-md flex items-center gap-2 pointer-events-none">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
              <div className="flex flex-col leading-none">
                <span className="text-[9px] uppercase font-bold text-blue-300 tracking-wider">
                  Shortest Driving Way
                </span>
                <span className="text-xs font-black font-mono text-white mt-0.5">
                  {roadDistanceMeters !== null
                    ? `${(roadDistanceMeters / 1000).toFixed(1)} km (~${Math.max(1, Math.round((roadDurationSeconds || 0) / 60))} min)`
                    : formatDisplacement(computedDisplacementMeters)}
                </span>
              </div>
            </div>
          )}

          {/* Geocoding indicator */}
          {isGeocoding && (
            <div className="absolute top-2.5 left-2.5 z-10 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg shadow-md border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Resolving address pin...</span>
            </div>
          )}

          {/* GPS Error Alert */}
          {gpsError && (
            <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 bg-rose-50/95 backdrop-blur-xs p-2 rounded-lg border border-rose-200 text-xs text-rose-800 flex items-center gap-2 shadow-md">
              <Info className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="truncate">GPS Warning: {gpsError}</span>
            </div>
          )}
        </div>

        {/* Bottom Details & Action Pipeline (Zero slider / fully visible) */}
        <div className={`bg-white border-t border-slate-100 flex flex-col justify-between shrink-0 ${
          isExpanded ? 'max-h-[35vh] overflow-y-auto' : ''
        }`}>
          <div className="p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
            {/* Row 1: Badges & More Details Trigger */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                  #{job.jobCode || job.jobNumber}
                </span>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                  Roadside
                </span>
                {roadDistanceMeters !== null ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    <span className="text-blue-500">🚗</span>
                    <span>Shortest Way: {(roadDistanceMeters / 1000).toFixed(1)} km (~{Math.max(1, Math.round((roadDurationSeconds || 0) / 60))} min)</span>
                  </span>
                ) : computedDisplacementMeters !== null ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    <span className="text-blue-500">⚡</span>
                    <span>Shortest Way: {formatDisplacement(computedDisplacementMeters)}</span>
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full transition cursor-pointer"
                >
                  <Info className="w-3 h-3" />
                  <span>Show More Details</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Status:</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {currentStage}
                </span>
              </div>
            </div>

            {/* Row 2: Customer info & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="flex items-center justify-between sm:block">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">{customerName}</h4>
                  {customerPhone && (
                    <a
                      href={`tel:${customerPhone}`}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-800 font-semibold mt-0.5"
                    >
                      <Phone className="w-3 h-3 text-blue-600" />
                      <span>{customerPhone}</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2">
                <div className="flex items-start gap-1.5 text-xs text-slate-800 font-medium min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-1 truncate">{addressText}</span>
                </div>
                <a
                  href={navUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-slate-400 hover:text-blue-600 transition shrink-0"
                  title="Open in Maps app"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Row 3: Action Button Pipeline */}
            <div className="pt-1">
              {currentStage === 'PENDING' || currentStage === 'ACCEPTED' ? (
                <button
                  type="button"
                  onClick={() => onStatusUpdate(job.id, 'EN_ROUTE')}
                  className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Job Accepted — Start Moving (Auto En-Route)</span>
                </button>
              ) : currentStage === 'EN_ROUTE' ? (
                <button
                  type="button"
                  onClick={() => onStatusUpdate(job.id, 'ON_SCENE')}
                  className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  <span>En Route — Mark Arrived on Scene</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenPaymentModal(job)}
                  className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enter Amount & Complete Job</span>
                </button>
              )}

              <p className="text-[10px] sm:text-[11px] text-slate-400 text-center mt-1.5">
                Live GPS Auto-Status active: En-Route and Arrived update automatically as you move.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Standalone Job Detail Breakdown Modal */}
      {isDetailModalOpen && (
        <TechnicianJobDetailModal
          isOpen={true}
          job={job}
          onClose={() => setIsDetailModalOpen(false)}
          onOpenPaymentModal={() => {
            setIsDetailModalOpen(false);
            onOpenPaymentModal(job);
          }}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
};

export default TechnicianLiveMapModal;
