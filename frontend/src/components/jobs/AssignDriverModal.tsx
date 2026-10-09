import { useState, useMemo, useEffect, useRef } from 'react';
import { Truck, Navigation, MapPin, Zap, Search } from 'lucide-react';
import Modal from '../ui/Modal';
import { useQuery } from '@tanstack/react-query';
import { userService, type UserItem } from '../../services/userService';
import { useAssignDriver } from '../../hooks/useJobs';
import { useMapbox, DEFAULT_MAP_CENTER } from '../../hooks/useMapbox';
import mapboxgl from 'mapbox-gl';
import { toast } from 'sonner';

interface AssignDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}

// Low-API Haversine distance calculation (Zero external API cost)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function AssignDriverModal({ isOpen, onClose, job }: AssignDriverModalProps) {
  const assignDriverMutation = useAssignDriver();
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [driverSearch, setDriverSearch] = useState<string>('');

  // 1. Strict regional isolation: query only drivers matching the job's countryCode
  const countryCode = job?.countryCode || 'CA';
  const { data: rawDrivers = [], isLoading } = useQuery<UserItem[]>({
    queryKey: ['drivers', countryCode],
    queryFn: () => userService.getDrivers(countryCode),
    enabled: isOpen && Boolean(job),
  });

  const jobLat = job?.serviceLatitude ?? job?.latitude ?? null;
  const jobLng = job?.serviceLongitude ?? job?.longitude ?? null;
  const destinationAddress = job?.locationAddress || job?.serviceAddress || 'Roadside Breakdown Location';

  // 2. Compute driving distances and roadside ETAs
  const rankedDrivers = useMemo(() => {
    return rawDrivers.map((drv) => {
      let distanceKm: number | null = null;
      let etaMinutes: number;

      if (jobLat !== null && jobLng !== null && drv.latitude && drv.longitude) {
        const straightKm = calculateDistanceKm(jobLat, jobLng, drv.latitude, drv.longitude);
        distanceKm = Math.round(straightKm * 1.3 * 10) / 10; // 1.3x road winding factor
        etaMinutes = Math.max(5, Math.round((distanceKm / 45) * 60) + 5); // 45 km/h urban speed + 5 min prep
      } else {
        // Fallback default regional ETA estimate if coordinates pending
        etaMinutes = 25;
      }

      return {
        ...drv,
        distanceKm,
        etaMinutes,
      };
    }).sort((a, b) => (a.etaMinutes ?? 999) - (b.etaMinutes ?? 999));
  }, [rawDrivers, jobLat, jobLng]);

  // Filtered drivers by local search
  const filteredDrivers = useMemo(() => {
    if (!driverSearch.trim()) return rankedDrivers;
    const q = driverSearch.toLowerCase();
    return rankedDrivers.filter(
      (d) =>
        d.fullName.toLowerCase().includes(q) ||
        (d.address && d.address.toLowerCase().includes(q)) ||
        (d.assignedVehicle && d.assignedVehicle.toLowerCase().includes(q))
    );
  }, [rankedDrivers, driverSearch]);

  const activeSelectedDriverId = selectedDriverId || rankedDrivers[0]?.id || '';
  const selectedDriver = rankedDrivers.find((d) => d.id === activeSelectedDriverId) || rankedDrivers[0];

  // 3. Mapbox Map Visual Setup
  const initialCenter: [number, number] = jobLng && jobLat ? [jobLng, jobLat] : DEFAULT_MAP_CENTER;
  const { containerRef, map, isLoaded } = useMapbox({
    center: initialCenter,
    zoom: 11,
    interactive: true,
  });

  const jobMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Update Mapbox Visual Markers & Fit Bounds
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Remove previous markers
    if (jobMarkerRef.current) jobMarkerRef.current.remove();
    if (driverMarkerRef.current) driverMarkerRef.current.remove();

    const bounds = new mapboxgl.LngLatBounds();
    let hasCoords = false;

    // Destination Marker (Red)
    if (jobLng && jobLat) {
      const destEl = document.createElement('div');
      destEl.className = 'w-7 h-7 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-white';
      destEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';

      jobMarkerRef.current = new mapboxgl.Marker(destEl)
        .setLngLat([jobLng, jobLat])
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(`Breakdown: ${destinationAddress}`))
        .addTo(map);

      bounds.extend([jobLng, jobLat]);
      hasCoords = true;
    }

    // Selected Driver Marker (Blue)
    if (selectedDriver?.longitude && selectedDriver?.latitude) {
      const drvEl = document.createElement('div');
      drvEl.className = 'w-7 h-7 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white';
      drvEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>';

      driverMarkerRef.current = new mapboxgl.Marker(drvEl)
        .setLngLat([selectedDriver.longitude, selectedDriver.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(`Technician: ${selectedDriver.fullName}`))
        .addTo(map);

      bounds.extend([selectedDriver.longitude, selectedDriver.latitude]);
      hasCoords = true;
    }

    if (hasCoords) {
      if (jobLng && jobLat && selectedDriver?.longitude && selectedDriver?.latitude) {
        map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 800 });
      } else if (jobLng && jobLat) {
        map.flyTo({ center: [jobLng, jobLat], zoom: 12, duration: 600 });
      }
    }
  }, [map, isLoaded, jobLng, jobLat, selectedDriver, destinationAddress]);

  if (!job) return null;

  const handleAssign = async () => {
    if (!activeSelectedDriverId) {
      toast.error('Please select a driver to dispatch');
      return;
    }

    try {
      await assignDriverMutation.mutateAsync({
        jobId: job.id,
        driverId: activeSelectedDriverId,
        etaMinutes: selectedDriver?.etaMinutes || 20,
      });
      toast.success(`Technician ${selectedDriver?.fullName} dispatched (~${selectedDriver?.etaMinutes || 20} min ETA)`);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch driver');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dispatch Regional Technician • Job #${job.jobNumber || job.jobCode}`}
      maxWidth="max-w-5xl"
    >
      {/* 2-Column Dispatch Layout: Map Canvas + iPhone Style Drivers Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[560px]">
        {/* Left: Mapbox Canvas (lg: 7 cols) */}
        <div className="lg:col-span-7 relative h-64 lg:h-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
          <div ref={containerRef} className="w-full h-full" />

          {/* Apple Maps Style Floating Route & ETA Header */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-slate-200/80 pointer-events-auto flex items-center gap-2.5 max-w-[65%]">
              <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <MapPin size={16} />
              </div>
              <div className="min-w-0 pr-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Breakdown</div>
                <div className="text-xs font-bold text-slate-900 truncate" title={destinationAddress}>
                  {destinationAddress}
                </div>
              </div>
            </div>

            {selectedDriver && (
              <div className="bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl shadow-lg border border-slate-700/80 pointer-events-auto flex items-center gap-2">
                <Zap size={14} className="text-amber-400 fill-amber-400 shrink-0" />
                <div className="text-right">
                  <div className="text-xs font-black text-amber-300">~{selectedDriver.etaMinutes || 20} MINS</div>
                  {selectedDriver.distanceKm !== null && (
                    <div className="text-[10px] text-slate-400 font-mono">{selectedDriver.distanceKm} km away</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: iPhone Style Drivers Sidebar Sheet (lg: 5 cols) */}
        <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200/90 rounded-3xl p-4 flex flex-col h-full shadow-lg relative overflow-hidden backdrop-blur-sm">
          {/* iOS Style Sheet Grab Handle */}
          <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3 shrink-0" />

          {/* Header & Filter */}
          <div className="pb-3 border-b border-slate-200/60 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span>Available Drivers</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">
                    {countryCode}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500">Ranked by proximity & roadside ETA</p>
              </div>
              <span className="text-xs font-bold font-mono text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                {filteredDrivers.length} Online
              </span>
            </div>

            {/* Quick Filter Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                placeholder="Filter by name, vehicle, depot..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          </div>

          {/* Driver List (iOS / Uber Style Cards) */}
          <div className="flex-1 overflow-y-auto py-2.5 space-y-2 pr-0.5">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading {countryCode} technicians...</div>
            ) : filteredDrivers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
                No active drivers found for regional silo <strong>{countryCode}</strong>.
              </div>
            ) : (
              filteredDrivers.map((drv, idx) => {
                const isSelected = activeSelectedDriverId === drv.id;
                const isClosest = idx === 0 && drv.distanceKm !== null;

                return (
                  <button
                    key={drv.id}
                    type="button"
                    onClick={() => setSelectedDriverId(drv.id)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-red-600 bg-red-50/80 ring-2 ring-red-500/20 shadow-xs'
                        : 'border-slate-200/80 bg-white hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-red-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'}`}>
                        <Truck size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs truncate">
                            {drv.fullName}
                          </span>
                          {isClosest && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold shrink-0">
                              Closest
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                          {drv.assignedVehicle || 'Service Van'} • {drv.address || 'Regional Depot'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <div className="flex items-center justify-end gap-1 font-mono font-bold text-xs text-slate-900">
                        <Zap size={11} className="text-amber-500 fill-amber-500" />
                        <span>~{drv.etaMinutes || 20}m</span>
                      </div>
                      {drv.distanceKm !== null && (
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {drv.distanceKm} km
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Bottom Sticky Action Button */}
          <div className="pt-3 border-t border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={handleAssign}
              disabled={!activeSelectedDriverId || assignDriverMutation.isPending}
              className="w-full py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              <Navigation size={15} />
              <span>
                {assignDriverMutation.isPending 
                  ? 'Dispatching...' 
                  : selectedDriver 
                  ? `Confirm Dispatch • ~${selectedDriver.etaMinutes || 20}m ETA` 
                  : 'Select Technician'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
