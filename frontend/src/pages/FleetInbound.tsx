import { useState, useMemo } from 'react';
import { 
  Building2, 
  Truck, 
  User, 
  MapPin, 
  Phone, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import AddressAutocompleteInput, { type GeocodeLocation } from '../components/common/AddressAutocompleteInput';
import MultiServiceSelector, { type SelectedServiceItem } from '../components/common/MultiServiceSelector';
import { useTenant } from '../context/TenantContext';
import { fleetService } from '../services/fleetService';
import { jobService } from '../services/jobService';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function FleetInbound() {
  const { country, currencySymbol, taxRate } = useTenant();

  // 1. Fetch Fleets for current region
  const { data: fleetsResponse } = useQuery({
    queryKey: ['fleets', country],
    queryFn: () => fleetService.getFleets({ countryCode: country }),
  });

  const fleets = fleetsResponse?.data || [];

  // Form State
  const [selectedFleetId, setSelectedFleetId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isManualVehicle, setIsManualVehicle] = useState(false);

  // Vehicle Specs (auto-filled or manual)
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Confirmation State
  const [lastCreatedJob, setLastCreatedJob] = useState<any | null>(null);

  // Selected Fleet Object
  const selectedFleet = useMemo(() => {
    return fleets.find((f: any) => f.id === selectedFleetId);
  }, [fleets, selectedFleetId]);

  // Vehicles for selected fleet
  const fleetVehicles: any[] = useMemo(() => {
    return selectedFleet?.vehicles || [];
  }, [selectedFleet]);

  // Handle Fleet Selection
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
      // Auto-select if only 1 vehicle in fleet
      handleSelectVehicle(f.vehicles[0].id, f.vehicles);
    }
  };

  // Handle Vehicle Selection
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

  const handleResetForm = () => {
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
    setLastCreatedJob(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFleetId) {
      toast.error('Please select a commercial fleet');
      return;
    }
    if (!driverPhone) {
      toast.error('Driver/Operator phone number is required');
      return;
    }
    if (!serviceAddress) {
      toast.error('Breakdown address is required');
      return;
    }
    if (serviceItems.length === 0) {
      toast.error('Please add at least one service item');
      return;
    }

    setIsSubmitting(true);
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

      const created = await jobService.createJob({
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

      toast.success(`Fleet Job #${created.jobCode || created.jobNumber || ''} dispatched successfully!`);
      setLastCreatedJob(created);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch fleet ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Commercial Fleet Intake"
        subtitle={`Rapid intake & breakdown dispatch for contracted B2B fleets (${country})`}
      />

      {/* Confirmation State if just booked */}
      {lastCreatedJob ? (
        <div className="bg-white border border-emerald-200 rounded-3xl p-8 shadow-sm text-center space-y-5 animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900">
              Commercial Fleet Ticket Dispatched!
            </h3>
            <p className="text-sm font-mono font-bold text-emerald-700">
              Job Code: #{lastCreatedJob.jobCode || lastCreatedJob.jobNumber || lastCreatedJob.id}
            </p>
            <p className="text-xs text-slate-500">
              Contracted Fleet: <strong>{selectedFleet?.name}</strong> • Status: PENDING DISPATCH
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <RotateCcw size={14} />
              <span>Book Another Fleet Ticket</span>
            </button>
            <Link
              to="/fleet-jobs"
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
            >
              <span>View in Fleet Jobs Board</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Fleet Account Selection */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-[11px] font-mono flex items-center justify-center font-bold">1</span>
                <Building2 className="w-4 h-4 text-red-600" />
                <span>Contracted Commercial Fleet</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {fleets.length} Active Accounts in {country}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Registered Fleet Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedFleetId}
                  onChange={(e) => handleSelectFleet(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer shadow-2xs"
                >
                  <option value="">-- Choose Contracted Fleet --</option>
                  {fleets.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.fleetCode ? `(${f.fleetCode})` : ''} • {f.vehicles?.length || 0} Registered Units
                    </option>
                  ))}
                </select>
              </div>

              {selectedFleet && (
                <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Billing Terms: </span>
                    <span className="font-bold text-slate-900">{selectedFleet.paymentTerms || 'NET 30 Invoicing'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Dispatch Hotline: </span>
                    <span className="font-mono font-bold text-slate-900">{(selectedFleet as any).companyPhone || selectedFleet.phone || 'On file'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Account Manager: </span>
                    <span className="font-bold text-slate-900">{selectedFleet.contactPerson || 'Fleet Dispatcher'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Vehicle Specs (Dropdown from Fleet) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-[11px] font-mono flex items-center justify-center font-bold">2</span>
                <Truck className="w-4 h-4 text-red-600" />
                <span>Commercial Vehicle & Tire Specs</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isManualVehicle}
                  onChange={(e) => {
                    setIsManualVehicle(e.target.checked);
                    if (e.target.checked) setSelectedVehicleId('');
                  }}
                  className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer"
                />
                <span>Unlisted / Rental Unit</span>
              </label>
            </div>

            {!isManualVehicle ? (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Select Unit from Fleet Registry <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => handleSelectVehicle(e.target.value)}
                  disabled={!selectedFleetId}
                  required={!isManualVehicle}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {!selectedFleetId 
                      ? '-- Select fleet first --' 
                      : fleetVehicles.length === 0 
                      ? '-- No vehicles registered (Check "Unlisted" box above) --'
                      : '-- Choose Fleet Vehicle --'}
                  </option>
                  {fleetVehicles.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      Unit {v.unitNumber || v.licensePlate || 'N/A'} • {v.year} {v.make} {v.model} • Tire: {v.tireSize || '11R22.5'} • Plate: {v.licensePlate || 'N/A'}
                    </option>
                  ))}
                </select>

                {selectedVehicleId && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Unit #</span>
                      <span className="font-mono font-bold text-slate-900">{unitNumber || 'Standard'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Vehicle</span>
                      <span className="font-bold text-slate-900">{vehicleYear} {vehicleMake} {vehicleModel}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">License Plate</span>
                      <span className="font-mono font-bold text-slate-900">{licensePlate || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Tire Spec</span>
                      <span className="font-mono font-black text-red-600">{tireSize}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit Number</label>
                  <input
                    type="text"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    placeholder="e.g. TRK-409"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Make / Model</label>
                  <input
                    type="text"
                    value={`${vehicleMake} ${vehicleModel}`.trim()}
                    onChange={(e) => {
                      setVehicleMake(e.target.value);
                      setVehicleModel('Truck');
                    }}
                    placeholder="e.g. 2023 Peterbilt 579"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">License Plate</label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="e.g. 982-XYZ"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tire Size <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={tireSize}
                    onChange={(e) => setTireSize(e.target.value)}
                    placeholder="e.g. 11R22.5"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold text-red-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Location & On-site Driver Contact */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-[11px] font-mono flex items-center justify-center font-bold">3</span>
                <MapPin className="w-4 h-4 text-red-600" />
                <span>Breakdown Location & Driver Contact</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Breakdown Location / Highway Address <span className="text-red-500">*</span>
                </label>
                <AddressAutocompleteInput
                  value={serviceAddress}
                  onChange={setServiceAddress}
                  onSelectLocation={(loc: GeocodeLocation) => {
                    setServiceCoords({ latitude: loc.latitude, longitude: loc.longitude });
                  }}
                  countryCode={country}
                  placeholder="Enter breakdown address, intersection, or highway milepost..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>On-site Driver Name</span>
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Robert Miller"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-red-600" />
                  <span>Driver Cell Phone Number <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+1 (416) 555-0199"
                  required
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Dispatch Urgency</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['URGENT', 'STANDARD', 'FUTURE'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setUrgency(level)}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        urgency === level
                          ? level === 'URGENT'
                            ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                            : 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Roadside Breakdown Details & Instructions</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Left rear trailer inner dual blown out. Truck stopped safely on shoulder near weigh station."
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Work Order Services & Billing */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-[11px] font-mono flex items-center justify-center font-bold">4</span>
                <span>Work Order Services & Account Billing</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                Contract Terms: NET 30 Invoice
              </span>
            </div>

            <MultiServiceSelector
              items={serviceItems}
              onChange={setServiceItems}
              currencySymbol={currencySymbol}
              taxRate={taxRate}
              isTaxIncluded={isTaxIncluded}
              setIsTaxIncluded={setIsTaxIncluded}
            />
          </div>

          {/* Section 5: Submit Action */}
          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !selectedFleetId || serviceItems.length === 0}
              className="px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-bold text-sm flex items-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'Dispatching Fleet Ticket...' : 'Dispatch Commercial Fleet Ticket'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
