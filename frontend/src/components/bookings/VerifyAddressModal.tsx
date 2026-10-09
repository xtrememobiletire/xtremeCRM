import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, CheckCircle2, AlertCircle, Phone, User, Loader2, Check } from 'lucide-react';
import Modal from '../ui/Modal';
import { useMapbox, MAPBOX_TOKEN, DEFAULT_MAP_CENTER } from '../../hooks/useMapbox';
import { jobService } from '../../services/jobService';
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
  const [addressInput, setAddressInput] = useState<string>('');
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [problemNotes, setProblemNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const countryCode = booking?.countryCode || 'CA';
  const rawCustomerAddress = booking?.serviceAddress || booking?.locationAddress || '';

  // Initialize state when booking opens
  useEffect(() => {
    if (booking) {
      setAddressInput(rawCustomerAddress);
      setRecipientName(booking.recipientName || booking.customer?.fullName || '');
      setRecipientPhone(booking.recipientPhone || booking.customer?.phone || '');
      setProblemNotes(booking.problemNotes || '');
      if (booking.serviceLatitude && booking.serviceLongitude) {
        setSelectedCoords([booking.serviceLongitude, booking.serviceLatitude]);
      } else {
        setSelectedCoords(null);
      }
    }
  }, [booking, rawCustomerAddress]);

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
      el.className = 'w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-xl flex items-center justify-center text-white';
      el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';

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

  const handleConfirm = async () => {
    if (!addressInput) {
      toast.error('Please enter and confirm a verified address');
      return;
    }

    setIsSubmitting(true);
    try {
      await jobService.verifyBookingAddress(booking.id, {
        serviceAddress: addressInput,
        serviceLatitude: selectedCoords ? selectedCoords[1] : null,
        serviceLongitude: selectedCoords ? selectedCoords[0] : null,
        recipientName: recipientName || undefined,
        recipientPhone: recipientPhone || undefined,
        problemNotes: problemNotes || undefined,
      });

      toast.success('Address confirmed! Booking released to Dispatch queue as PENDING.');
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
      title={`Confirm Website Booking • Job #${booking.jobCode || booking.jobNumber}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Customer Original Input Banner */}
        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-900 block">
                Raw Address from Website Form (Customer Input):
              </span>
              <p className="text-amber-800 font-mono mt-0.5">
                "{rawCustomerAddress || 'No address provided by customer'}"
              </p>
              <p className="text-[11px] text-amber-700 mt-1">
                Call the customer to verify cross-streets, then select the canonical address below using the internal Mapbox autofill.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left Form: Mapbox Search & Customer Info */}
          <div className="md:col-span-7 space-y-3">
            {/* Mapbox Address Autofill Search */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Verified Address (Internal Mapbox Autofill)
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
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-500 font-medium">GPS Geocoding:</span>
              {selectedCoords ? (
                <span className="font-mono font-bold text-emerald-600 flex items-center gap-1">
                  <Check size={13} />
                  <span>{selectedCoords[1].toFixed(5)}, {selectedCoords[0].toFixed(5)}</span>
                </span>
              ) : (
                <span className="text-amber-600 font-medium">Coordinates pending selection</span>
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
                  />
                </div>
              </div>
            </div>

            {/* Problem Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Breakdown & Service Notes
              </label>
              <textarea
                value={problemNotes}
                onChange={(e) => setProblemNotes(e.target.value)}
                rows={2}
                className="w-full p-2 text-xs rounded-lg border border-slate-200"
                placeholder="Additional notes from customer..."
              />
            </div>
          </div>

          {/* Right: Mapbox Visual Pin Preview */}
          <div className="md:col-span-5 h-56 md:h-auto rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 relative min-h-[200px]">
            <div ref={containerRef} className="w-full h-full" />
            <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2 py-1 rounded-md font-mono">
              Mapbox Verified Location
            </div>
          </div>
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
            className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <CheckCircle2 size={14} />
            <span>{isSubmitting ? 'Verifying...' : 'Confirm & Release to Dispatch'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
