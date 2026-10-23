import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  CheckCircle2,
  Phone,
  User,
  CreditCard,
  Clock,
  UserCheck,
  Building2,
  ShieldCheck,
  FileText,
  Zap,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import Modal from '../ui/Modal';
import AddressAutocompleteInput, { type GeocodeLocation } from '../common/AddressAutocompleteInput';
import MultiServiceSelector, { type SelectedServiceItem } from '../common/MultiServiceSelector';
import { ArrivalWindowSelector, type ArrivalWindowData } from '../common/ArrivalWindowSelector';
import { useTenant } from '../../context/TenantContext';
import { useMapbox, DEFAULT_MAP_CENTER } from '../../hooks/useMapbox';
import { jobService } from '../../services/jobService';
import { userService, type UserItem } from '../../services/userService';
import { useQuery } from '@tanstack/react-query';
import mapboxgl from 'mapbox-gl';
import { toast } from 'sonner';
import { resolveTimezoneFromCoords } from '../../utils/date';

interface VerifyAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onSuccess?: () => void;
}

const COMMON_TIRE_SIZES = ['11R22.5', '295/75R22.5', '275/65R18', '225/65R17'];

export default function VerifyAddressModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: VerifyAddressModalProps) {
  const navigate = useNavigate();
  const { country: tenantCountry, currencySymbol } = useTenant();

  const countryCode = (booking?.countryCode || tenantCountry || 'CA') as 'CA' | 'US' | 'UK';
  const taxRate = countryCode === 'CA' ? 0.13 : countryCode === 'UK' ? 0.20 : 0.08;

  // Block 1: Address & Geocoding + Customer Contact
  const [serviceAddress, setServiceAddress] = useState<string>('');
  const [serviceCoords, setServiceCoords] = useState<{
    latitude: number | null;
    longitude: number | null;
    timezone?: string;
  }>({
    latitude: null,
    longitude: null,
  });
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');

  // Block 2: Vehicle & Tire Information
  const [vehicleMake, setVehicleMake] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [vehicleYear, setVehicleYear] = useState<string>('');
  const [unitNumber, setUnitNumber] = useState<string>('');
  const [tireSize, setTireSize] = useState<string>('11R22.5');
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [vehicleColor, setVehicleColor] = useState<string>('');

  // Block 3: Urgency, Arrival Window & Services
  const [urgency, setUrgency] = useState<'URGENT' | 'STANDARD' | 'FUTURE'>('URGENT');
  const [arrivalWindow, setArrivalWindow] = useState<ArrivalWindowData>({
    mode: 'ETA',
    estimatedArrivalMinutes: 30,
  });
  const [serviceItems, setServiceItems] = useState<SelectedServiceItem[]>([
    {
      serviceId: 'TIRE_REPAIR',
      serviceName: 'Tire Repair (plug)',
      category: 'TIRE_SERVICE',
      unitPriceCents: 8000,
      quantity: 1,
    },
  ]);
  const [isTaxIncluded, setIsTaxIncluded] = useState<boolean>(false);

  // Block 4: Billing, Optional Technician Assignment & Triage Release
  const [assignedDriverId, setAssignedDriverId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('POS');
  const [problemNotes, setProblemNotes] = useState<string>('');
  const [upfrontAmountCents, setUpfrontAmountCents] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Query Available Regional Drivers for Technician Assignment
  const { data: drivers = [] } = useQuery<UserItem[]>({
    queryKey: ['drivers', countryCode],
    queryFn: () => userService.getDrivers(countryCode),
    enabled: isOpen,
  });

  const rawCustomerAddress = booking?.serviceAddress || booking?.locationAddress || '';
  const isFleet = booking?.source === 'FLEET_PORTAL' || Boolean(booking?.fleetId);
  const isMember = booking?.source === 'MEMBER_PORTAL' || booking?.customer?.customerType === 'MEMBERSHIP';

  const discountPercent = isFleet
    ? Math.max(0, Number(booking?.fleet?.discountPercent || 0))
    : isMember
    ? 10
    : 0;

  const discountLabel = isFleet
    ? `Contract Discount (${discountPercent}%)`
    : isMember
    ? 'VIP Member Discount (10%)'
    : undefined;

  // Initialize state when booking opens
  useEffect(() => {
    if (booking) {
      setServiceAddress(rawCustomerAddress);
      setRecipientName(booking.recipientName || booking.customer?.fullName || booking.customer?.name || '');
      setRecipientPhone(booking.recipientPhone || booking.customer?.phone || '');

      const rawNotes = booking.problemNotes || booking.notes || '';
      const strippedNotes = rawNotes
        .replace(/\[Requested By:\s*[^\]]+\]\s*/g, '')
        .replace(/\[Address Notes:\s*[^\]]+\]\s*/g, '')
        .replace(/\[Fleet Self-Request\]\s*/g, '')
        .trim();
      setProblemNotes(strippedNotes);

      setUpfrontAmountCents(booking.upfrontAmountCents || booking.depositCents || 0);

      const lat = typeof booking.serviceLatitude === 'number' ? booking.serviceLatitude : null;
      const lng = typeof booking.serviceLongitude === 'number' ? booking.serviceLongitude : null;
      const tz = booking.serviceTimezone || resolveTimezoneFromCoords(lat, lng, countryCode);

      setServiceCoords({
        latitude: lat,
        longitude: lng,
        timezone: tz,
      });

      // Pre-fill vehicle specs
      const v = booking.vehicle;
      if (v) {
        setVehicleMake(v.make || '');
        setVehicleModel(v.model || '');
        setVehicleYear(v.year ? String(v.year) : '');
        setVehicleColor(v.color || (booking as any).vehicleColor || '');
        setUnitNumber(v.unitNumber || booking.unitNumber || '');
        setTireSize(v.tireSize || booking.tireSize || (isFleet ? '11R22.5' : '225/65R17'));
        setLicensePlate(v.licensePlate || booking.licensePlate || '');
      } else {
        setVehicleMake(booking.vehicleMake || '');
        setVehicleModel(booking.vehicleModel || '');
        setVehicleYear(booking.vehicleYear ? String(booking.vehicleYear) : '');
        setVehicleColor((booking as any).vehicleColor || '');
        setUnitNumber(booking.unitNumber || '');
        setTireSize(booking.tireSize || (isFleet ? '11R22.5' : '225/65R17'));
        setLicensePlate(booking.licensePlate || '');
      }

      // Pre-fill services
      if (booking.serviceItems && Array.isArray(booking.serviceItems) && booking.serviceItems.length > 0) {
        setServiceItems(
          booking.serviceItems.map((si: any) => ({
            serviceId: si.id || si.serviceName,
            serviceName: si.serviceName,
            category:
              si.category === 'ROADSIDE' || si.category === 'ROADSIDE_ASSISTANCE'
                ? 'ROADSIDE_ASSISTANCE'
                : si.category === 'MAINTENANCE'
                ? 'MAINTENANCE'
                : 'TIRE_SERVICE',
            unitPriceCents: si.unitPriceCents || 12000,
            quantity: si.quantity || 1,
            notes: si.notes || '',
          }))
        );
      } else {
        setServiceItems([
          {
            serviceId: 'TIRE_REPAIR',
            serviceName: isFleet ? 'Commercial Tire Repair' : 'Tire Repair (plug)',
            category: 'TIRE_SERVICE',
            unitPriceCents: isFleet ? 12000 : 8000,
            quantity: 1,
            notes: '',
          },
        ]);
      }

      // Timing & Urgency
      const rawUrg = String(booking.urgency || '').toUpperCase();
      if (rawUrg === 'URGENT' || rawUrg === 'EMERGENCY' || rawUrg === 'CRITICAL' || rawUrg === 'HIGH') {
        setUrgency('URGENT');
        setArrivalWindow({
          mode: 'ETA',
          estimatedArrivalMinutes: booking.estimatedArrivalMinutes || 30,
        });
      } else if (rawUrg === 'FUTURE' || rawUrg === 'LOW' || rawUrg === 'SCHEDULED') {
        setUrgency('FUTURE');
        setArrivalWindow({
          mode: 'WINDOW',
          appointmentDate: booking.appointmentDate || booking.scheduledAt,
          arrivalWindowStart: booking.arrivalWindowStart,
          arrivalWindowEnd: booking.arrivalWindowEnd,
        });
      } else {
        setUrgency('STANDARD');
        if (booking.appointmentDate || booking.arrivalWindowStart) {
          setArrivalWindow({
            mode: 'WINDOW',
            appointmentDate: booking.appointmentDate || booking.scheduledAt,
            arrivalWindowStart: booking.arrivalWindowStart,
            arrivalWindowEnd: booking.arrivalWindowEnd,
          });
        } else {
          setArrivalWindow({
            mode: 'ETA',
            estimatedArrivalMinutes: booking.estimatedArrivalMinutes || 30,
          });
        }
      }

      setPaymentMethod(booking.paymentMethod || (isFleet ? 'INVOICE_NET30' : 'POS'));
      setAssignedDriverId(booking.driverId || '');
    }
  }, [booking, rawCustomerAddress, countryCode, isFleet]);

  // Mapbox Map Visual Canvas
  const initialCenter: [number, number] =
    serviceCoords.longitude && serviceCoords.latitude
      ? [serviceCoords.longitude, serviceCoords.latitude]
      : DEFAULT_MAP_CENTER;

  const { containerRef, map, isLoaded } = useMapbox({
    center: initialCenter,
    zoom: 12,
    interactive: true,
  });

  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;

    if (markerRef.current) {
      markerRef.current.remove();
    }

    if (serviceCoords.longitude && serviceCoords.latitude) {
      const coords: [number, number] = [serviceCoords.longitude, serviceCoords.latitude];
      const el = document.createElement('div');
      el.className =
        'w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-bold';
      el.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';

      markerRef.current = new mapboxgl.Marker(el)
        .setLngLat(coords)
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(serviceAddress || 'Verified Destination'))
        .addTo(map);

      map.flyTo({ center: coords, zoom: 14, duration: 600 });
    }
  }, [map, isLoaded, serviceCoords, serviceAddress]);

  // Financial Calculations
  const subtotalCents = serviceItems.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0
  );
  const discountCents = Math.round(subtotalCents * (discountPercent / 100));

  const handleConfirm = async () => {
    if (!serviceAddress) {
      toast.error('Please enter and confirm a verified breakdown/service address');
      return;
    }

    if (!tireSize && !vehicleModel) {
      toast.error('Please specify vehicle tire size or vehicle model for the technician');
      return;
    }

    if (serviceItems.length === 0) {
      toast.error('Please add at least one commercial or roadside service item');
      return;
    }

    setIsSubmitting(true);
    try {
      const isEtaMode = urgency === 'URGENT' || arrivalWindow.mode === 'ETA';
      const nowMs = Date.now();
      const etaMinutes = arrivalWindow.estimatedArrivalMinutes || 30;

      const apptDateIso = isEtaMode
        ? new Date(nowMs + etaMinutes * 60000).toISOString()
        : arrivalWindow.appointmentDate || arrivalWindow.arrivalWindowStart || new Date().toISOString();

      const winStartIso = isEtaMode
        ? new Date(nowMs + etaMinutes * 60000).toISOString()
        : arrivalWindow.arrivalWindowStart || apptDateIso;

      const winEndIso = isEtaMode
        ? new Date(nowMs + (etaMinutes + 30) * 60000).toISOString()
        : arrivalWindow.arrivalWindowEnd || new Date(new Date(winStartIso).getTime() + 60 * 60000).toISOString();

      await jobService.verifyBookingAddress(booking.id, {
        serviceAddress,
        serviceLatitude: serviceCoords.latitude,
        serviceLongitude: serviceCoords.longitude,
        serviceTimezone: serviceCoords.timezone,
        appointmentDate: apptDateIso,
        arrivalWindowStart: winStartIso,
        arrivalWindowEnd: winEndIso,
        estimatedArrivalMinutes: isEtaMode ? etaMinutes : null,
        driverId: assignedDriverId || null,
        recipientName: recipientName || undefined,
        recipientPhone: recipientPhone || undefined,
        upfrontAmountCents: upfrontAmountCents > 0 ? upfrontAmountCents : undefined,
        problemNotes: problemNotes || undefined,
        urgency,
        paymentMethod,
        vehicleMake: vehicleMake || undefined,
        vehicleModel: vehicleModel || undefined,
        vehicleYear: vehicleYear ? Number(vehicleYear) : undefined,
        vehicleColor: vehicleColor || undefined,
        unitNumber: unitNumber || undefined,
        tireSize: tireSize || undefined,
        licensePlate: licensePlate && licensePlate.trim() ? licensePlate.trim().toUpperCase() : undefined,
        discountCents,
        serviceItems: serviceItems.map((item) => ({
          serviceName: item.serviceName,
          category:
            item.category === 'ROADSIDE_ASSISTANCE' || (item.category as string) === 'ROADSIDE'
              ? 'ROADSIDE_ASSISTANCE'
              : item.category === 'MAINTENANCE'
              ? 'MAINTENANCE'
              : 'TIRE_SERVICE',
          unitPriceCents: item.unitPriceCents,
          quantity: item.quantity,
          notes: item.notes || null,
        })),
      });

      const selectedDriver = drivers.find((d) => d.id === assignedDriverId);
      if (selectedDriver) {
        toast.success(`Booking verified & dispatched to ${selectedDriver.fullName}! Transferred to Jobs.`);
      } else {
        toast.success('Booking verified! Transferred to Jobs dispatch queue.');
      }
      onSuccess?.();
      onClose();
      navigate('/jobs');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to verify booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!booking) return null;

  const modalTitle = isFleet
    ? `Verify & Dispatch Fleet Request • ${booking.fleet?.name || 'Corporate Account'} • #${booking.jobCode || booking.jobNumber}`
    : isMember
    ? `Verify VIP Member Booking • ${recipientName || 'Member'} • #${booking.jobCode || booking.jobNumber}`
    : `Verify Public Self-Booking • #${booking.jobCode || booking.jobNumber}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={modalTitle}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-5">
        {/* BLOCK 1: LOCATION & ON-SCENE CONTACT (2-Column Grid) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Block 1: Location & On-Scene Contact
              </h4>
            </div>
            {isFleet ? (
              <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Fleet Account
              </span>
            ) : isMember ? (
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> VIP Member
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-white text-[11px] font-bold">
                Public Web Booking
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Form Controls */}
            <div className="lg:col-span-7 space-y-3">
              {rawCustomerAddress && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                    Original Submitted Address
                  </span>
                  <p className="font-mono text-slate-800 break-words">{rawCustomerAddress}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Verified Mapbox Address <span className="text-red-500">*</span>
                </label>
                <AddressAutocompleteInput
                  value={serviceAddress}
                  onChange={setServiceAddress}
                  onSelectLocation={(loc: GeocodeLocation) => {
                    setServiceAddress(loc.address);
                    setServiceCoords({
                      latitude: loc.latitude,
                      longitude: loc.longitude,
                      timezone: loc.timezone,
                    });
                  }}
                  countryCode={countryCode}
                  placeholder="Verify street address, highway exit, or landmark"
                  className="w-full"
                />
              </div>

              {/* GPS Coordinates lock indicator */}
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-600 font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-600" />
                  GPS Coordinate Lock:
                </span>
                {serviceCoords.latitude && serviceCoords.longitude ? (
                  <span className="font-mono text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {serviceCoords.latitude.toFixed(4)}, {serviceCoords.longitude.toFixed(4)} ({serviceCoords.timezone || 'Local'})
                  </span>
                ) : (
                  <span className="text-amber-700 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Select an address above to lock GPS
                  </span>
                )}
              </div>

              {/* On-Scene Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Driver or On-Scene Contact"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Live Mapbox Pin Preview */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Map Pin Location</span>
                <span className="text-[10px] text-slate-400 font-mono">Mapbox GL</span>
              </div>
              <div
                ref={containerRef}
                className="w-full h-48 lg:h-full min-h-[190px] rounded-xl border border-slate-200 overflow-hidden relative shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* BLOCK 2: VEHICLE & TIRE SPECIFICATION (model Vehicle) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Block 2: Vehicle & Tire Specification
              </h4>
            </div>
            {isFleet && unitNumber && (
              <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold">
                UNIT #{unitNumber}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {isFleet && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Unit #</label>
                <input
                  type="text"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g. S-42"
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            )}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Year</label>
              <input
                type="text"
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value)}
                placeholder="2024"
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Make</label>
              <input
                type="text"
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                placeholder="Freightliner / Ford"
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Model</label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="Cascadia / F-550"
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Plate</label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="ON-XXXXXX"
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Color</label>
              <input
                type="text"
                value={vehicleColor}
                onChange={(e) => setVehicleColor(e.target.value)}
                placeholder="White / Blue"
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Tire Size & Quick Selection Chips */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Tire Size:</span>
              <input
                type="text"
                value={tireSize}
                onChange={(e) => setTireSize(e.target.value)}
                placeholder="11R22.5"
                className="w-36 px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-slate-500">Quick Sizes:</span>
              {COMMON_TIRE_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setTireSize(size)}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition cursor-pointer ${
                    tireSize === size
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* BLOCK 3: URGENCY, PROMISED ARRIVAL WINDOW & WORK ORDER SERVICES */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Block 3: Urgency, Schedule & Work Order Services
              </h4>
            </div>
          </div>

          {/* Urgency 3-Card Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                id: 'URGENT' as const,
                label: 'Urgent Breakdown',
                desc: 'Highway or roadside emergency requiring ASAP dispatch',
                icon: Zap,
                badge: 'Immediate',
              },
              {
                id: 'STANDARD' as const,
                label: 'Standard Service',
                desc: 'Depot or yard tire service within guaranteed same-day window',
                icon: Clock,
                badge: 'Same-Day',
              },
              {
                id: 'FUTURE' as const,
                label: 'Future Appointment',
                desc: 'Scheduled fleet maintenance for a future date/time',
                icon: Calendar,
                badge: 'Scheduled',
              },
            ].map((u) => {
              const isSelected = urgency === u.id;
              const Icon = u.icon;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setUrgency(u.id);
                    if (u.id === 'URGENT') {
                      setArrivalWindow({ mode: 'ETA', estimatedArrivalMinutes: 30 });
                    } else {
                      setArrivalWindow((prev) => ({ ...prev, mode: 'WINDOW' }));
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'border-red-600 bg-red-50/60 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${isSelected ? 'text-red-700' : 'text-slate-800'}`}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-red-600' : 'text-slate-500'}`} />
                      {u.label}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {u.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{u.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Arrival Window Selector */}
          <ArrivalWindowSelector
            value={arrivalWindow}
            onChange={setArrivalWindow}
            timezone={serviceCoords.timezone || booking?.serviceTimezone}
            countryCode={countryCode}
            hideModeToggle={true}
            showPktWindow={true}
          />

          {/* Work Order Services */}
          <div className="pt-2 border-t border-slate-100">
            <MultiServiceSelector
              items={serviceItems}
              onChange={setServiceItems}
              countryCode={countryCode}
              currencySymbol={currencySymbol}
              taxRate={taxRate}
              isTaxIncluded={isTaxIncluded}
              setIsTaxIncluded={setIsTaxIncluded}
              discountPercent={discountPercent}
              discountLabel={discountLabel}
              allowPriceEdit={true}
              title="Work Order Services & Price Breakdown"
            />
          </div>
        </div>

        {/* BLOCK 4: BILLING, OPTIONAL TECHNICIAN ASSIGNMENT & TRIAGE RELEASE */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Block 4: Billing, Driver Assignment & Triage Release
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {isFleet ? (
                  <>
                    <option value="INVOICE_NET30">Direct Invoice (Net 30 Terms)</option>
                    <option value="POS">Credit / Debit on Scene (POS)</option>
                    <option value="E_TRANSFER">E-Transfer</option>
                    <option value="CASH">Cash</option>
                  </>
                ) : (
                  <>
                    <option value="POS">Credit / Debit on Scene (POS Terminal)</option>
                    <option value="E_TRANSFER">E-Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="CREDIT_CARD">Credit Card (Saved on File)</option>
                  </>
                )}
              </select>
            </div>

            {/* Upfront Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Upfront Deposit ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={upfrontAmountCents ? (upfrontAmountCents / 100).toFixed(2) : ''}
                onChange={(e) => setUpfrontAmountCents(Math.round((parseFloat(e.target.value) || 0) * 100))}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Driver Assignment (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                Technician Assignment (Optional)
              </label>
              <select
                value={assignedDriverId}
                onChange={(e) => setAssignedDriverId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Leave Unassigned (Release to Pending Queue)</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} {d.phone ? `(${d.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Problem Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Special Instructions / Dispatcher Notes
            </label>
            <textarea
              value={problemNotes}
              onChange={(e) => setProblemNotes(e.target.value)}
              placeholder="e.g. Front driver-side flat, gate code #4829, truck parked behind warehouse"
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none font-medium"
            />
          </div>

          {/* Action Release Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                assignedDriverId
                  ? 'bg-slate-900 hover:bg-slate-800 active:bg-black'
                  : 'bg-red-600 hover:bg-red-700 active:bg-red-800'
              }`}
            >
              {isSubmitting ? (
                <span>Processing...</span>
              ) : assignedDriverId ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Verify & Dispatch Directly to Technician</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify & Release to Pending Queue</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
