import { useState, useMemo, useEffect, useRef } from 'react';
import { Truck, Navigation, MapPin, Zap, Search, Edit2, X, Loader2, AlertCircle, Share2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userService, type UserItem } from '../../services/userService';
import { useAssignDriver } from '../../hooks/useJobs';
import { useMapbox, MAPBOX_TOKEN, DEFAULT_MAP_CENTER } from '../../hooks/useMapbox';
import { jobService } from '../../services/jobService';
import ExternalDispatchModal from './ExternalDispatchModal';
import mapboxgl from 'mapbox-gl';
import { toast } from 'sonner';

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

/**
 * Show regional drivers ranked by estimated travel minutes and a job location map
 * when open. Support internal assignment or external dispatch configuration;
 * completed/cancelled jobs disable dispatch actions.
 */
export default function AssignDriverModal({ isOpen, onClose, job }: AssignDriverModalProps) {
  const queryClient = useQueryClient();
  const assignDriverMutation = useAssignDriver();
  const [activeJob, setActiveJob] = useState<any>(job);
  const isCompletedJob = activeJob?.status === 'COMPLETED' || activeJob?.status === 'CANCELLED';
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [driverSearch, setDriverSearch] = useState<string>('');
  const [driverFilterType, setDriverFilterType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [showExternalModal, setShowExternalModal] = useState<boolean>(false);
  const [selectedExternalContractor, setSelectedExternalContractor] = useState<{
    name?: string;
    phone?: string;
    address?: string;
  } | null>(null);

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
    setActiveJob(job);
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

      const isExternal =
        drv.assignedVehicle === 'EXTERNAL_CONTRACTOR' ||
        drv.assignedVehicle?.startsWith('EXTERNAL');

      return {
        ...drv,
        distanceKm,
        etaMinutes,
        isExternal,
      };
    }).sort((a, b) => (a.etaMinutes ?? 999) - (b.etaMinutes ?? 999));
  }, [rawDrivers, currentLat, currentLng]);

  // Filtered drivers by local search and driverFilterType
  const filteredDrivers = useMemo(() => {
    return rankedDrivers.filter((d) => {
      if (driverFilterType === 'INTERNAL' && d.isExternal) return false;
      if (driverFilterType === 'EXTERNAL' && !d.isExternal) return false;

      if (!driverSearch.trim()) return true;
      const q = driverSearch.toLowerCase();
      return (
        d.fullName.toLowerCase().includes(q) ||
        (d.address && d.address.toLowerCase().includes(q)) ||
        (d.assignedVehicle && d.assignedVehicle.toLowerCase().includes(q)) ||
        (d.phone && d.phone.toLowerCase().includes(q))
      );
    });
  }, [rankedDrivers, driverFilterType, driverSearch]);

  const internalCount = useMemo(() => rankedDrivers.filter((d) => !d.isExternal).length, [rankedDrivers]);
  const externalCount = useMemo(() => rankedDrivers.filter((d) => d.isExternal).length, [rankedDrivers]);

  const activeSelectedDriverId = selectedDriverId || filteredDrivers[0]?.id || rankedDrivers[0]?.id || '';
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

  /**
   * Reject completed/cancelled jobs or missing drivers. Open external dispatch
   * configuration for contractors, or assign the selected internal driver with
   * travel ETA in minutes and close on success; request failures become error toasts.
   */
  const handleAssign = async () => {
    if (isCompletedJob) {
      toast.error(`Cannot dispatch driver: Job is ${activeJob?.status}`);
      return;
    }

    if (!selectedDriver) {
      toast.error('Please select a driver to dispatch');
      return;
    }

    if (selectedDriver.isExternal) {
      setSelectedExternalContractor({
        name: selectedDriver.fullName,
        phone: selectedDriver.phone,
        address: selectedDriver.address,
      });
      setShowExternalModal(true);
      return;
    }

    try {
      const driverEtaMins = selectedDriver.etaMinutes || 20;
      await assignDriverMutation.mutateAsync({
        jobId: job.id,
        driverId: activeSelectedDriverId,
        etaMinutes: driverEtaMins,
        driverEstimatedArrivalAt: new Date(Date.now() + driverEtaMins * 60000).toISOString(),
      });
      toast.success(`Technician ${selectedDriver.fullName} dispatched (~${driverEtaMins} min travel ETA)`);
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
      maxWidth="max-w-6xl"
    >
      {isCompletedJob && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-600 shrink-0" />
            <span>Work order is {activeJob?.status} • Driver assignment and dispatch actions are locked.</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
            Read Only
          </span>
        </div>
      )}

      {/* 2-Column Balanced Dispatch Layout: Map Canvas + Drivers Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[560px]">
        {/* Left: Mapbox Canvas (lg: 6 cols - 50%) */}
        <div className="lg:col-span-6 relative h-64 lg:h-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
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

        {/* Right: Spacious Drivers Sidebar (lg: 6 cols - 50%) */}
        <div className="lg:col-span-6 bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 flex flex-col h-full shadow-sm relative overflow-hidden backdrop-blur-sm">
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
              </div>
              <span className="text-xs font-bold font-mono text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                {filteredDrivers.length} Online
              </span>
            </div>

            {/* Decline Reason Banner if previously declined */}
            {(activeJob?.driverDeclineReason || activeJob?.externalDispatchStatus === 'DENIED') && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-900">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>Contractor Declined Assignment</span>
                </div>
                <div className="text-[11px] text-rose-700 bg-white/70 p-2 rounded-lg border border-rose-200/50">
                  <strong>Reason:</strong> "{activeJob.driverDeclineReason || 'Declined by contractor'}"
                  {activeJob.externalCompanyName && (
                    <div className="text-[10px] text-rose-600 mt-0.5 font-medium">Declining Contractor: {activeJob.externalCompanyName}</div>
                  )}
                </div>
              </div>
            )}

            {/* Strict Segmented Filter: Internal vs External */}
            <div className="flex bg-slate-200/70 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDriverFilterType('INTERNAL')}
                className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                  driverFilterType === 'INTERNAL'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Internal ({internalCount})
              </button>
              <button
                type="button"
                onClick={() => setDriverFilterType('EXTERNAL')}
                className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                  driverFilterType === 'EXTERNAL'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                External ({externalCount})
              </button>
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
                        ? drv.isExternal
                          ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-red-600 bg-red-50/80 ring-2 ring-red-500/20 shadow-xs'
                        : 'border-slate-200/80 bg-white hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? drv.isExternal
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-red-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Truck size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs truncate">
                            {drv.fullName}
                          </span>
                          {drv.isExternal ? (
                            <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-bold shrink-0">
                              External
                            </span>
                          ) : isClosest ? (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold shrink-0">
                              Closest
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                          {drv.isExternal
                            ? `${drv.assignedVehicle?.replace(/^EXTERNAL:\s*/, '') || 'Contractor'} • ${drv.phone || drv.address || 'External'}`
                            : `${drv.assignedVehicle || 'Service Van'} • ${drv.address || 'Regional Depot'}`}
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
          <div className="pt-2.5 border-t border-slate-200/60 shrink-0 space-y-2">
            {/* Outsource to External Driver Public Link */}
            <button
              type="button"
              disabled={isCompletedJob}
              onClick={() => {
                setSelectedExternalContractor(null);
                setShowExternalModal(true);
              }}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                isCompletedJob
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Share2 size={13} className={isCompletedJob ? 'text-slate-400 shrink-0' : 'text-blue-600 shrink-0'} />
                <span>Outsource to External Driver (Public Link)</span>
              </div>
              {activeJob?.externalDispatchStatus === 'DENIED' ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                  Declined • Configure New Link →
                </span>
              ) : activeJob?.externalDispatchToken ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Active • {activeJob.externalDispatchStatus || 'SENT'}
                </span>
              ) : (
                <span className="text-[10px] text-blue-600 font-bold">Configure Link →</span>
              )}
            </button>

            {isCompletedJob ? (
              <div className="w-full py-3 px-4 rounded-2xl bg-slate-200 text-slate-500 font-bold text-xs text-center border border-slate-300">
                Dispatch Actions Locked • Order {activeJob?.status}
              </div>
            ) : selectedDriver?.isExternal ? (
              <button
                type="button"
                onClick={handleAssign}
                className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <Share2 size={15} />
                <span>Outsource & Send Link • {selectedDriver.fullName}</span>
              </button>
            ) : (
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
            )}
          </div>
        </div>
      </div>

      {/* External Driver Dispatch Modal */}
      <ExternalDispatchModal
        isOpen={showExternalModal}
        onClose={() => {
          setShowExternalModal(false);
          setSelectedExternalContractor(null);
        }}
        job={activeJob}
        initialContractor={selectedExternalContractor || undefined}
        onUpdated={(updatedJob) => {
          if (updatedJob) {
            setActiveJob(updatedJob);
          }
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          queryClient.invalidateQueries({ queryKey: ['fleet-jobs'] });
        }}
      />
    </Modal>
  );
}
