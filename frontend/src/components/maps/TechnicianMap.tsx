import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapbox } from '../../hooks/useMapbox';
import { Navigation, Locate, ExternalLink } from 'lucide-react';
import { mapService } from '../../services/mapService';

interface TechnicianMapProps {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  customerName?: string;
  customerPhone?: string;
  jobCode?: string;
  className?: string;
  height?: string;
}

// Haversine distance calculation in kilometers
const calculateDistanceKm = (lon1: number, lat1: number, lon2: number, lat2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export const TechnicianMap: React.FC<TechnicianMapProps> = ({
  address,
  latitude,
  longitude,
  customerName = 'Roadside Motorist',
  customerPhone,
  jobCode,
  className = '',
  height = '340px',
}) => {
  const { containerRef, map, isLoaded, flyTo } = useMapbox({ zoom: 14 });
  const jobMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const displacementMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hasFittedBoundsRef = useRef(false);
  const [coords, setCoords] = useState<[number, number] | null>(
    latitude && longitude ? [longitude, latitude] : null
  );
  const [driverCoords, setDriverCoords] = useState<[number, number] | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [driveEtaMins, setDriveEtaMins] = useState<number | null>(null);
  const [isTrackingDriver, setIsTrackingDriver] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  useEffect(() => {
    hasFittedBoundsRef.current = false;
  }, [coords]);

  // 1. Resolve customer breakdown coordinates if not provided
  useEffect(() => {
    if (latitude && longitude) {
      setCoords([longitude, latitude]);
      return;
    }

    if (!address) return;

    let isMounted = true;
    mapService.geocode(address).then((res) => {
      if (isMounted && res && res.latitude && res.longitude) {
        setCoords([res.longitude, res.latitude]);
      }
    }).catch((err) => {
      console.warn('[TechnicianMap] Geocoding fallback error:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [address, latitude, longitude]);

  // 2. Automatically request driver GPS on mount & watch live telemetry
  useEffect(() => {
    if (!navigator.geolocation) {
      setTrackingError('Device does not support GPS location tracking');
      return;
    }

    setIsTrackingDriver(true);

    const handlePos = (pos: GeolocationPosition) => {
      const dCoords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
      setDriverCoords(dCoords);
    };

    navigator.geolocation.getCurrentPosition(
      handlePos,
      (err) => {
        console.warn('[TechnicianMap] Geolocation error:', err);
        setTrackingError(`GPS access: ${err.message}`);
        setIsTrackingDriver(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      handlePos,
      (err) => {
        console.warn('[TechnicianMap] GPS watch error:', err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Recalculate distance when customer coords change
  useEffect(() => {
    if (driverCoords && coords) {
      const d = calculateDistanceKm(driverCoords[0], driverCoords[1], coords[0], coords[1]);
      setDistanceKm(d);
      setDriveEtaMins(Math.max(2, Math.round(d * 2.2)));
    }
  }, [driverCoords, coords]);

  // 3. Render markers & live connection line on Mapbox
  const syncMapVisuals = useCallback(() => {
    if (!map || !isLoaded) return;

    // A. Customer breakdown marker (Red 🛞)
    if (coords) {
      if (jobMarkerRef.current) {
        jobMarkerRef.current.setLngLat(coords);
      } else {
        const cEl = document.createElement('div');
        cEl.style.width = '38px';
        cEl.style.height = '38px';
        cEl.style.borderRadius = '50%';
        cEl.style.backgroundColor = '#dc2626';
        cEl.style.border = '3px solid white';
        cEl.style.boxShadow = '0 0 15px rgba(220, 38, 38, 0.7)';
        cEl.style.display = 'flex';
        cEl.style.alignItems = 'center';
        cEl.style.justifyContent = 'center';
        cEl.style.fontSize = '18px';
        cEl.innerText = '🛞';

        const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(`
          <div style="font-family: inherit; font-size: 12px; color: #0f172a; padding: 3px;">
            <b style="color: #dc2626;">Our Location (Breakdown)${jobCode ? ` #${jobCode}` : ''}</b><br/>
            <b>${customerName}</b><br/>
            ${customerPhone ? `<span style="color: #059669; font-weight: bold;">${customerPhone}</span><br/>` : ''}
            <span style="color: #64748b; font-size: 11px;">${address}</span>
          </div>
        `);

        const marker = new mapboxgl.Marker(cEl)
          .setLngLat(coords)
          .setPopup(popup)
          .addTo(map);

        jobMarkerRef.current = marker;
      }
    }

    // B. Driver Location marker (Blue 🚗)
    if (driverCoords) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLngLat(driverCoords);
      } else {
        const dEl = document.createElement('div');
        dEl.style.width = '36px';
        dEl.style.height = '36px';
        dEl.style.borderRadius = '50%';
        dEl.style.backgroundColor = '#2563eb';
        dEl.style.border = '3px solid white';
        dEl.style.boxShadow = '0 0 16px rgba(37, 99, 235, 0.8)';
        dEl.style.display = 'flex';
        dEl.style.alignItems = 'center';
        dEl.style.justifyContent = 'center';
        dEl.style.fontSize = '17px';
        dEl.innerText = '🚗';

        const dPopup = new mapboxgl.Popup({ offset: 20 }).setHTML(`
          <div style="font-family: inherit; font-size: 12px; color: #1e3a8a; padding: 2px;">
            <b style="color: #2563eb;">Driver Current Location</b><br/>
            <span style="font-size: 11px; color: #475569;">Live GPS Connected</span>
          </div>
        `);

        driverMarkerRef.current = new mapboxgl.Marker(dEl)
          .setLngLat(driverCoords)
          .setPopup(dPopup)
          .addTo(map);
      }
    }

    // C. Fit Bounds if both present (run once on initial availability), or fly to customer
    if (coords && driverCoords) {
      if (!hasFittedBoundsRef.current) {
        hasFittedBoundsRef.current = true;
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend(coords);
        bounds.extend(driverCoords);
        map.fitBounds(bounds, { padding: 60, duration: 1000 });
      }

      // Draw / Highlight shortest displacement path between driver and customer
      const routeData: any = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [driverCoords, coords],
        },
      };

      const sourceId = 'driver-travel-route';
      const casingId = 'driver-travel-route-casing';
      const coreId = 'driver-travel-route-core';
      const dashId = 'driver-travel-route-dash';

      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(routeData);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: routeData,
        });

        // Layer 1: Glowing outer aura
        map.addLayer({
          id: casingId,
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

        // Layer 2: Core solid displacement line
        map.addLayer({
          id: coreId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#1d4ed8',
            'line-width': 4,
            'line-opacity': 0.95,
          },
        });

        // Layer 3: Contrasting bright dash accent
        map.addLayer({
          id: dashId,
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

      // Midpoint displacement badge marker
      if (displacementMarkerRef.current) {
        displacementMarkerRef.current.remove();
        displacementMarkerRef.current = null;
      }
      if (distanceKm !== null) {
        const midLng = (driverCoords[0] + coords[0]) / 2;
        const midLat = (driverCoords[1] + coords[1]) / 2;
        const midEl = document.createElement('div');
        midEl.innerHTML = `
          <div style="background: rgba(15, 23, 42, 0.92); color: white; padding: 2px 7px; border-radius: 9999px; font-weight: 800; font-size: 10px; border: 1.5px solid #60a5fa; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; gap: 4px; pointer-events: none;">
            <span style="color: #60a5fa;">⚡ Shortest:</span>
            <span>${distanceKm} KM</span>
          </div>
        `;
        displacementMarkerRef.current = new mapboxgl.Marker({ element: midEl })
          .setLngLat([midLng, midLat])
          .addTo(map);
      }
    } else if (coords) {
      flyTo(coords, 14);
    }
  }, [map, isLoaded, coords, driverCoords, distanceKm, address, customerName, customerPhone, jobCode, flyTo]);

  useEffect(() => {
    syncMapVisuals();
  }, [syncMapVisuals]);

  const navUrl = coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Live Dispatch Telemetry HUD */}
      <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-md space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs uppercase font-extrabold text-slate-200">
              Field Dispatch Navigation
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {distanceKm !== null && (
              <div className="bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Displacement (Shortest):</span>
                <span className="text-xs font-black font-mono">{distanceKm} KM</span>
              </div>
            )}
            {driveEtaMins !== null && (
              <div className="bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Drive ETA:</span>
                <span className="text-xs font-black font-mono">~{driveEtaMins} MINS</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* 1. Our Location (Breakdown) */}
          <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/80 flex items-start gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
              📍
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-black tracking-wider text-rose-400 block">
                Our Location (Breakdown)
              </span>
              <p className="font-bold text-slate-100 truncate text-[11px] mt-0.5">
                {customerName}
                {customerPhone && (
                  <span className="text-slate-400 font-normal font-mono ml-1.5">({customerPhone})</span>
                )}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{address || 'Location on file'}</p>
            </div>
          </div>

          {/* 2. Driver Location (Live GPS) */}
          <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/80 flex items-start gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
              🚗
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-black tracking-wider text-blue-400 block">
                Driver Location (Live GPS)
              </span>
              <p className="font-bold text-slate-100 truncate text-[11px] mt-0.5">
                {driverCoords
                  ? `Telemetry: ${Math.abs(driverCoords[1]).toFixed(4)}° ${driverCoords[1] >= 0 ? 'N' : 'S'}, ${Math.abs(driverCoords[0]).toFixed(4)}° ${driverCoords[0] >= 0 ? 'E' : 'W'}`
                  : isTrackingDriver
                  ? 'Acquiring satellite telemetry...'
                  : 'GPS Standby'}
              </p>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>Live driver vehicle tracking</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mapbox Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs">
        {/* Floating Action Controls */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (navigator.geolocation) {
                setIsTrackingDriver(true);
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const dCoords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
                    setDriverCoords(dCoords);
                    if (map) {
                      map.flyTo({ center: dCoords, zoom: 15 });
                    }
                  },
                  (err) => {
                    console.warn('[TechnicianMap] Recenter geolocation error:', err);
                    setTrackingError(`GPS access: ${err.message}`);
                    setIsTrackingDriver(false);
                  },
                  { enableHighAccuracy: true, timeout: 10000 }
                );
              }
            }}
            title="Recenter on driver position"
            className="bg-white/95 hover:bg-white text-slate-700 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-xs border border-slate-200 flex items-center gap-1.5 transition backdrop-blur-xs cursor-pointer"
          >
            <Locate className="w-3.5 h-3.5 text-blue-600" />
            <span>Driver GPS</span>
          </button>

          <a
            href={navUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-xs border border-emerald-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5 text-white" />
            <span>Google Maps</span>
            <ExternalLink className="w-3 h-3 text-emerald-200" />
          </a>
        </div>

        {trackingError && (
          <div className="absolute bottom-2 left-2 right-2 z-10 bg-amber-50/95 border border-amber-200 rounded-lg p-2 text-[10px] text-amber-800 backdrop-blur-xs">
            {trackingError}
          </div>
        )}

        <div ref={containerRef} style={{ width: '100%', height }} />
      </div>
    </div>
  );
};

export default TechnicianMap;
