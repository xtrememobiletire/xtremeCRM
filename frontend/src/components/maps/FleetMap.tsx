import React, { useEffect, useRef } from 'react';
import { useMapbox, DARK_MAP_STYLE, DEFAULT_MAP_STYLE } from '../../hooks/useMapbox';
import { addMapMarker } from './MapMarker';
import { createFleetPopupHtml } from './MapPopup';
import type { MapFleet } from '../../services/mapService';
import { Maximize2, Moon, Sun } from 'lucide-react';

interface FleetMapProps {
  fleets: MapFleet[];
  selectedFleetId?: string | null;
  onSelectFleet?: (fleet: MapFleet) => void;
  className?: string;
  height?: string;
}

export const FleetMap: React.FC<FleetMapProps> = ({
  fleets,
  selectedFleetId,
  onSelectFleet,
  className = '',
  height = '500px',
}) => {
  const { containerRef, map, isLoaded, fitBounds, flyTo, setStyle, error } = useMapbox();
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  useEffect(() => {
    if (!map || !isLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const validFleets = fleets.filter((f) => f.latitude && f.longitude);
    const coordsList: [number, number][] = [];

    validFleets.forEach((fleet) => {
      const coords: [number, number] = [fleet.longitude, fleet.latitude];
      coordsList.push(coords);

      const isSelected = selectedFleetId === fleet.id;
      const color =
        fleet.status === 'APPROVED' ? '#2563eb' : fleet.status === 'PENDING' ? '#d97706' : '#dc2626';

      const popupHtml = createFleetPopupHtml(fleet);

      const marker = addMapMarker(
        map,
        coords,
        popupHtml,
        {
          type: 'fleet',
          color: isSelected ? '#1d4ed8' : color,
        },
        () => onSelectFleet?.(fleet)
      );

      markersRef.current.push(marker);

      if (isSelected) {
        marker.togglePopup();
      }
    });

    if (coordsList.length > 0 && !selectedFleetId) {
      fitBounds(coordsList, 50);
    }
  }, [map, isLoaded, fleets, onSelectFleet]);

  useEffect(() => {
    if (!selectedFleetId || !map) return;
    const target = fleets.find((f) => f.id === selectedFleetId);
    if (target && target.latitude && target.longitude) {
      flyTo([target.longitude, target.latitude], 14);
    }
  }, [selectedFleetId, fleets, map, flyTo]);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    setStyle(next ? DARK_MAP_STYLE : DEFAULT_MAP_STYLE);
  };

  const handleFitAll = () => {
    const coords = fleets
      .filter((f) => f.latitude && f.longitude)
      .map((f) => [f.longitude, f.latitude] as [number, number]);
    if (coords.length > 0) fitBounds(coords, 50);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center bg-slate-100 rounded-xl p-8 text-slate-500 border border-slate-200">
        <p className="text-sm font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm ${className}`}>
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={handleFitAll}
          title="Fit all fleets"
          className="bg-white/95 hover:bg-white text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs border border-slate-200 flex items-center gap-1.5 transition cursor-pointer backdrop-blur-xs"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Fit All</span>
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          title="Toggle Dark/Light Map"
          className="bg-white/95 hover:bg-white text-slate-700 p-1.5 rounded-lg text-xs shadow-xs border border-slate-200 flex items-center transition cursor-pointer backdrop-blur-xs"
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
        </button>
      </div>

      <div ref={containerRef} style={{ width: '100%', height }} />
    </div>
  );
};

export default FleetMap;
