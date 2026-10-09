import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export const DEFAULT_MAP_CENTER: [number, number] = [-79.3832, 43.6532]; // Toronto default
export const DEFAULT_MAP_STYLE = 'mapbox://styles/mapbox/streets-v12';
export const DARK_MAP_STYLE = 'mapbox://styles/mapbox/navigation-night-v1';

interface UseMapboxOptions {
  center?: [number, number];
  zoom?: number;
  style?: string;
  interactive?: boolean;
}

export function useMapbox(options: UseMapboxOptions = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    if (!MAPBOX_TOKEN) {
      setError('Mapbox Access Token is missing');
      return;
    }

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const m = new mapboxgl.Map({
        container: containerRef.current,
        style: options.style || DEFAULT_MAP_STYLE,
        center: options.center || DEFAULT_MAP_CENTER,
        zoom: options.zoom ?? 10,
        interactive: options.interactive ?? true,
        attributionControl: false,
      });

      if (options.interactive !== false) {
        m.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
        m.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      }

      m.on('load', () => {
        setIsLoaded(true);
      });

      m.on('error', (e) => {
        console.warn('[Mapbox] Map error:', e);
      });

      mapRef.current = m;
      setMap(m);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize Mapbox';
      console.error('[Mapbox] Init error:', err);
      setError(msg);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMap(null);
        setIsLoaded(false);
      }
    };
  }, []);

  const flyTo = useCallback((coords: [number, number], zoom = 14) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: coords,
        zoom,
        essential: true,
        duration: 1200,
      });
    }
  }, []);

  const fitBounds = useCallback((coordsList: [number, number][], padding = 40) => {
    if (!mapRef.current || coordsList.length === 0) return;
    if (coordsList.length === 1) {
      mapRef.current.flyTo({ center: coordsList[0], zoom: 13 });
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    coordsList.forEach((c) => bounds.extend(c));
    mapRef.current.fitBounds(bounds, { padding, maxZoom: 15, duration: 1000 });
  }, []);

  const setStyle = useCallback((styleUrl: string) => {
    if (mapRef.current) {
      mapRef.current.setStyle(styleUrl);
    }
  }, []);

  return {
    containerRef,
    map,
    isLoaded,
    error,
    flyTo,
    fitBounds,
    setStyle,
  };
}

export default useMapbox;
