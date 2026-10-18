import { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  Car,
  Wrench,
  CreditCard,
  AlertTriangle,
  Clock,
  UserCheck,
  Navigation,
  Building2,
  ShieldCheck,
  Check,
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
  const { country: tenantCountry, currencySymbol } = useTenant();

  const countryCode = (booking?.countryCode || tenantCountry || 'CA') as 'CA' | 'US' | 'UK';
  const taxRate = countryCode === 'CA' ? 0.13 : countryCode === 'UK' ? 0.20 : 0.08;

  // Address & Geocoding
  const [serviceAddress, setServiceAddress] = useState<string>('');
  const [serviceCoords, setServiceCoords] = useState<{
    latitude: number | null;
    longitude: number | null;
    timezone?: string;
  }>({
    latitude: null,
    longitude: null,
  });

  // Customer Contact
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');

  // Vehicle & Tire Information
  const [vehicleMake, setVehicleMake] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [vehicleYear, setVehicleYear] = useState<string>('');
  const [unitNumber, setUnitNumber] = useState<string>('');
  const [tireSize, setTireSize] = useState<string>('11R22.5');
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [vehicleColor, setVehicleColor] = useState<string>('');

  // Work Order Services
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

  // Arrival Window & Urgency
  const [arrivalWindow, setArrivalWindow] = useState<ArrivalWindowData>({
    mode: 'ETA',
    estimatedArrivalMinutes: 30,
  });
  const [urgency, setUrgency] = useState<'URGENT' | 'STANDARD' | 'FUTURE'>('URGENT');

  // Technician Assignment & Payment Method
  const [assignedDriverId, setAssignedDriverId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('POS');
  const [problemNotes, setProblemNotes] = useState<string>('');
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
      setProblemNotes(booking.problemNotes || booking.notes || '');

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
        'w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-xl flex items-center justify-center text-white';
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
      const isEtaMode = arrivalWindow.mode === 'ETA';
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
        toast.success(`Booking verified & directly dispatched to ${selectedDriver.fullName}!`);
      } else {
        toast.success('Booking verified! Transferred to Dispatch queue as PENDING.');
      }
      onSuccess?.();
      onClose();
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
    ? `Verify & Dispatch VIP Member • ${recipientName || 'Member'} • #${booking.jobCode || booking.jobNumber}`
    : `Verify & Dispatch Website Inbound • #${booking.jobCode || booking.jobNumber}`;

  const selectedDriverObj = drivers.find((d) => d.id === assignedDriverId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
        {/* Context-Aware Account Banner */}
        <div
          className={`p-3.5 rounded-xl border text-xs ${
            isFleet
              ? 'bg-blue-50/80 border-blue-200 text-blue-900'
              : isMember
              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {isFleet ? (
              <Building2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
            ) : isMember ? (
              <ShieldCheck size={16} className="text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="text-slate-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">
                  {isFleet
                    ? `Commercial Fleet Account: ${booking.fleet?.name || 'Contracted Fleet'}`
                    : isMember
                    ? 'VIP Membership Request (10% Tier Discount Applied)'
                    : 'Customer Raw Web Inbound'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isFleet
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : isMember
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  {isFleet ? 'FLEET ACCOUNT' : isMember ? 'VIP MEMBER' : 'PUBLIC WEB'}
                </span>
              </div>
              <p className="font-mono mt-0.5 font-semibold text-slate-900">
                "{rawCustomerAddress || 'No raw address entered by customer'}"
              </p>
              <p className="text-[11px] mt-1 opacity-90">
                {isFleet
                  ? 'Verify depot/highway breakdown coordinates, confirm tire specifications, and set arrival window before releasing to technician.'
                  : isMember
                  ? 'Confirm member location and assign priority dispatch van.'
                  : 'Call customer to confirm location and exact tire specifications before dispatching.'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Canonical Address & Interactive Mapbox Preview */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-red-600" />
                  <span>Verified Service / Yard Address *</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Mapbox Places ({countryCode})</span>
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
                placeholder={`Search ${countryCode} street address, depot, or highway exit...`}
                className="w-full"
                required
              />
            </div>

            {/* GPS & Timezone Status */}
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-500 font-medium">GPS Geocoding:</span>
              {serviceCoords.latitude && serviceCoords.longitude ? (
                <span className="font-mono font-bold text-emerald-600 flex items-center gap-1">
                  <Check size={13} />
                  <span>
                    {serviceCoords.latitude.toFixed(4)}, {serviceCoords.longitude.toFixed(4)}
                  </span>
                  {serviceCoords.timezone && (
                    <span className="text-slate-500 text-[10px] font-normal ml-1">
                      ({serviceCoords.timezone})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-amber-600 font-medium flex items-center gap-1">
                  <Navigation size={12} />
                  Pending location lock
                </span>
              )}
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  On-Scene Recipient Name
                </label>
                <div className="relative">
                  <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                    placeholder="Operator / Driver"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Contact Phone
                </label>
                <div className="relative">
                  <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Mapbox Visual Pin Preview */}
          <div className="md:col-span-5 h-48 md:h-auto rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 relative min-h-[180px]">
            <div ref={containerRef} className="w-full h-full" />
            <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2 py-1 rounded-md font-mono flex items-center gap-1">
              <Navigation size={10} className="text-red-400" />
              <span>Mapbox Satellite / Streets</span>
            </div>
          </div>
        </div>

        {/* Section 2: Vehicle Specs & Tire Size */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Car size={14} className="text-red-600" />
              <span>Vehicle Specifications & Tire Size</span>
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-semibold mr-1">Quick Tire:</span>
              {COMMON_TIRE_SIZES.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setTireSize(sz)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition ${
                    tireSize === sz
                      ? 'bg-red-50 border-red-300 text-red-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit #</label>
              <input
                type="text"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="Unit 18"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Make</label>
              <input
                type="text"
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                placeholder="Freightliner / Ford"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Model</label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="Cascadia / F-550"
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
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Color</label>
              <input
                type="text"
                value={vehicleColor}
                onChange={(e) => setVehicleColor(e.target.value)}
                placeholder="White / Black"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Plate</label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="CFMR 482"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-red-600 mb-1">Tire Size *</label>
              <input
                type="text"
                value={tireSize}
                onChange={(e) => setTireSize(e.target.value)}
                placeholder="11R22.5"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border-2 border-red-300 focus:border-red-500 bg-white font-mono font-bold text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Commercial & Roadside Work Order Services */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-red-600" />
            <span>Commercial & Roadside Work Order Services</span>
          </label>
          <MultiServiceSelector
            countryCode={countryCode}
            currencySymbol={currencySymbol}
            taxRate={taxRate}
            selectedItems={serviceItems}
            onChange={setServiceItems}
            isTaxIncluded={isTaxIncluded}
            onToggleTaxIncluded={setIsTaxIncluded}
            discountPercent={discountPercent}
            discountLabel={discountLabel}
            title="Work Order Services & Financial Breakdown"
          />
        </div>

        {/* Section 4: Arrival Timing & Service Window ("Between Time") */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Arrival Timing & Service Window ("Between Time")</span>
            </span>
            <span className="text-[11px] font-mono text-blue-600 font-bold">
              {arrivalWindow.displayLabel || 'Default ~30m'}
            </span>
          </label>
          <ArrivalWindowSelector
            value={arrivalWindow}
            timezone={serviceCoords.timezone}
            countryCode={countryCode}
            onChange={(data) => {
              setArrivalWindow(data);
              if (data.mode === 'ETA') {
                setUrgency('URGENT');
              } else if (data.mode === 'WINDOW') {
                const isFutureDate =
                  data.appointmentDate &&
                  new Date(data.appointmentDate).toDateString() !== new Date().toDateString();
                setUrgency(isFutureDate ? 'FUTURE' : 'STANDARD');
              }
            }}
          />
        </div>

        {/* Section 5: Dispatch Urgency Priority */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Dispatch Urgency Priority</span>
            </span>
            {arrivalWindow.mode !== 'WINDOW' && (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Locked to URGENT for Quick ETA
              </span>
            )}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: 'URGENT',
                label: 'Urgent / Breakdown',
                desc: 'Highway dead stop / ASAP',
                color: 'border-red-500 text-red-700 bg-red-50',
              },
              {
                id: 'STANDARD',
                label: 'Standard Yard Service',
                desc: 'Normal queue turnaround',
                color: 'border-blue-500 text-blue-700 bg-blue-50',
              },
              {
                id: 'FUTURE',
                label: 'Future Appointment',
                desc: 'Pre-booked date & window',
                color: 'border-purple-500 text-purple-700 bg-purple-50',
              },
            ].map((u) => {
              const isUrgentEta = arrivalWindow.mode !== 'WINDOW';
              const isDisabled = isUrgentEta && u.id !== 'URGENT';
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && setUrgency(u.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200 select-none'
                      : urgency === u.id
                      ? `${u.color} font-bold shadow-2xs cursor-pointer`
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <div className="text-xs font-bold leading-tight">{u.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{u.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 6: Technician Assignment & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <UserCheck size={14} className="text-blue-600" />
              <span>Assign Regional Technician (Optional)</span>
            </label>
            <select
              value={assignedDriverId}
              onChange={(e) => setAssignedDriverId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              <option value="">-- Leave Unassigned (Release to PENDING Queue) --</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} ({d.email}) {d.phone ? `• ${d.phone}` : ''}
                </option>
              ))}
            </select>
            {selectedDriverObj && (
              <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <Check size={12} />
                <span>Will directly dispatch and assign to {selectedDriverObj.fullName} (Status: ASSIGNED).</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <CreditCard size={14} className="text-slate-500" />
              <span>Billing & Payment Method</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              <option value="INVOICE_NET30">Fleet Net 30 Corporate Invoicing</option>
              <option value="POS">POS (Mobile Card Terminal on Scene)</option>
              <option value="E_TRANSFER">E-Transfer / Interac</option>
              <option value="CASH">Cash on Scene</option>
              <option value="MOTO">MOTO (Phone Credit Card)</option>
              <option value="STRIPE">Stripe Credit Card Online</option>
            </select>
          </div>
        </div>

        {/* Section 7: Breakdown Notes */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Breakdown & Service Instructions (For Technician)
          </label>
          <textarea
            value={problemNotes}
            onChange={(e) => setProblemNotes(e.target.value)}
            rows={2}
            className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white"
            placeholder="Add driver safety instructions, cross-streets, trailer unit number, or special yard instructions..."
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-3.5 py-2 text-xs cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!serviceAddress || isSubmitting}
            className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 font-bold"
          >
            <CheckCircle2 size={14} />
            <span>
              {isSubmitting
                ? 'Verifying & Dispatched...'
                : selectedDriverObj
                ? `Verify & Dispatch to ${selectedDriverObj.fullName}`
                : 'Confirm & Release to Dispatch Queue'}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
