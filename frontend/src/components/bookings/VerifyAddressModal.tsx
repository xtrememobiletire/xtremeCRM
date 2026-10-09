import { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Search,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  Loader2,
  Check,
  Car,
  Wrench,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import Modal from '../ui/Modal';
import { useMapbox, MAPBOX_TOKEN, DEFAULT_MAP_CENTER } from '../../hooks/useMapbox';
import { jobService } from '../../services/jobService';
import { useTenant } from '../../context/TenantContext';
import { SERVICES_CATALOG, type ServiceCatalogItem } from '../../constants/services';
import { formatCurrency, centsToDollars } from '../../utils/currency';
import mapboxgl from 'mapbox-gl';
import { toast } from 'sonner';

interface VerifyAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onSuccess?: () => void;
}

interface GeocodeSuggestion {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
}

export default function VerifyAddressModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: VerifyAddressModalProps) {
  const { country, currencySymbol } = useTenant();

  // Address & Geocoding
  const [addressInput, setAddressInput] = useState<string>('');
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Customer Contact
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');

  // Vehicle & Tire Information (Required for mobile tire van)
  const [vehicleMake, setVehicleMake] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [vehicleYear, setVehicleYear] = useState<string>('');
  const [tireSize, setTireSize] = useState<string>('');
  const [licensePlate, setLicensePlate] = useState<string>('');

  // Services & Urgency
  const [urgency, setUrgency] = useState<string>('NORMAL');
  const [paymentMethod, setPaymentMethod] = useState<string>('POS');
  const [selectedServices, setSelectedServices] = useState<string[]>(['TIRE_REPAIR']);
  const [problemNotes, setProblemNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const countryCode = booking?.countryCode || country || 'CA';
  const rawCustomerAddress = booking?.serviceAddress || booking?.locationAddress || '';

  // Initialize state when booking opens
  useEffect(() => {
    if (booking) {
      setAddressInput(rawCustomerAddress);
      setRecipientName(booking.recipientName || booking.customer?.fullName || '');
      setRecipientPhone(booking.recipientPhone || booking.customer?.phone || '');
      setProblemNotes(booking.problemNotes || booking.notes || '');

      // Pre-fill vehicle specs
      const v = booking.vehicle;
      if (v) {
        setVehicleMake(v.make || '');
        setVehicleModel(v.model || '');
        setVehicleYear(v.year ? String(v.year) : '');
        setTireSize(v.tireSize || '');
        setLicensePlate(v.licensePlate || '');
      } else {
        setVehicleMake('');
        setVehicleModel('');
        setVehicleYear('');
        setTireSize('');
        setLicensePlate('');
      }

      // Pre-fill services
      if (booking.serviceItems && booking.serviceItems.length > 0) {
        const itemNames = booking.serviceItems.map((si: any) => si.serviceName);
        const matchingIds = SERVICES_CATALOG.filter((sc) =>
          itemNames.some((n: string) => n.toLowerCase().includes(sc.name.toLowerCase()) || sc.id === n)
        ).map((sc) => sc.id);
        setSelectedServices(matchingIds.length > 0 ? matchingIds : ['TIRE_REPAIR']);
      } else {
        setSelectedServices(['TIRE_REPAIR']);
      }

      setUrgency(booking.urgency || 'NORMAL');
      setPaymentMethod(booking.paymentMethod || 'POS');

      if (booking.serviceLatitude && booking.serviceLongitude) {
        setSelectedCoords([booking.serviceLongitude, booking.serviceLatitude]);
      } else {
        setSelectedCoords(null);
      }
    }
  }, [booking, rawCustomerAddress, country]);

  // Mapbox Map Visual
  const initialCenter: [number, number] = selectedCoords || DEFAULT_MAP_CENTER;
  const { containerRef, map, isLoaded } = useMapbox({
    center: initialCenter,
    zoom: 12,
    interactive: true,
  });

  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // Update Pin on Map
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (markerRef.current) {
      markerRef.current.remove();
    }

    if (selectedCoords) {
      const el = document.createElement('div');
      el.className =
        'w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-xl flex items-center justify-center text-white';
      el.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';

      markerRef.current = new mapboxgl.Marker(el)
        .setLngLat(selectedCoords)
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(addressInput))
        .addTo(map);

      map.flyTo({ center: selectedCoords, zoom: 14, duration: 600 });
    }
  }, [map, isLoaded, selectedCoords, addressInput]);

  // Internal Mapbox Autofill Geocoder
  const handleSearchAddress = async (query: string) => {
    setAddressInput(query);
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
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
      console.warn('Mapbox Geocoding lookup error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = (s: GeocodeSuggestion) => {
    setAddressInput(s.place_name);
    setSelectedCoords(s.center);
    setSuggestions([]);
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.length > 1
          ? prev.filter((id) => id !== serviceId)
          : prev
        : [...prev, serviceId]
    );
  };

  const handleConfirm = async () => {
    if (!addressInput) {
      toast.error('Please enter and confirm a verified address');
      return;
    }

    if (!tireSize && !vehicleModel) {
      toast.error('Please specify vehicle tire size or vehicle model for the technician');
      return;
    }

    setIsSubmitting(true);
    try {
      // Build selected services payload
      const serviceItems = selectedServices.map((sid) => {
        const item = SERVICES_CATALOG.find((s) => s.id === sid);
        return {
          serviceName: item ? item.name : sid,
          category: item?.category === 'ROADSIDE' ? 'ROADSIDE_ASSISTANCE' : 'TIRE_SERVICE',
          unitPriceCents: item?.basePriceCents || 12000,
          quantity: 1,
        };
      });

      await jobService.verifyBookingAddress(booking.id, {
        serviceAddress: addressInput,
        serviceLatitude: selectedCoords ? selectedCoords[1] : null,
        serviceLongitude: selectedCoords ? selectedCoords[0] : null,
        recipientName: recipientName || undefined,
        recipientPhone: recipientPhone || undefined,
        problemNotes: problemNotes || undefined,
        urgency,
        paymentMethod,
        vehicleMake: vehicleMake || undefined,
        vehicleModel: vehicleModel || undefined,
        vehicleYear: vehicleYear ? Number(vehicleYear) : undefined,
        tireSize: tireSize || undefined,
        licensePlate: licensePlate || undefined,
        serviceItems,
      });

      toast.success('Booking verified! Transferred to Dispatch queue as PENDING.');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to verify booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Confirm & Verify Website Booking • Job #${booking.jobCode || booking.jobNumber}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
        {/* Customer Original Input Banner */}
        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-900 block">
                Raw Address from Website Form (Customer Input):
              </span>
              <p className="text-amber-800 font-mono mt-0.5 font-semibold">
                "{rawCustomerAddress || 'No address provided by customer'}"
              </p>
              <p className="text-[11px] text-amber-700 mt-1">
                Call customer to confirm location and exact tire specifications before releasing to the driver queue.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Canonical Address & Mapbox Visual */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7 space-y-3">
            {/* Mapbox Address Autofill Search */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin size={13} className="text-red-600" />
                <span>Verified Address (Internal Mapbox Autofill) *</span>
              </label>
              <div className="relative">
                {isSearching ? (
                  <Loader2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                ) : (
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                )}
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => handleSearchAddress(e.target.value)}
                  placeholder={`Search ${countryCode} address or postal code...`}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              {/* Suggestions Dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full p-2.5 text-left text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer"
                    >
                      <MapPin size={13} className="text-red-500 shrink-0" />
                      <span className="truncate">{s.place_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Geocode Coordinates Status */}
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-500 font-medium">GPS Geocoding:</span>
              {selectedCoords ? (
                <span className="font-mono font-bold text-emerald-600 flex items-center gap-1">
                  <Check size={13} />
                  <span>
                    {selectedCoords[1].toFixed(5)}, {selectedCoords[0].toFixed(5)}
                  </span>
                </span>
              ) : (
                <span className="text-amber-600 font-medium">Pending location selection</span>
              )}
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Customer Name
                </label>
                <div className="relative">
                  <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-slate-200"
                    placeholder="Customer Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Customer Phone
                </label>
                <div className="relative">
                  <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-slate-200"
                    placeholder="+1..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Mapbox Visual Pin Preview */}
          <div className="md:col-span-5 h-48 md:h-auto rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 relative min-h-[180px]">
            <div ref={containerRef} className="w-full h-full" />
            <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2 py-1 rounded-md font-mono">
              Mapbox Verified Location
            </div>
          </div>
        </div>

        {/* Section 2: Vehicle Specs & Tire Size (Full Agent Intake Parity) */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Car size={14} className="text-red-600" />
              <span>Vehicle Specifications & Tire Size</span>
            </span>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              ★ Technician Stock Requirement
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Make</label>
              <input
                type="text"
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                placeholder="Toyota"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Model</label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="RAV4"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Year</label>
              <input
                type="text"
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value)}
                placeholder="2022"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Plate</label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="CFMR 482"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-red-600 mb-1">Tire Size *</label>
              <input
                type="text"
                value={tireSize}
                onChange={(e) => setTireSize(e.target.value)}
                placeholder="225/65R17"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border-2 border-red-300 focus:border-red-500 bg-white font-mono font-bold text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Services Selection & Urgency */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Wrench size={14} className="text-red-600" />
              <span>Service Catalog Selection ({selectedServices.length} Selected)</span>
            </span>
            <span className="text-[11px] text-slate-500">Pick requested roadside services</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
            {SERVICES_CATALOG.map((svc: ServiceCatalogItem) => {
              const isSelected = selectedServices.includes(svc.id);
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => toggleService(svc.id)}
                  className={`p-2 rounded-lg border text-left text-xs transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-red-500 bg-red-50/70 text-red-900 font-semibold'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate block font-medium">{svc.name}</span>
                  <span className="text-[10px] font-mono font-bold text-slate-500 mt-1">
                    {formatCurrency(centsToDollars(svc.basePriceCents), currencySymbol)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Urgency & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <AlertTriangle size={12} className="text-amber-500" />
                <span>Urgency Level</span>
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white font-semibold"
              >
                <option value="CRITICAL">Critical (Hazard / Highway Shoulder)</option>
                <option value="HIGH">High (Highway / Rush Hour)</option>
                <option value="NORMAL">Normal / Standard</option>
                <option value="LOW">Low (Scheduled / Driveway)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <CreditCard size={12} className="text-slate-500" />
                <span>Payment Method</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="POS">POS (Mobile Card Machine)</option>
                <option value="E_TRANSFER">E-Transfer / Interac</option>
                <option value="CASH">Cash on Scene</option>
                <option value="MOTO">MOTO (Phone Credit Card)</option>
                <option value="INVOICE_NET30">Fleet Net 30 Invoice</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Breakdown Notes */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Breakdown & Service Instructions (For Technician)
          </label>
          <textarea
            value={problemNotes}
            onChange={(e) => setProblemNotes(e.target.value)}
            rows={2}
            className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white"
            placeholder="Add driver safety instructions, cross-streets, or special instructions..."
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary px-3.5 py-2 text-xs cursor-pointer">
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!addressInput || isSubmitting}
            className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 font-bold"
          >
            <CheckCircle2 size={14} />
            <span>{isSubmitting ? 'Verifying...' : 'Confirm & Release to Dispatch'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
