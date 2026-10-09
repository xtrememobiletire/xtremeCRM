import React, { useEffect, useRef } from 'react';
import { useMapbox, DARK_MAP_STYLE, DEFAULT_MAP_STYLE } from '../../hooks/useMapbox';
import { addMapMarker } from './MapMarker';
import { createJobPopupHtml } from './MapPopup';
import type { MapJob } from '../../services/mapService';
import { Maximize2, Moon, Sun } from 'lucide-react';

interface JobMapProps {
  jobs: MapJob[];
  selectedJobId?: string | null;
  onSelectJob?: (job: MapJob) => void;
  className?: string;
  height?: string;
}

export const JobMap: React.FC<JobMapProps> = ({
  jobs,
  selectedJobId,
  onSelectJob,
  className = '',
  height = '500px',
}) => {
  const { containerRef, map, isLoaded, fitBounds, flyTo, setStyle, error } = useMapbox();
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  // Render markers when map is loaded or jobs update
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const validJobs = jobs.filter((j) => j.serviceLatitude && j.serviceLongitude);
    const coordsList: [number, number][] = [];

    validJobs.forEach((job) => {
      const coords: [number, number] = [job.serviceLongitude, job.serviceLatitude];
      coordsList.push(coords);

      const isSelected = selectedJobId === job.id;
      const isUrgent = job.urgency === 'URGENT';
      const color =
        job.status === 'COMPLETED'
          ? '#94a3b8'
          : job.status === 'IN_PROGRESS'
          ? '#10b981'
          : job.status === 'ASSIGNED'
          ? '#3b82f6'
          : '#f59e0b';

      const popupHtml = createJobPopupHtml(job);

      const marker = addMapMarker(
        map,
        coords,
        popupHtml,
        {
          type: 'job',
          color: isSelected ? '#dc2626' : color,
          isPulsing: isUrgent && job.status !== 'COMPLETED',
        },
        () => onSelectJob?.(job)
      );

      markersRef.current.push(marker);

      if (isSelected) {
        marker.togglePopup();
      }
    });

    if (coordsList.length > 0 && !selectedJobId) {
      fitBounds(coordsList, 50);
    }
  }, [map, isLoaded, jobs, onSelectJob]);

  // Focus selected job
  useEffect(() => {
    if (!selectedJobId || !map) return;
    const target = jobs.find((j) => j.id === selectedJobId);
    if (target && target.serviceLatitude && target.serviceLongitude) {
      flyTo([target.serviceLongitude, target.serviceLatitude], 15);
    }
  }, [selectedJobId, jobs, map, flyTo]);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    setStyle(next ? DARK_MAP_STYLE : DEFAULT_MAP_STYLE);
  };

  const handleFitAll = () => {
    const coords = jobs
      .filter((j) => j.serviceLatitude && j.serviceLongitude)
      .map((j) => [j.serviceLongitude, j.serviceLatitude] as [number, number]);
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
      {/* Map Floating Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={handleFitAll}
          title="Fit all markers"
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

      {/* Map Canvas Container */}
      <div ref={containerRef} style={{ width: '100%', height }} />
    </div>
  );
};

export default JobMap;
