import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Building2, 
  Truck, 
  User, 
  MapPin, 
  Wrench, 
  Clock, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  Navigation,
  UserCheck
} from 'lucide-react';
import Modal from '../../ui/Modal';
import AddressAutocompleteInput, { type GeocodeLocation } from '../../common/AddressAutocompleteInput';
import MultiServiceSelector, { type SelectedServiceItem } from '../../common/MultiServiceSelector';
import { ArrivalWindowSelector, type ArrivalWindowData } from '../../common/ArrivalWindowSelector';
import CountrySiloSelector from '../../common/CountrySiloSelector';
import PhoneInputField from '../../common/PhoneInputField';
import { useTenant } from '../../../context/TenantContext';
import { useCreateJob } from '../../../hooks/useJobs';
import { fleetService, type FleetDriverItem } from '../../../services/fleetService';
import { userService, type UserItem } from '../../../services/userService';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatAsYouType, validateAndNormalizePhone } from '../../../utils/phone';

interface CreateFleetJobModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_COMMERCIAL_TIRE_SIZES = ['11R22.5', '295/75R22.5', '275/65R18', '225/65R17'];

export default function CreateFleetJobModal({ isOpen, onClose }: CreateFleetJobModalProps) {
  const { country: tenantCountry } = useTenant();
  const createJobMutation = useCreateJob();
  const formRef = useRef<HTMLFormElement>(null);

  // 1. Regional Silo Selection (CA / US / UK)
  const [formCountry, setFormCountry] = useState<'CA' | 'US' | 'UK'>((tenantCountry as any) || 'CA');

  useEffect(() => {
    if (isOpen) {
      setFormCountry((tenantCountry as any) || 'CA');
    }
  }, [isOpen, tenantCountry]);

  const currencySymbol = formCountry === 'US' ? '$' : formCountry === 'UK' ? '£' : '$';
  const taxRate = formCountry === 'CA' ? 0.13 : formCountry === 'UK' ? 0.20 : 0.08;

  // 2. Fetch Fleets for selected formCountry
  const { data: fleetsResponse } = useQuery({
    queryKey: ['fleets', formCountry],
    queryFn: () => fleetService.getFleets({ countryCode: formCountry }),
    enabled: isOpen,
  });

  const fleets = fleetsResponse?.data || [];

  // Fetch regional drivers for technician assignment in formCountry
  const { data: drivers = [] } = useQuery<UserItem[]>({
    queryKey: ['drivers', formCountry],
    queryFn: () => userService.getDrivers(formCountry),
    enabled: isOpen,
  });

  // Form State
  const [selectedFleetId, setSelectedFleetId] = useState<string>('');
  const [selectedFleetDriverId, setSelectedFleetDriverId] = useState<string>('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');

  // Vehicle Specs
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isManualVehicle, setIsManualVehicle] = useState(false);
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [tireSize, setTireSize] = useState('11R22.5');
  const [licensePlate, setLicensePlate] = useState('');
  const [unitNumber, setUnitNumber] = useState('');

  // Location & Geocoding
  const [serviceAddress, setServiceAddress] = useState('');
  const [serviceCoords, setServiceCoords] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });

  // Work Order Services
  const [serviceItems, setServiceItems] = useState<SelectedServiceItem[]>([
    {
      serviceId: 'TIRE_SWAP_OFF_RIM',
      serviceName: 'Tire Swap (OFF RIM)',
      category: 'TIRE_SERVICE',
      unitPriceCents: 16000,
      quantity: 1,
    },
  ]);
  const [isTaxIncluded, setIsTaxIncluded] = useState(false);

  // Arrival Window & Urgency
  const [arrivalWindow, setArrivalWindow] = useState<ArrivalWindowData>({ mode: 'ETA', estimatedArrivalMinutes: 30 });
  const [urgency, setUrgency] = useState<'URGENT' | 'STANDARD' | 'FUTURE'>('URGENT');

  // Technician & Notes
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [notes, setNotes] = useState('');

  // Selected Fleet Object
  const selectedFleet = useMemo(() => {
    return fleets.find((f: any) => f.id === selectedFleetId);
  }, [fleets, selectedFleetId]);

  // Registered drivers for this fleet
  const registeredFleetDrivers: FleetDriverItem[] = useMemo(() => {
    return selectedFleet?.drivers || [];
  }, [selectedFleet]);

  // Registered vehicles for this fleet
  const fleetVehicles: any[] = useMemo(() => {
    return selectedFleet?.vehicles || [];
  }, [selectedFleet]);

  // Handle Fleet Selection
  const handleSelectFleet = (fleetId: string) => {
    setSelectedFleetId(fleetId);
    setSelectedFleetDriverId('');
    setSelectedVehicleId('');
    setIsManualVehicle(false);
    setVehicleMake('');
    setVehicleModel('');
    setVehicleYear('');
    setLicensePlate('');
    setUnitNumber('');
    setTireSize('11R22.5');
    setDriverName('');
    setDriverPhone('');

    const f = fleets.find((item: any) => item.id === fleetId);
    if (f && Array.isArray(f.vehicles) && f.vehicles.length === 1) {
      handleSelectVehicle(f.vehicles[0].id, f.vehicles);
    }
  };

  // Handle Registered Fleet Driver Selection
  const handleSelectFleetDriver = (driverId: string) => {
    setSelectedFleetDriverId(driverId);
    if (!driverId) return;

    const fd = registeredFleetDrivers.find((d) => d.id === driverId);
    if (fd) {
      setDriverName(fd.fullName || '');
      setDriverPhone(fd.phone ? formatAsYouType(fd.phone, formCountry) : '');

      // If registered driver has an assigned vehicle / license plate, auto-fill it
      if (fd.licensePlate) {
        const match = fleetVehicles.find((v) => v.licensePlate?.toLowerCase() === fd.licensePlate?.toLowerCase());
        if (match) handleSelectVehicle(match.id, fleetVehicles);
      }
    }
  };

  // Handle Vehicle Selection from Registry
  const handleSelectVehicle = (vehicleId: string, vehiclesList = fleetVehicles) => {
    setSelectedVehicleId(vehicleId);
    if (!vehicleId) return;

    const v = vehiclesList.find((item: any) => item.id === vehicleId);
    if (v) {
      setVehicleMake(v.make || '');
      setVehicleModel(v.model || '');
      setVehicleYear(v.year ? String(v.year) : '');
      setLicensePlate(v.licensePlate || '');
      setUnitNumber(v.unitNumber || '');
      if (v.tireSize) setTireSize(v.tireSize);
    }
  };

  const resetForm = () => {
    setSelectedFleetId('');
    setSelectedFleetDriverId('');
    setSelectedVehicleId('');
    setIsManualVehicle(false);
    setVehicleMake('');
    setVehicleModel('');
    setVehicleYear('');
    setTireSize('11R22.5');
    setLicensePlate('');
    setUnitNumber('');
    setDriverName('');
    setDriverPhone('');
    setServiceAddress('');
    setServiceCoords({ latitude: null, longitude: null });
    setServiceItems([
      {
        serviceId: 'TIRE_SWAP_OFF_RIM',
        serviceName: 'Tire Swap (OFF RIM)',
        category: 'TIRE_SERVICE',
        unitPriceCents: 16000,
        quantity: 1,
      },
    ]);
    setArrivalWindow({ mode: 'ETA', estimatedArrivalMinutes: 30 });
    setUrgency('URGENT');
    setAssignedDriverId('');
    setNotes('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedFleetId) {
      toast.error('Please select a commercial fleet account');
      return;
    }
    if (!serviceAddress) {
      toast.error('Breakdown service address is required');
      return;
    }
    if (!driverName || !driverPhone) {
      toast.error('Fleet driver / operator name and contact phone are required');
      return;
    }

    const phoneValidation = validateAndNormalizePhone(driverPhone, formCountry);
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.error || 'Please enter a valid driver phone number');
      return;
    }

    if (serviceItems.length === 0) {
      toast.error('Please add at least one commercial service item');
      return;
    }

    const subtotalCents = serviceItems.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0
    );
    const taxCents = isTaxIncluded ? 0 : Math.round(subtotalCents * taxRate);
    const totalCents = subtotalCents + taxCents;

    try {
      await createJobMutation.mutateAsync({
        countryCode: formCountry,
        fleetId: selectedFleetId,
        recipientName: driverName,
        recipientPhone: phoneValidation.normalized,
        serviceAddress,
        serviceLatitude: serviceCoords.latitude,
        serviceLongitude: serviceCoords.longitude,
        vehicleId: isManualVehicle ? undefined : selectedVehicleId || undefined,
        urgency,
        paymentMethod: 'INVOICE_NET30',
        source: 'FLEET_PORTAL',
        driverId: assignedDriverId || undefined,
        notes: `Unit: ${unitNumber || 'N/A'}${notes ? ` | ${notes}` : ''}`,
        problemNotes: notes || undefined,
        arrivalWindowStart: arrivalWindow.arrivalWindowStart,
        arrivalWindowEnd: arrivalWindow.arrivalWindowEnd,
        estimatedArrivalMinutes: arrivalWindow.estimatedArrivalMinutes,
        appointmentDate: arrivalWindow.appointmentDate,
        serviceItems: serviceItems.map((item) => ({
          serviceName: item.serviceName,
          category: item.category,
          unitPriceCents: item.unitPriceCents,
          quantity: item.quantity,
        })),
        subtotalCents,
        taxCents,
        totalCents,
        vehicle: {
          make: vehicleMake || 'Commercial',
          model: vehicleModel || 'Unit',
          year: vehicleYear ? parseInt(vehicleYear, 10) : new Date().getFullYear(),
          tireSize,
          licensePlate: licensePlate || undefined,
          unitNumber: unitNumber || undefined,
        },
      });

      toast.success('Commercial Fleet Job ticket created & dispatched successfully');
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create fleet ticket');
    }
  };

  // Keyboard navigation & Alt+Enter submit shortcut
  useKeyboardShortcuts({
    'Alt+Enter': () => {
      if (isOpen) handleSubmit();
    },
    'Alt+ArrowDown': () => {
      if (!isOpen) return;
      const inputs = formRef.current?.querySelectorAll<HTMLElement>('input, select, textarea, button[type="button"]');
      if (!inputs) return;
      const active = document.activeElement;
      const arr = Array.from(inputs);
      const idx = arr.indexOf(active as HTMLElement);
      if (idx >= 0 && idx < arr.length - 1) {
        arr[idx + 1].focus();
      }
    },
    'Alt+ArrowUp': () => {
      if (!isOpen) return;
      const inputs = formRef.current?.querySelectorAll<HTMLElement>('input, select, textarea, button[type="button"]');
      if (!inputs) return;
      const active = document.activeElement;
      const arr = Array.from(inputs);
      const idx = arr.indexOf(active as HTMLElement);
      if (idx > 0) {
        arr[idx - 1].focus();
      }
    },
  });

  const subtotalCents = serviceItems.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0
  );
  const taxCents = isTaxIncluded ? 0 : Math.round(subtotalCents * taxRate);
  const totalCents = subtotalCents + taxCents;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Create Commercial Fleet Job Ticket"
      maxWidth="max-w-2xl"
    >
      <form 
        ref={formRef} 
        onSubmit={handleSubmit} 
        className="space-y-5 max-h-[80vh] overflow-y-auto px-1 pr-2"
      >
        {/* Step 1: Regional Silo Country Selector */}
        <CountrySiloSelector
          country={formCountry}
          onChange={(c) => {
            setFormCountry(c);
            setSelectedFleetId('');
            setSelectedFleetDriverId('');
          }}
          stepNumber={1}
          subtitle="Cross-Border Fleet Dispatch"
        />

        {/* Step 2: Contracted Commercial Fleet Account */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 text-[10px] font-mono flex items-center justify-center font-bold">2</span>
              <Building2 className="w-3.5 h-3.5 text-red-600" />
              <span>Select Contracted Fleet Account <span className="text-red-500">*</span></span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">{fleets.length} Accounts in {formCountry}</span>
          </label>
          <select
            value={selectedFleetId}
            onChange={(e) => handleSelectFleet(e.target.value)}
            required
            autoFocus
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          >
            <option value="">-- Choose Contracted Fleet Account --</option>
            {fleets.map((f: any) => (
              <option key={f.id} value={f.id}>
                {f.name} {f.fleetCode ? `(${f.fleetCode})` : ''} • {f.vehicles?.length || 0} Units • {f.drivers?.length || 0} Drivers
              </option>
            ))}
          </select>

          {selectedFleet && (
            <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-slate-500">Billing: </span>
                <span className="font-bold text-slate-900">{selectedFleet.paymentTerms || 'NET 30 Invoicing'}</span>
              </div>
              <div>
                <span className="text-slate-500">Hotline: </span>
                <span className="font-mono font-bold text-slate-900">{(selectedFleet as any).companyPhone || selectedFleet.phone || 'On file'}</span>
              </div>
              <div>
                <span className="text-slate-500">Contact: </span>
                <span className="font-bold text-slate-900">{selectedFleet.contactPerson || 'Fleet Dispatcher'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Registered Fleet Driver Dropdown */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">3</span>
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Registered Fleet Driver (Auto-Fill)</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {registeredFleetDrivers.length} Registered Drivers
            </span>
          </label>
          <select
            value={selectedFleetDriverId}
            onChange={(e) => handleSelectFleetDriver(e.target.value)}
            disabled={!selectedFleetId}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">
              {!selectedFleetId 
                ? '-- Select a Fleet Account First --' 
                : registeredFleetDrivers.length === 0 
                  ? '-- No registered drivers found (Enter below) --' 
                  : '-- Choose Registered Driver or Enter Manually Below --'}
            </option>
            {registeredFleetDrivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} ({d.phone}) {d.licenseNumber ? `• Lic: ${d.licenseNumber}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Step 4: Driver / Operator Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 text-[10px] font-mono flex items-center justify-center font-bold">4</span>
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Driver / Operator Name <span className="text-red-500">*</span></span>
          </label>
          <input
            type="text"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            placeholder="e.g. Mike Vance"
            required
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          />
        </div>

        {/* Step 5: Driver / Operator Phone */}
        <PhoneInputField
          value={driverPhone}
          onChange={setDriverPhone}
          countryCode={formCountry}
          label="Driver On-Scene Phone"
          stepNumber={5}
          required
        />

        {/* Step 6: Commercial Vehicle Unit / Plate */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">6</span>
              <Truck className="w-3.5 h-3.5 text-slate-400" />
              <span>Commercial Vehicle Unit</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={isManualVehicle}
                onChange={(e) => {
                  setIsManualVehicle(e.target.checked);
                  if (e.target.checked) setSelectedVehicleId('');
                }}
                className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500 border-slate-300"
              />
              <span>Unlisted / Rental Unit</span>
            </label>
          </div>

          {!isManualVehicle ? (
            <select
              value={selectedVehicleId}
              onChange={(e) => handleSelectVehicle(e.target.value)}
              disabled={!selectedFleetId}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs disabled:bg-slate-100"
            >
              <option value="">-- Choose Unit from Fleet Registry --</option>
              {fleetVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.unitNumber ? `Unit #${v.unitNumber} • ` : ''}{v.year} {v.make} {v.model} • Plate: {v.licensePlate || 'N/A'} • {v.tireSize || '11R22.5'}
                </option>
              ))}
            </select>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="Unit # (e.g. TRK-402)"
                className="px-4 py-2 text-xs rounded-xl border border-slate-200 text-slate-900"
              />
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="Plate (e.g. 9812-FL)"
                className="px-4 py-2 text-xs rounded-xl border border-slate-200 font-mono uppercase text-slate-900"
              />
            </div>
          )}
        </div>

        {/* Step 7: Tire Specification */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">7</span>
              <Wrench className="w-3.5 h-3.5 text-slate-400" />
              <span>Commercial Tire Size / Specs</span>
            </label>
            <div className="flex items-center gap-1">
              {COMMON_COMMERCIAL_TIRE_SIZES.map((sz) => (
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
          <input
            type="text"
            value={tireSize}
            onChange={(e) => setTireSize(e.target.value)}
            placeholder="e.g. 11R22.5 or 295/75R22.5"
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          />
        </div>

        {/* Step 8: Breakdown Service Address */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 text-[10px] font-mono flex items-center justify-center font-bold">8</span>
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              <span>Breakdown Location / Yard Address <span className="text-red-500">*</span></span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Mapbox Places ({formCountry})</span>
          </label>
          <AddressAutocompleteInput
            value={serviceAddress}
            onChange={setServiceAddress}
            onSelectLocation={(loc: GeocodeLocation) => {
              setServiceAddress(loc.address);
              setServiceCoords({ latitude: loc.latitude, longitude: loc.longitude });
            }}
            countryCode={formCountry}
            placeholder={`Enter yard, dock, highway mile marker in ${formCountry}...`}
            className="w-full"
            required
          />
          {serviceCoords.latitude && serviceCoords.longitude && (
            <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-emerald-700">
              <Navigation className="w-3 h-3 text-emerald-600" />
              <span>GPS Coordinates locked: {serviceCoords.latitude.toFixed(4)}, {serviceCoords.longitude.toFixed(4)}</span>
            </div>
          )}
        </div>

        {/* Step 9: Commercial Work Order Services */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">9</span>
            <Wrench className="w-3.5 h-3.5 text-red-600" />
            <span>Commercial Services & Fleet Work Order</span>
          </label>
          <MultiServiceSelector
            countryCode={formCountry}
            currencySymbol={currencySymbol}
            taxRate={taxRate}
            selectedItems={serviceItems}
            onChange={setServiceItems}
            isTaxIncluded={isTaxIncluded}
            onToggleTaxIncluded={setIsTaxIncluded}
          />
        </div>

        {/* Step 10: Arrival Timing & Service Window ("Between Time") */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">10</span>
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Arrival Timing & Service Window ("Between Time")</span>
            </span>
            <span className="text-[11px] font-mono text-blue-600 font-bold">{arrivalWindow.displayLabel || 'Default ~30m'}</span>
          </label>
          <ArrivalWindowSelector
            value={arrivalWindow}
            onChange={(data) => {
              setArrivalWindow(data);
              if (data.mode === 'ETA') {
                setUrgency('URGENT');
              } else if (data.mode === 'WINDOW' && urgency === 'URGENT') {
                const isFutureDate = data.appointmentDate && new Date(data.appointmentDate).toDateString() !== new Date().toDateString();
                setUrgency(isFutureDate ? 'FUTURE' : 'STANDARD');
              }
            }}
          />
        </div>

        {/* Step 11: Dispatch Urgency Priority */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">11</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Fleet Urgency Level</span>
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
              { id: 'URGENT', label: 'Urgent / Breakdown', desc: 'Highway dead stop', color: 'border-red-500 text-red-700 bg-red-50' },
              { id: 'STANDARD', label: 'Standard Yard Service', desc: 'Scheduled maintenance', color: 'border-blue-500 text-blue-700 bg-blue-50' },
              { id: 'FUTURE', label: 'Future Appointment', desc: 'Booked service', color: 'border-purple-500 text-purple-700 bg-purple-50' },
            ].map((u) => {
              const isUrgentEta = arrivalWindow.mode !== 'WINDOW';
              const isDisabled = isUrgentEta && u.id !== 'URGENT';
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && setUrgency(u.id as any)}
                  title={isDisabled ? 'Quick ETA enforces URGENT priority. Switch to Between Time above for Standard or Future.' : undefined}
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
          {arrivalWindow.mode !== 'WINDOW' && (
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <span>Quick ETA is active. For Standard or Future scheduling, switch to</span>
              <span className="font-semibold text-blue-600">Between Time (Arrival Window)</span>
              <span>above.</span>
            </p>
          )}
        </div>

        {/* Step 12: Assign Roadside Technician Directly (Optional) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">12</span>
              <Navigation className="w-3.5 h-3.5 text-slate-400" />
              <span>Direct Roadside Technician Assignment (Optional)</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">{drivers.length} technicians online in {formCountry}</span>
          </label>
          <select
            value={assignedDriverId}
            onChange={(e) => setAssignedDriverId(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          >
            <option value="">-- Leave Unassigned (Dispatch Queue Pool) --</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} ({d.phone || 'No phone'}) • {d.assignedVehicle || 'Service Truck'}
              </option>
            ))}
          </select>
        </div>

        {/* Step 13: Dispatch & PO Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">13</span>
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>PO Number & Yard Instructions</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. PO #99482. Driver will be in tractor unit at loading dock 14. Gate code 4492."
            rows={2}
            className="w-full px-4 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          />
        </div>

        {/* Total Price Summary & Submit Bar */}
        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-slate-500">Commercial Work Order Total:</div>
            <div className="text-lg font-black text-slate-900 font-mono">
              {currencySymbol}{(totalCents / 100).toFixed(2)}{' '}
              <span className="text-xs font-medium text-slate-500">
                ({formCountry} {currencySymbol}{(subtotalCents / 100).toFixed(2)} + tax)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={createJobMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{createJobMutation.isPending ? 'Creating Ticket...' : 'Create Commercial Fleet Ticket'}</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 rounded text-slate-300">
                Alt+Enter
              </kbd>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
