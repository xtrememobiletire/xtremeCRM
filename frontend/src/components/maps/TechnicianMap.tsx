import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapbox } from '../../hooks/useMapbox';
import { Navigation, Locate, ExternalLink } from 'lucide-react';
import { mapService } from '../../services/mapService';

interface TechnicianMapProps {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  customerName?: string;
  jobCode?: string;
  className?: string;
  height?: string;
}

export const TechnicianMap: React.FC<TechnicianMapProps> = ({
  address,
  latitude,
  longitude,
  customerName = 'Motorist',
  jobCode,
  className = '',
  height = '280px',
}) => {
  const { containerRef, map, isLoaded, flyTo } = useMapbox({ zoom: 14 });
  const jobMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [coords, setCoords] = useState<[number, number] | null>(
    latitude && longitude ? [longitude, latitude] : null
  );
  const [isTrackingDriver, setIsTrackingDriver] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // 1. Resolve coordinates if not passed
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

  // 2. Add customer breakdown marker
  useEffect(() => {
    if (!map || !isLoaded || !coords) return;

    if (jobMarkerRef.current) {
      jobMarkerRef.current.remove();
    }

    // Customer marker element
    const el = document.createElement('div');
    el.style.width = '36px';
    el.style.height = '36px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#dc2626'; // Red
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 0 15px rgba(220, 38, 38, 0.6)';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.fontSize = '16px';
    el.innerText = '🛞';

    const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(`
      <div style="font-family: inherit; font-size: 12px; color: #0f172a; padding: 2px;">
        <b style="color: #dc2626;">Breakdown Location${jobCode ? ` (#${jobCode})` : ''}</b><br/>
        <b>${customerName}</b><br/>
        <span style="color: #64748b;">${address}</span>
      </div>
    `);

    const marker = new mapboxgl.Marker(el)
      .setLngLat(coords)
      .setPopup(popup)
      .addTo(map);

    jobMarkerRef.current = marker;
    flyTo(coords, 14);

    return () => {
      marker.remove();
    };
  }, [map, isLoaded, coords, address, customerName, flyTo]);

  // 3. Driver Live GPS tracking
  const toggleDriverGps = () => {
    if (isTrackingDriver) {
      setIsTrackingDriver(false);
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      setTrackingError('Geolocation is not supported by your device browser');
      return;
    }

    setIsTrackingDriver(true);
    setTrackingError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dCoords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        if (map) {
          if (driverMarkerRef.current) {
            driverMarkerRef.current.setLngLat(dCoords);
          } else {
            const dEl = document.createElement('div');
            dEl.style.width = '32px';
            dEl.style.height = '32px';
            dEl.style.borderRadius = '50%';
            dEl.style.backgroundColor = '#2563eb'; // Blue
            dEl.style.border = '3px solid white';
            dEl.style.boxShadow = '0 0 12px rgba(37, 99, 235, 0.7)';
            dEl.style.display = 'flex';
            dEl.style.alignItems = 'center';
            dEl.style.justifyContent = 'center';
            dEl.style.fontSize = '14px';
            dEl.innerText = '🚗';

            const popup = new mapboxgl.Popup({ offset: 15 }).setHTML(
              '<div style="font-size: 12px; font-weight: 700; color: #1e40af;">My Live Location</div>'
            );

            driverMarkerRef.current = new mapboxgl.Marker(dEl)
              .setLngLat(dCoords)
              .setPopup(popup)
              .addTo(map);
          }

          // Fit both points on map if customer coords present
          if (coords) {
            const bounds = new mapboxgl.LngLatBounds();
            bounds.extend(coords);
            bounds.extend(dCoords);
            map.fitBounds(bounds, { padding: 50, duration: 1000 });
          }
        }
      },
      (err) => {
        setIsTrackingDriver(false);
        setTrackingError(`Location access denied or unavailable: ${err.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  const navUrl = coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className={`relative rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs ${className}`}>
      {/* Floating Action Controls */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleDriverGps}
          title="Share/Track my current GPS location"
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-xs border flex items-center gap-1.5 transition cursor-pointer backdrop-blur-xs ${
            isTrackingDriver
              ? 'bg-blue-600 text-white border-blue-700'
              : 'bg-white/95 hover:bg-white text-slate-700 border-slate-200'
          }`}
        >
          <Locate className={`w-3.5 h-3.5 ${isTrackingDriver ? 'animate-pulse text-white' : 'text-blue-600'}`} />
          <span>{isTrackingDriver ? 'GPS Active' : 'My Location'}</span>
        </button>

        <a
          href={navUrl}
          target="_blank"
          rel="noreferrer"
          className="bg-white/95 hover:bg-white text-slate-700 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-xs border border-slate-200 flex items-center gap-1.5 transition backdrop-blur-xs"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-600" />
          <span>Turn-by-Turn</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      </div>

      {trackingError && (
        <div className="absolute bottom-2 left-2 right-2 z-10 bg-amber-50/95 border border-amber-200 rounded-lg p-2 text-[10px] text-amber-800 backdrop-blur-xs">
          {trackingError}
        </div>
      )}

      {/* Mapbox Canvas */}
      <div ref={containerRef} style={{ width: '100%', height }} />
    </div>
  );
};

export default TechnicianMap;
