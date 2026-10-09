import { useState, useMemo } from 'react';
import { Building2, Truck, MapPin, CheckCircle2, Navigation } from 'lucide-react';
import Modal from '../../ui/Modal';
import AddressAutocompleteInput, { type GeocodeLocation } from '../../common/AddressAutocompleteInput';
import MultiServiceSelector, { type SelectedServiceItem } from '../../common/MultiServiceSelector';
import { useTenant } from '../../../context/TenantContext';
import { useCreateJob } from '../../../hooks/useJobs';
import { fleetService } from '../../../services/fleetService';
import { userService, type UserItem } from '../../../services/userService';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CreateFleetJobModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateFleetJobModal({ isOpen, onClose }: CreateFleetJobModalProps) {
  const { country, currencySymbol, taxRate } = useTenant();
  const createJobMutation = useCreateJob();

  // 1. Fetch Fleets
  const { data: fleetsResponse } = useQuery({
    queryKey: ['fleets', country],
    queryFn: () => fleetService.getFleets({ countryCode: country }),
    enabled: isOpen,
  });

  const fleets = fleetsResponse?.data || [];

  // 2. Fetch Available Regional Drivers
  const { data: drivers = [] } = useQuery<UserItem[]>({
    queryKey: ['drivers', country],
    queryFn: () => userService.getDrivers(country),
    enabled: isOpen,
  });

  // Form State
  const [selectedFleetId, setSelectedFleetId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isManualVehicle, setIsManualVehicle] = useState(false);

  // Vehicle Specs
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [tireSize, setTireSize] = useState('11R22.5');
  const [licensePlate, setLicensePlate] = useState('');
  const [unitNumber, setUnitNumber] = useState('');

  // Location & Driver Contact
  const [serviceAddress, setServiceAddress] = useState('');
  const [serviceCoords, setServiceCoords] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');

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
  const [urgency, setUrgency] = useState<'URGENT' | 'STANDARD' | 'FUTURE'>('URGENT');
  const [notes, setNotes] = useState('');
  const [assignedDriverId, setAssignedDriverId] = useState('');

  // Selected Fleet & Vehicles
  const selectedFleet = useMemo(() => {
    return fleets.find((f: any) => f.id === selectedFleetId);
  }, [fleets, selectedFleetId]);

  const fleetVehicles: any[] = useMemo(() => {
    return selectedFleet?.vehicles || [];
  }, [selectedFleet]);

  const handleSelectFleet = (fleetId: string) => {
    setSelectedFleetId(fleetId);
    setSelectedVehicleId('');
    setIsManualVehicle(false);
    setVehicleMake('');
    setVehicleModel('');
    setVehicleYear('');
    setLicensePlate('');
    setUnitNumber('');
    setTireSize('11R22.5');

    const f = fleets.find((item: any) => item.id === fleetId);
    if (f && Array.isArray(f.vehicles) && f.vehicles.length === 1) {
      handleSelectVehicle(f.vehicles[0].id, f.vehicles);
    }
  };

  const handleSelectVehicle = (vehId: string, customVehiclesList?: any[]) => {
    setSelectedVehicleId(vehId);
    setIsManualVehicle(false);

    const list = customVehiclesList || fleetVehicles;
    const veh = list.find((v: any) => v.id === vehId);
    if (veh) {
      setVehicleMake(veh.make || 'Commercial');
      setVehicleModel(veh.model || 'Semi-Truck');
      setVehicleYear(veh.year ? String(veh.year) : '2022');
      setLicensePlate(veh.licensePlate || '');
      setUnitNumber(veh.unitNumber || veh.licensePlate || '');
      setTireSize(veh.tireSize || '11R22.5');
    }
  };

  const resetForm = () => {
    setSelectedFleetId('');
    setSelectedVehicleId('');
    setIsManualVehicle(false);
    setVehicleMake('');
    setVehicleModel('');
    setVehicleYear('');
    setLicensePlate('');
    setUnitNumber('');
    setTireSize('11R22.5');
    setServiceAddress('');
    setServiceCoords({ latitude: null, longitude: null });
    setDriverName('');
    setDriverPhone('');
    setAssignedDriverId('');
    setNotes('');
    setServiceItems([
      {
        serviceId: 'TIRE_SWAP_OFF_RIM',
        serviceName: 'Tire Swap (OFF RIM)',
        category: 'TIRE_SERVICE',
        unitPriceCents: 16000,
        quantity: 1,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFleetId) {
      toast.error('Please select a commercial fleet');
      return;
    }
    if (!driverPhone || !serviceAddress) {
      toast.error('Driver phone and breakdown address are required');
      return;
    }
    if (serviceItems.length === 0) {
      toast.error('Please add at least one service item');
      return;
    }

    try {
      const subtotalCents = serviceItems.reduce(
        (sum, item) => sum + item.unitPriceCents * item.quantity,
        0
      );
      const taxCents = isTaxIncluded ? 0 : Math.round(subtotalCents * taxRate);
      const totalCents = isTaxIncluded ? subtotalCents : subtotalCents + taxCents;

      const fullVehicleMakeModel = unitNumber 
        ? `Unit ${unitNumber} - ${vehicleYear || '2022'} ${vehicleMake || 'Commercial'} ${vehicleModel || 'Truck'}`.trim()
        : `${vehicleYear || '2022'} ${vehicleMake || 'Commercial'} ${vehicleModel || 'Truck'}`.trim();

      await createJobMutation.mutateAsync({
        fleetId: selectedFleetId,
        vehicleId: selectedVehicleId || undefined,
        customerName: selectedFleet?.name || 'Commercial Fleet',
        customerPhone: driverPhone,
        recipientName: driverName || selectedFleet?.name || 'Fleet Operator',
        recipientPhone: driverPhone,
        serviceAddress,
        serviceLatitude: serviceCoords.latitude ?? undefined,
        serviceLongitude: serviceCoords.longitude ?? undefined,
        urgency,
        countryCode: country,
        source: 'FLEET_PORTAL',
        paymentMethod: 'INVOICE_NET30',
        problemNotes: notes || undefined,
        driverId: assignedDriverId || undefined,
        serviceItems: serviceItems.map((s) => ({
          serviceName: s.serviceName,
          category: s.category,
          unitPriceCents: s.unitPriceCents,
          quantity: s.quantity,
        })),
        subtotalCents,
        taxCents,
        totalCents,
        vehicleMakeModel: fullVehicleMakeModel,
        tireSize,
        vehicle: {
          make: vehicleMake || 'Commercial',
          model: vehicleModel || 'Truck',
          year: vehicleYear ? parseInt(vehicleYear, 10) : 2022,
          tireSize,
          licensePlate: licensePlate || undefined,
        },
      });

      toast.success('Commercial Fleet Job ticket dispatched successfully!');
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch fleet ticket');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Create Commercial Fleet Job Ticket"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header Silo Info Banner */}
        <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black text-sm">
              <Truck size={17} />
            </div>
            <div>
              <span className="text-xs font-bold block">Commercial Fleet Dispatch</span>
              <span className="text-[10px] text-slate-400 font-mono">Contracted B2B Account Intake</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold font-mono">
            {country} SILO
          </span>
        </div>

        {/* Section 1: Fleet Account & Vehicle Registry */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Contracted Fleet & Vehicle</span>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isManualVehicle}
                onChange={(e) => {
                  setIsManualVehicle(e.target.checked);
                  if (e.target.checked) setSelectedVehicleId('');
                }}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
              />
              <span>Unlisted Truck</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Fleet Account <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedFleetId}
                onChange={(e) => handleSelectFleet(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="">-- Choose Contracted Fleet --</option>
                {fleets.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.name} • {f.vehicles?.length || 0} Units
                  </option>
                ))}
              </select>
            </div>

            {!isManualVehicle ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registered Fleet Vehicle <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => handleSelectVehicle(e.target.value)}
                  disabled={!selectedFleetId}
                  required={!isManualVehicle}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium disabled:bg-slate-100"
                >
                  <option value="">
                    {!selectedFleetId ? '-- Select fleet first --' : '-- Choose Vehicle Unit --'}
                  </option>
                  {fleetVehicles.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      Unit {v.unitNumber || v.licensePlate || 'N/A'} • {v.year} {v.make} • {v.tireSize}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tire Size <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tireSize}
                  onChange={(e) => setTireSize(e.target.value)}
                  placeholder="e.g. 11R22.5"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold text-red-600"
                />
              </div>
            )}
          </div>

          {selectedVehicleId && !isManualVehicle && (
            <div className="grid grid-cols-4 gap-2 p-2.5 rounded-xl bg-white border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Unit</span>
                <span className="font-mono font-bold">{unitNumber || 'Standard'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Vehicle</span>
                <span className="font-bold truncate block">{vehicleYear} {vehicleMake}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Plate</span>
                <span className="font-mono font-bold">{licensePlate || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Tire</span>
                <span className="font-mono font-black text-red-600">{tireSize}</span>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Location & On-site Driver */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5 text-red-600" />
            <span>Breakdown Location & On-Site Driver</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Breakdown Location / Highway Address <span className="text-red-500">*</span>
              </label>
              <AddressAutocompleteInput
                value={serviceAddress}
                onChange={setServiceAddress}
                onSelectLocation={(loc: GeocodeLocation) => {
                  setServiceCoords({ latitude: loc.latitude, longitude: loc.longitude });
                }}
                countryCode={country}
                placeholder="Type breakdown address, milepost, or highway shoulder..."
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  On-site Driver Name
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Mike Ross"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Driver Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+1 (416) 555-0199"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Work Order Services */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <MultiServiceSelector
            items={serviceItems}
            onChange={setServiceItems}
            currencySymbol={currencySymbol}
            taxRate={taxRate}
            isTaxIncluded={isTaxIncluded}
            setIsTaxIncluded={setIsTaxIncluded}
          />
        </div>

        {/* Section 4: Dispatch & Technician Assignment */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Urgency</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold"
              >
                <option value="URGENT">URGENT (Highway Emergency)</option>
                <option value="STANDARD">STANDARD Dispatch</option>
                <option value="FUTURE">FUTURE Appointment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Billing Terms</label>
              <div className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700">
                INVOICE_NET30 (Fleet Terms)
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Navigation className="w-3 h-3 text-red-600" />
                <span>Assign Driver</span>
              </label>
              <select
                value={assignedDriverId}
                onChange={(e) => setAssignedDriverId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="">-- Leave Unassigned (Queue) --</option>
                {drivers.map((drv) => (
                  <option key={drv.id} value={drv.id}>
                    {drv.fullName} ({drv.address || 'Depot'})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Dispatch Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Trailer rear inner dual blowout. Parked safely on shoulder."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={createJobMutation.isPending || !selectedFleetId || serviceItems.length === 0}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 size={14} />
            <span>{createJobMutation.isPending ? 'Dispatching...' : 'Dispatch Fleet Ticket'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
