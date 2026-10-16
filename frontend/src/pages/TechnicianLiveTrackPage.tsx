// frontend/src/pages/TechnicianLiveTrackPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Maximize2,
  Minimize2,
  LocateFixed,
  Navigation,
  CheckCircle2,
  Radio,
  MapPin,
  Phone,
  AlertCircle,
  Loader2,
  ShieldCheck,
  DollarSign,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useMapbox } from '../hooks/useMapbox';
import { useJobs, useUpdateJobStatus } from '../hooks/useJobs';
import { useLiveJobTracker } from '../hooks/useLiveJobTracker';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { mapService } from '../services/mapService';
import TechnicianPaymentModal from '../components/technician/TechnicianPaymentModal';
import TechnicianJobDetailModal from '../components/technician/TechnicianJobDetailModal';

export const TechnicianLiveTrackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlJobId = searchParams.get('jobId');

  const { user } = useAuth();
  const { currencySymbol } = useTenant();

  // Fetch driver assigned jobs
  const { data: jobsResponse, isLoading, refetch } = useJobs({
    limit: 50,
    driverId: user?.id,
  });
  const updateStatusMutation = useUpdateJobStatus();

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [autoStatusEnabled, setAutoStatusEnabled] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Resolved destination coordinates for current job: [longitude, latitude]
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Filter active/pending jobs for the technician
  const activeJobs = useMemo(() => {
    const list: any[] = jobsResponse?.data || [];
    return list.filter((j) => {
      if (j.status === 'COMPLETED' || j.status === 'CANCELLED') return false;
      if (user?.id && j.driverId && j.driverId !== user.id && j.driver?.id !== user.id) return false;
      return true;
    });
  }, [jobsResponse, user]);

  // Sync selected job with URL query parameter or default to first active job
  useEffect(() => {
    if (urlJobId) {
      setSelectedJobId(urlJobId);
    } else if (activeJobs.length > 0 && !selectedJobId) {
      setSelectedJobId(activeJobs[0].id);
    }
  }, [urlJobId, activeJobs, selectedJobId]);

  const currentJob = useMemo(() => {
    if (selectedJobId) {
      return activeJobs.find((j) => j.id === selectedJobId) || activeJobs[0] || null;
    }
    return activeJobs[0] || null;
  }, [activeJobs, selectedJobId]);

  // Initialize Mapbox map
  const { containerRef, map, isLoaded } = useMapbox({
    center: [-79.3832, 43.6532],
    zoom: 12,
  });

  const techMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const jobMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Connect Live GPS & Auto-Geofence Hook
  const {
    myLocation,
    distanceToJobMeters,
    gpsError,
    isTracking,
    isUpdatingStatus,
    requestImmediateLocation,
  } = useLiveJobTracker({
    activeJob: currentJob,
    destinationCoords,
    autoStatusEnabled,
  });

  // Resolve Job Coordinates (From job model or fallback geocoding)
  useEffect(() => {
    if (!currentJob) {
      setDestinationCoords(null);
      return;
    }

    const rawLat = currentJob.latitude ?? currentJob.serviceLatitude;
    const rawLng = currentJob.longitude ?? currentJob.serviceLongitude;

    if (
      rawLat !== null &&
      rawLat !== undefined &&
      rawLng !== null &&
      rawLng !== undefined &&
      !isNaN(Number(rawLat)) &&
      !isNaN(Number(rawLng)) &&
      (Number(rawLat) !== 0 || Number(rawLng) !== 0)
    ) {
      const coords: [number, number] = [Number(rawLng), Number(rawLat)];
      setDestinationCoords(coords);
      return;
    }

    // Geocode address if coordinates are missing
    const address = currentJob.locationAddress || currentJob.serviceAddress;
    if (address) {
      setIsGeocoding(true);
      let isMounted = true;
      mapService
        .geocode(address, currentJob.countryCode)
        .then((res) => {
          if (isMounted && res && res.latitude && res.longitude) {
            const coords: [number, number] = [res.longitude, res.latitude];
            setDestinationCoords(coords);
          }
        })
        .catch((err) => {
          console.warn('[TechnicianLiveTrackPage] Geocode error:', err);
        })
        .finally(() => {
          if (isMounted) setIsGeocoding(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [
    currentJob?.id,
    currentJob?.latitude,
    currentJob?.longitude,
    currentJob?.serviceLatitude,
    currentJob?.serviceLongitude,
    currentJob?.locationAddress,
    currentJob?.serviceAddress,
    currentJob?.countryCode,
  ]);

  // When destination coordinates resolve or change, fly map to the job location
  useEffect(() => {
    if (!map || !isLoaded || !destinationCoords) return;
    map.flyTo({
      center: destinationCoords,
      zoom: 14,
      essential: true,
      duration: 1000,
    });
  }, [destinationCoords, map, isLoaded]);

  // Resize Mapbox canvas smoothly when toggling Full Screen
  useEffect(() => {
    if (map && isLoaded) {
      const timer = setTimeout(() => map.resize(), 150);
      return () => clearTimeout(timer);
    }
  }, [isFullScreen, isLoaded, map]);

  // Update Technician ("My Location") Marker on Map
  useEffect(() => {
    if (!map || !isLoaded || !myLocation) return;

    if (!techMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'tech-live-marker';
      el.innerHTML = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 36px; height: 36px; background: rgba(16, 185, 129, 0.35); border-radius: 9999px; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 18px; height: 18px; background: #10b981; border: 3px solid #ffffff; border-radius: 9999px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
        </div>
      `;

      techMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([myLocation.lng, myLocation.lat])
        .setPopup(new mapboxgl.Popup({ offset: 18 }).setHTML('<strong>My Live Location</strong>'))
        .addTo(map);
    } else {
      techMarkerRef.current.setLngLat([myLocation.lng, myLocation.lat]);
    }
  }, [myLocation, isLoaded, map]);

  // Update Job Destination Marker & Route Line on Map
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (jobMarkerRef.current) {
      jobMarkerRef.current.remove();
      jobMarkerRef.current = null;
    }

    if (destinationCoords) {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="background: #ef4444; color: white; padding: 6px 10px; border-radius: 999px; font-weight: 700; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 4px; cursor: pointer;">
          <span>#${currentJob?.jobCode || currentJob?.jobNumber || currentJob?.id.slice(0, 6)}</span>
        </div>
      `;

      const customerLabel =
        currentJob?.customer?.fullName ||
        currentJob?.customer?.name ||
        currentJob?.recipientName ||
        'Customer';
      const addressLabel =
        currentJob?.locationAddress || currentJob?.serviceAddress || 'Job Location';

      jobMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(destinationCoords)
        .setPopup(
          new mapboxgl.Popup({ offset: 20 }).setHTML(
            `<div style="font-size:12px; padding: 2px;"><strong>${customerLabel}</strong><br/>${addressLabel}</div>`
          )
        )
        .addTo(map);
    }

    // Draw/Update dashed route line between Technician and Job
    const sourceId = 'tech-job-route';
    const hasBothPoints = myLocation && destinationCoords;

    const geojsonData: any = {
      type: 'FeatureCollection',
      features: hasBothPoints
        ? [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [
                  [myLocation.lng, myLocation.lat],
                  [destinationCoords[0], destinationCoords[1]],
                ],
              },
              properties: {},
            },
          ]
        : [],
    };

    const existingSource = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
    if (existingSource) {
      existingSource.setData(geojsonData);
    } else if (map.isStyleLoaded()) {
      map.addSource(sourceId, { type: 'geojson', data: geojsonData });
      map.addLayer({
        id: sourceId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#10b981',
          'line-width': 3,
          'line-dasharray': [2, 2],
        },
      });
    }
  }, [currentJob, destinationCoords, myLocation, isLoaded, map]);

  // Center on My Location
  const handleCenterMyLocation = () => {
    requestImmediateLocation();
    if (myLocation && map) {
      map.flyTo({
        center: [myLocation.lng, myLocation.lat],
        zoom: 15,
        duration: 900,
      });
    }
  };

  // Fit Both Technician and Job on Map
  const handleFitBothLocations = () => {
    if (!map) return;
    const bounds = new mapboxgl.LngLatBounds();
    let pointsAdded = 0;

    if (myLocation) {
      bounds.extend([myLocation.lng, myLocation.lat]);
      pointsAdded++;
    }
    if (destinationCoords) {
      bounds.extend(destinationCoords);
      pointsAdded++;
    }

    if (pointsAdded > 0) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 900 });
    }
  };

  // Status Action Progression (Strictly adhering to valid backend enum)
  const handleStatusAction = (nextStatus: string) => {
    if (!currentJob) return;
    updateStatusMutation.mutate(
      { id: currentJob.id, status: nextStatus },
      {
        onSuccess: () => {
          toast.success(`Job updated to ${nextStatus}`);
          refetch();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to update status');
        },
      }
    );
  };

  // End Payment Completion (Requires entering positive amount)
  const handleCompletePayment = (data: {
    paymentMethod: 'CASH' | 'POS' | 'E_TRANSFER';
    amountCents: number;
    receiptFile: File | null;
  }) => {
    if (!currentJob) return;

    const formData = new FormData();
    formData.append('status', 'COMPLETED');
    formData.append('paymentMethod', data.paymentMethod);
    formData.append('amountCents', String(data.amountCents));
    if (data.paymentMethod === 'CASH') {
      formData.append('cashAmountCents', String(data.amountCents));
    }
    if (data.receiptFile) {
      formData.append('receipt', data.receiptFile);
    }

    updateStatusMutation.mutate(
      { id: currentJob.id, formData },
      {
        onSuccess: () => {
          toast.success('Job marked completed! Payout recorded.');
          setIsPaymentModalOpen(false);
          refetch();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to complete job');
        },
      }
    );
  };

  // Switch selected job and update query parameter
  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setSearchParams({ jobId });
    const target = activeJobs.find((j) => j.id === jobId);
    if (target) {
      const lat = target.latitude ?? target.serviceLatitude;
      const lng = target.longitude ?? target.serviceLongitude;
      if (lat && lng && map && isLoaded) {
        map.flyTo({ center: [Number(lng), Number(lat)], zoom: 15, duration: 900 });
      }
    }
  };

  // Determine current progression stage
  const currentStage: 'PENDING' | 'ACCEPTED' | 'EN_ROUTE' | 'ON_SCENE' = (() => {
    if (!currentJob) return 'PENDING';
    const disp = currentJob.dispositionNotes;
    const st = currentJob.status;
    if (
      disp === 'ON_SCENE' ||
      disp === 'ARRIVED' ||
      st === 'ON_SCENE' ||
      st === 'ARRIVED' ||
      st === 'IN_PROGRESS'
    ) {
      return 'ON_SCENE';
    }
    if (disp === 'EN_ROUTE' || st === 'EN_ROUTE') {
      return 'EN_ROUTE';
    }
    if (disp === 'ACCEPTED' || st === 'ACCEPTED' || st === 'ASSIGNED') {
      return 'ACCEPTED';
    }
    return 'PENDING';
  })();

  const customerName =
    currentJob?.customer?.fullName ||
    currentJob?.customer?.name ||
    currentJob?.recipientName ||
    'Customer';
  const customerPhone = currentJob?.customer?.phone || currentJob?.recipientPhone;
  const addressText =
    currentJob?.locationAddress || currentJob?.serviceAddress || 'GPS Coordinates Pinned';

  return (
    <div className="flex flex-col gap-4 sm:gap-5 p-3 sm:p-5 max-w-6xl mx-auto">
      {/* Top Bar: Back to Orders, GPS status & Live Sync */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/technician')}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
            title="Back to Orders"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <Radio className={`w-5 h-5 ${isTracking ? 'animate-pulse' : ''}`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">Live Mission Radar</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                {isTracking ? 'GPS Live' : 'GPS Standby'}
              </span>
              {isGeocoding && (
                <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Resolving Address Pin...
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-0.5">
              {distanceToJobMeters !== null
                ? `Distance to destination: ${
                    distanceToJobMeters > 1000
                      ? `${(distanceToJobMeters / 1000).toFixed(2)} km`
                      : `${distanceToJobMeters} m`
                  }`
                : destinationCoords
                ? 'Destination pinned. Acquiring your live position...'
                : 'Acquiring live coordinates with Dispatch...'}
            </p>
          </div>
        </div>

        {/* Multi-job selector if technician has multiple active jobs */}
        <div className="flex items-center gap-3">
          {activeJobs.length > 1 && (
            <select
              value={selectedJobId || currentJob?.id || ''}
              onChange={(e) => handleSelectJob(e.target.value)}
              className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none cursor-pointer"
            >
              {activeJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  #{j.jobCode || j.jobNumber || j.id.slice(0, 6)} - {j.status}
                </option>
              ))}
            </select>
          )}

          {/* Auto-Status Geofence Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition">
            <input
              type="checkbox"
              checked={autoStatusEnabled}
              onChange={(e) => setAutoStatusEnabled(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-700">
              Auto Middle Stages (Move / Arrive)
            </span>
          </label>
        </div>
      </div>

      {gpsError && (!myLocation || gpsError.toLowerCase().includes('denied') || gpsError.toLowerCase().includes('permission')) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>GPS Notice: {gpsError}. Manual stage progression is enabled below.</span>
        </div>
      )}

      {/* Interactive Map Section (Container always rendered in DOM so Mapbox initializes cleanly) */}
      <div
        className={
          isFullScreen
            ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col'
            : 'relative w-full h-[420px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900'
        }
      >
        <div ref={containerRef} className="w-full h-full" style={{ minHeight: '420px' }} />

        {/* Loading overlay if jobs are still loading */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        )}

        {/* Floating Map Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setIsFullScreen((prev) => !prev)}
            className="p-2.5 bg-white/95 hover:bg-white text-slate-800 rounded-xl shadow-md border border-slate-200 transition flex items-center justify-center cursor-pointer"
            title={isFullScreen ? 'Exit Full Screen' : 'Expand Full Map'}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleCenterMyLocation}
            className="p-2.5 bg-white/95 hover:bg-white text-emerald-600 rounded-xl shadow-md border border-slate-200 transition flex items-center justify-center cursor-pointer"
            title="Center My Location"
          >
            <LocateFixed className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleFitBothLocations}
            className="p-2.5 bg-white/95 hover:bg-white text-blue-600 rounded-xl shadow-md border border-slate-200 transition flex items-center justify-center cursor-pointer"
            title="Fit Both My Location & Job"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Bottom Status Bar inside Fullscreen Map */}
        {isFullScreen && currentJob && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-[92%] max-w-xl bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">
                #{currentJob.jobCode || currentJob.jobNumber || currentJob.id.slice(0, 6)} • {currentStage}
              </span>
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {customerName}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {addressText}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(true)}
                className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition cursor-pointer"
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                className="px-3 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl cursor-pointer"
              >
                Minimize
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Job Card & Smart Action Pipeline */}
      {currentJob ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 font-mono">
                #{currentJob.jobCode || currentJob.jobNumber || currentJob.id.slice(0, 8)}
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {currentJob.serviceType || 'Roadside'}
              </span>

              {/* Show More Details Trigger Button */}
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition border border-slate-200 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                Show More Details
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span>Status:</span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                {currentStage}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{customerName}</h2>
              {customerPhone && (
                <a
                  href={`tel:${customerPhone}`}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-600 mt-1 transition"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {customerPhone}
                </a>
              )}

              <div className="mt-3 flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{addressText}</span>
              </div>
            </div>

            {/* Smart Dynamic Action Pipeline */}
            <div className="flex flex-col justify-end gap-2">
              {/* Step 1: Start (Manual) -> Accept Job (sets status to ACCEPTED) */}
              {currentStage === 'PENDING' && (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusAction('ACCEPTED')}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Accept Job &amp; Start Live Tracking
                </button>
              )}

              {/* Step 2: Middle 1 (Auto or Manual Fallback) -> En Route */}
              {currentStage === 'ACCEPTED' && (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusAction('EN_ROUTE')}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4" />
                  )}
                  Job Accepted — Start Moving (Auto En-Route)
                </button>
              )}

              {/* Step 3: Middle 2 (Auto or Manual Fallback) -> Arrived On Scene */}
              {currentStage === 'EN_ROUTE' && (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusAction('ON_SCENE')}
                  className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  En Route — Approaching Job (Auto Arrived &lt;150m)
                </button>
              )}

              {/* Step 4: End (Manual & Amount Required) -> Enter Amount & Complete Job */}
              {currentStage === 'ON_SCENE' && (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <DollarSign className="w-4 h-4" />
                  Arrived On Scene — Enter Amount &amp; Complete Job
                </button>
              )}

              <p className="text-[11px] text-center text-slate-500">
                {currentStage === 'ON_SCENE'
                  ? 'Final completion requires entering payment amount.'
                  : autoStatusEnabled
                  ? 'Live GPS Auto-Status active: En-Route and Arrived update automatically as you move.'
                  : 'Manual mode: Click the button above to advance status.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          No active jobs assigned right now. Your live GPS map is ready and standing by.
        </div>
      )}

      {/* Show More Details Modal */}
      {currentJob && (
        <TechnicianJobDetailModal
          isOpen={isDetailModalOpen}
          job={currentJob}
          currencySymbol={currencySymbol}
          onClose={() => setIsDetailModalOpen(false)}
          onOpenPaymentModal={() => {
            setIsPaymentModalOpen(true);
          }}
        />
      )}

      {/* Reuses existing TechnicianPaymentModal for entering final amount & completing */}
      {currentJob && (
        <TechnicianPaymentModal
          isOpen={isPaymentModalOpen}
          job={currentJob}
          currencySymbol={currencySymbol}
          isSubmitting={updateStatusMutation.isPending}
          onClose={() => setIsPaymentModalOpen(false)}
          onComplete={handleCompletePayment}
        />
      )}
    </div>
  );
};

export default TechnicianLiveTrackPage;
