import { useState, useMemo, useEffect, useRef } from 'react';
import { Truck, Navigation, MapPin, Zap, Search, Edit2, X, Loader2, AlertCircle, Clock } from 'lucide-react';
import Modal from '../ui/Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userService, type UserItem } from '../../services/userService';
import { useAssignDriver } from '../../hooks/useJobs';
import { useMapbox, MAPBOX_TOKEN, DEFAULT_MAP_CENTER } from '../../hooks/useMapbox';
import { jobService } from '../../services/jobService';
import mapboxgl from 'mapbox-gl';
import { toast } from 'sonner';

function formatPromisedTime(job: any): string {
  if (job?.arrivalWindowStart && job?.arrivalWindowEnd) {
    try {
      const s = new Date(job.arrivalWindowStart);
      const e = new Date(job.arrivalWindowEnd);
      return `${s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${e.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    } catch {
      return 'Scheduled Window';
    }
  }
  if (job?.estimatedArrivalAt) {
    try {
      const d = new Date(job.estimatedArrivalAt);
      return `Promised ~${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    } catch {
      return 'Promised ETA';
    }
  }
  return 'Immediate / ASAP';
}

interface AssignDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}

interface GeocodeSuggestion {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
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
  const queryClient = useQueryClient();
  const assignDriverMutation = useAssignDriver();
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [driverSearch, setDriverSearch] = useState<string>('');

  // Local address and geocoding state
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [addressSearchInput, setAddressSearchInput] = useState<string>('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState<boolean>(false);
  const [isSavingAddress, setIsSavingAddress] = useState<boolean>(false);

  useEffect(() => {
    if (job) {
      setCurrentAddress(job.serviceAddress || job.locationAddress || 'Roadside Breakdown Location');
      setCurrentLat(job.serviceLatitude ?? job.latitude ?? null);
      setCurrentLng(job.serviceLongitude ?? job.longitude ?? null);
      setIsEditingAddress(false);
      setAddressSearchInput('');
      setSuggestions([]);
    }
  }, [job]);

  // 1. Strict regional isolation: query only drivers matching the job's countryCode
  const countryCode = job?.countryCode || 'CA';
  const { data: rawDrivers = [], isLoading } = useQuery<UserItem[]>({
    queryKey: ['drivers', countryCode],
    queryFn: () => userService.getDrivers(countryCode),
    enabled: isOpen && Boolean(job),
  });

  // 2. Compute driving distances and roadside ETAs using current address coordinates
  const rankedDrivers = useMemo(() => {
    return rawDrivers.map((drv) => {
      let distanceKm: number | null = null;
      let etaMinutes: number;

      if (currentLat !== null && currentLng !== null && drv.latitude && drv.longitude) {
        const straightKm = calculateDistanceKm(currentLat, currentLng, drv.latitude, drv.longitude);
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
  }, [rawDrivers, currentLat, currentLng]);

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
  const initialCenter: [number, number] = currentLng && currentLat ? [currentLng, currentLat] : DEFAULT_MAP_CENTER;
  const { containerRef, map, isLoaded } = useMapbox({
    center: initialCenter,
    zoom: 11,
    interactive: true,
    enabled: isOpen,
  });

  const jobMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Address search via Mapbox Autofill
  const handleSearchGeocode = async (query: string) => {
    setAddressSearchInput(query);
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearchingGeocode(true);
    try {
      const token = MAPBOX_TOKEN;
      const cc = countryCode.toLowerCase();
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=${cc}&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.features) {
        setSuggestions(
          data.features.map((f: any) => ({
            id: f.id,
            place_name: f.place_name,
            center: f.center,
          }))
        );
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
    } finally {
      setIsSearchingGeocode(false);
    }
  };

  const handleSelectAddress = async (s: GeocodeSuggestion) => {
    try {
      setIsSavingAddress(true);
      const newAddress = s.place_name;
      const [lng, lat] = s.center;
      await jobService.verifyBookingAddress(job.id, {
        serviceAddress: newAddress,
        serviceLatitude: lat,
        serviceLongitude: lng,
      });
      setCurrentAddress(newAddress);
      setCurrentLat(lat);
      setCurrentLng(lng);
      setIsEditingAddress(false);
      setSuggestions([]);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-jobs'] });
      toast.success('Breakdown address updated & geocoded successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Update Mapbox Visual Markers & Fit Bounds
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Remove previous markers
    if (jobMarkerRef.current) jobMarkerRef.current.remove();
    if (driverMarkerRef.current) driverMarkerRef.current.remove();

    const bounds = new mapboxgl.LngLatBounds();
    let hasCoords = false;

    // Destination Marker (Red)
    if (currentLng && currentLat) {
      const destEl = document.createElement('div');
      destEl.className = 'w-7 h-7 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center text-white';
      destEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';

      jobMarkerRef.current = new mapboxgl.Marker(destEl)
        .setLngLat([currentLng, currentLat])
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(`Breakdown: ${currentAddress}`))
        .addTo(map);

      bounds.extend([currentLng, currentLat]);
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
      if (currentLng && currentLat && selectedDriver?.longitude && selectedDriver?.latitude) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
      } else if (currentLng && currentLat) {
        map.flyTo({ center: [currentLng, currentLat], zoom: 12, duration: 600 });
      }
    }
  }, [map, isLoaded, currentLng, currentLat, selectedDriver, currentAddress]);

  const handleAssign = async () => {
    if (!activeSelectedDriverId) {
      toast.error('Please select a driver to dispatch');
      return;
    }

    try {
      const driverEtaMins = selectedDriver?.etaMinutes || 20;
      await assignDriverMutation.mutateAsync({
        jobId: job.id,
        driverId: activeSelectedDriverId,
        etaMinutes: driverEtaMins,
        driverEstimatedArrivalAt: new Date(Date.now() + driverEtaMins * 60000).toISOString(),
      });
      toast.success(`Technician ${selectedDriver?.fullName} dispatched (~${driverEtaMins} min travel ETA)`);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch driver');
    }
  };

  if (!isOpen || !job) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dispatch Regional Technician • Job #${job?.jobNumber || job?.jobCode || ''}`}
      maxWidth="max-w-5xl"
    >
      {/* 2-Column Dispatch Layout: Map Canvas + iPhone Style Drivers Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[560px]">
        {/* Left: Mapbox Canvas (lg: 7 cols) */}
        <div className="lg:col-span-7 relative h-64 lg:h-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
          <div ref={containerRef} className="w-full h-full" />

          {/* Apple Maps Style Floating Route & ETA Header */}
          <div className="absolute top-3 left-3 right-3 z-20 flex flex-col sm:flex-row sm:items-start justify-between gap-2 pointer-events-none">
            {/* Address Banner / Autofill Search Card */}
            <div className="bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-200/90 pointer-events-auto max-w-full sm:max-w-[70%] relative transition-all">
              {isEditingAddress ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <Search size={12} className="text-red-600" />
                      <span>Search & Verify Address (Mapbox Autofill)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingAddress(false);
                        setSuggestions([]);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      title="Cancel edit"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      value={addressSearchInput}
                      onChange={(e) => handleSearchGeocode(e.target.value)}
                      placeholder={`Type address or postal code in ${countryCode}...`}
                      className="w-full pl-3 pr-8 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                    {isSearchingGeocode && (
                      <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  {suggestions.length > 0 && (
                    <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectAddress(s)}
                          disabled={isSavingAddress}
                          className="w-full p-2.5 text-left text-xs hover:bg-red-50/70 transition flex items-start gap-2 cursor-pointer"
                        >
                          <MapPin size={13} className="text-red-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">{s.place_name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {isSavingAddress && (
                    <div className="text-[11px] text-red-600 font-semibold flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" />
                      <span>Updating address and geocoding...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Breakdown</div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingAddress(true);
                          setAddressSearchInput(currentAddress);
                        }}
                        className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Edit2 size={10} />
                        <span>Edit / Fix</span>
                      </button>
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate" title={currentAddress}>
                      {currentAddress}
                    </div>
                    {(!currentLat || !currentLng) && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingAddress(true);
                          setAddressSearchInput(currentAddress);
                        }}
                        className="mt-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-amber-200"
                      >
                        <AlertCircle size={10} />
                        <span>Coordinates missing • Click to Geocode</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Roadside Driving ETA Badge */}
            {selectedDriver && (
              <div className="bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl shadow-xl border border-slate-700/80 pointer-events-auto flex items-center gap-2 shrink-0">
                <Zap size={14} className="text-amber-400 fill-amber-400 shrink-0" />
                <div className="text-right">
                  <div className="text-xs font-black text-amber-300">~{selectedDriver.etaMinutes || 20} MINS</div>
                  {selectedDriver.distanceKm !== null ? (
                    <div className="text-[10px] text-slate-400 font-mono">{selectedDriver.distanceKm} km away</div>
                  ) : (
                    <div className="text-[9px] text-slate-400">Estimated</div>
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

          {/* Customer SLA vs Dispatch Choice Header */}
          <div className="mb-2.5 px-3 py-2 bg-blue-50/90 border border-blue-200/80 rounded-2xl flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider block">Customer Promised Time</span>
                <span className="font-bold text-slate-900">{formatPromisedTime(job)}</span>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Free Dispatch
            </span>
          </div>

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
