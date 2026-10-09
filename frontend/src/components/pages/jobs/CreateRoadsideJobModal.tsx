import { useState } from 'react';
import { User, MapPin, Car, CheckCircle2, Navigation } from 'lucide-react';
import Modal from '../../ui/Modal';
import AddressAutocompleteInput, { type GeocodeLocation } from '../../common/AddressAutocompleteInput';
import MultiServiceSelector, { type SelectedServiceItem } from '../../common/MultiServiceSelector';
import { useTenant } from '../../../context/TenantContext';
import { useCreateJob } from '../../../hooks/useJobs';
import { userService, type UserItem } from '../../../services/userService';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CreateRoadsideJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillPhone?: string;
}

const COMMON_TIRE_SIZES = ['275/65R18', '225/65R17', '265/70R17', '11R22.5', '295/75R22.5'];

export default function CreateRoadsideJobModal({ isOpen, onClose, prefillPhone = '' }: CreateRoadsideJobModalProps) {
  const { country, currencySymbol, taxRate } = useTenant();
  const createJobMutation = useCreateJob();

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState(prefillPhone);
  const [customerEmail, setCustomerEmail] = useState('');
  const [makeUserAccount, setMakeUserAccount] = useState(true);

  // Address & Geocoding
  const [serviceAddress, setServiceAddress] = useState('');
  const [serviceCoords, setServiceCoords] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });

  // Vehicle Specs
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [tireSize, setTireSize] = useState('225/65R17');
  const [licensePlate, setLicensePlate] = useState('');

  // Work Order Services
  const [serviceItems, setServiceItems] = useState<SelectedServiceItem[]>([
    {
      serviceId: 'TIRE_REPAIR',
      serviceName: 'Tire Repair (Plug)',
      category: 'TIRE_SERVICE',
      unitPriceCents: 12000,
      quantity: 1,
    },
  ]);
  const [isTaxIncluded, setIsTaxIncluded] = useState(false);
  const [urgency, setUrgency] = useState<'URGENT' | 'STANDARD' | 'FUTURE'>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState('POS');
  const [notes, setNotes] = useState('');

  // Optional direct driver assignment
  const [assignedDriverId, setAssignedDriverId] = useState('');

  // Fetch available regional drivers
  const { data: drivers = [] } = useQuery<UserItem[]>({
    queryKey: ['drivers', country],
    queryFn: () => userService.getDrivers(country),
    enabled: isOpen,
  });

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setMakeUserAccount(true);
    setServiceAddress('');
    setServiceCoords({ latitude: null, longitude: null });
    setVehicleMake('');
    setVehicleModel('');
    setVehicleYear('');
    setTireSize('225/65R17');
    setLicensePlate('');
    setAssignedDriverId('');
    setNotes('');
    setPaymentMethod('POS');
    setUrgency('STANDARD');
    setServiceItems([
      {
        serviceId: 'TIRE_REPAIR',
        serviceName: 'Tire Repair (Plug)',
        category: 'TIRE_SERVICE',
        unitPriceCents: 12000,
        quantity: 1,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerPhone || !serviceAddress) {
      toast.error('Customer phone and breakdown address are required');
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

      const fullVehicleMakeModel = `${vehicleYear || '2022'} ${vehicleMake || 'Standard'} ${vehicleModel || 'Vehicle'}`.trim();

      await createJobMutation.mutateAsync({
        customer: {
          name: customerName || 'Valued Customer',
          phone: customerPhone,
          email: customerEmail || undefined,
        },
        recipientName: customerName || 'Valued Customer',
        recipientPhone: customerPhone,
        serviceAddress,
        serviceLatitude: serviceCoords.latitude ?? undefined,
        serviceLongitude: serviceCoords.longitude ?? undefined,
        urgency,
        countryCode: country,
        source: 'DIRECT_CALL',
        paymentMethod,
        problemNotes: notes || undefined,
        driverId: assignedDriverId || undefined,
        makeUserAccount,
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
          make: vehicleMake || 'Standard',
          model: vehicleModel || 'Vehicle',
          year: vehicleYear ? parseInt(vehicleYear, 10) : new Date().getFullYear(),
          tireSize,
          licensePlate: licensePlate || undefined,
        },
      });

      toast.success('Roadside Job ticket created & dispatched successfully');
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create job ticket');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Create Roadside Job Ticket"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header Silo Info Banner */}
        <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center font-black text-sm">
              XR
            </div>
            <div>
              <span className="text-xs font-bold block">Retail Roadside Dispatch</span>
              <span className="text-[10px] text-slate-400 font-mono">B2C On-Demand Intake</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-bold font-mono">
            {country} SILO
          </span>
        </div>

        {/* Section 1: Customer Info */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
            <User className="w-3.5 h-3.5 text-red-600" />
            <span>Customer Intake</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+1 (416) 555-0199"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="John Smith"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email (Optional)</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={makeUserAccount}
              onChange={(e) => setMakeUserAccount(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer"
            />
            <span>Auto-provision customer portal access & live SMS driver tracking</span>
          </label>
        </div>

        {/* Section 2: Breakdown Address */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
          <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5 text-red-600" />
            <span>Breakdown Location / Address <span className="text-red-500">*</span></span>
          </label>
          <AddressAutocompleteInput
            value={serviceAddress}
            onChange={setServiceAddress}
            onSelectLocation={(loc: GeocodeLocation) => {
              setServiceCoords({ latitude: loc.latitude, longitude: loc.longitude });
            }}
            countryCode={country}
            placeholder="Type street, intersection, or highway shoulder (e.g. 857 Winterton Way, Mississauga)..."
            required
          />
        </div>

        {/* Section 3: Vehicle Specs */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
            <Car className="w-3.5 h-3.5 text-red-600" />
            <span>Vehicle & Tire Specs</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Make</label>
              <input
                type="text"
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                placeholder="Ford"
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Model</label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="F-150"
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Year</label>
              <input
                type="text"
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value)}
                placeholder="2022"
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Plate</label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="CFMR 482"
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tire Size *</label>
              <input
                type="text"
                value={tireSize}
                onChange={(e) => setTireSize(e.target.value)}
                placeholder="275/65R18"
                required
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-mono font-bold text-red-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="text-[10px] font-medium text-slate-400">Quick Tire:</span>
            {COMMON_TIRE_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setTireSize(size)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                  tireSize === size
                    ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Section 4: Work Order Services */}
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

        {/* Section 5: Dispatch & Assignment Controls */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dispatch Urgency</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold"
              >
                <option value="URGENT">URGENT (Roadside Emergency)</option>
                <option value="STANDARD">STANDARD Dispatch</option>
                <option value="FUTURE">FUTURE Appointment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold"
              >
                <option value="POS">POS / Debit Card Machine</option>
                <option value="CASH">Cash on Site</option>
                <option value="E_TRANSFER">E-Transfer (Interac)</option>
                <option value="MOTO">Credit Card by Phone (MOTO)</option>
                <option value="STRIPE">Stripe Link</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Navigation className="w-3 h-3 text-red-600" />
                <span>Direct Assign Technician</span>
              </label>
              <select
                value={assignedDriverId}
                onChange={(e) => setAssignedDriverId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="">-- Leave Unassigned (Dispatch Queue) --</option>
                {drivers.map((drv) => (
                  <option key={drv.id} value={drv.id}>
                    {drv.fullName} ({drv.address || 'Regional Depot'})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Special Dispatch Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Flat tire on highway shoulder, driver in safe zone"
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
            disabled={createJobMutation.isPending || serviceItems.length === 0}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 size={14} />
            <span>{createJobMutation.isPending ? 'Creating Ticket...' : 'Create & Dispatch Roadside Ticket'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
