import React, { useState, useRef, useEffect } from 'react';
import { 
  Phone, 
  User, 
  Mail, 
  MapPin, 
  Car, 
  Wrench, 
  Clock, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  Navigation,
  Globe,
  Hash
} from 'lucide-react';
import Modal from '../../ui/Modal';
import AddressAutocompleteInput, { type GeocodeLocation } from '../../common/AddressAutocompleteInput';
import MultiServiceSelector, { type SelectedServiceItem } from '../../common/MultiServiceSelector';
import { ArrivalWindowSelector, type ArrivalWindowData } from '../../common/ArrivalWindowSelector';
import { useTenant } from '../../../context/TenantContext';
import { useCreateJob } from '../../../hooks/useJobs';
import { userService, type UserItem } from '../../../services/userService';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CreateRoadsideJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillPhone?: string;
}

const COMMON_TIRE_SIZES = ['225/65R17', '275/65R18', '265/70R17', '11R22.5', '295/75R22.5'];

export default function CreateRoadsideJobModal({ isOpen, onClose, prefillPhone = '' }: CreateRoadsideJobModalProps) {
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

  // 2. Customer Info
  const [customerPhone, setCustomerPhone] = useState(prefillPhone);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [makeUserAccount, setMakeUserAccount] = useState(true);

  // 3. Address & Geocoding
  const [serviceAddress, setServiceAddress] = useState('');
  const [serviceCoords, setServiceCoords] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });

  // 4. Vehicle Specs
  const [vehicleMakeModel, setVehicleMakeModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [tireSize, setTireSize] = useState('225/65R17');

  // 5. Work Order Services
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

  // 6. Arrival Window & Urgency
  const [arrivalWindow, setArrivalWindow] = useState<ArrivalWindowData>({});
  const [urgency, setUrgency] = useState<'URGENT' | 'STANDARD' | 'FUTURE'>('STANDARD');

  // 7. Direct Driver Assignment & Notes
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('POS');
  const [notes, setNotes] = useState('');

  // Fetch regional drivers for selected formCountry
  const { data: drivers = [] } = useQuery<UserItem[]>({
    queryKey: ['drivers', formCountry],
    queryFn: () => userService.getDrivers(formCountry),
    enabled: isOpen,
  });

  const resetForm = () => {
    setCustomerPhone('');
    setCustomerName('');
    setCustomerEmail('');
    setMakeUserAccount(true);
    setServiceAddress('');
    setServiceCoords({ latitude: null, longitude: null });
    setVehicleMakeModel('');
    setVehicleYear('');
    setLicensePlate('');
    setTireSize('225/65R17');
    setServiceItems([
      {
        serviceId: 'TIRE_REPAIR',
        serviceName: 'Tire Repair (Plug)',
        category: 'TIRE_SERVICE',
        unitPriceCents: 12000,
        quantity: 1,
      },
    ]);
    setArrivalWindow({});
    setUrgency('STANDARD');
    setAssignedDriverId('');
    setPaymentMethod('POS');
    setNotes('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!customerPhone || !serviceAddress) {
      toast.error('Customer phone and breakdown address are required');
      return;
    }
    if (serviceItems.length === 0) {
      toast.error('Please add at least one service item');
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
        customerName: customerName || 'Valued Customer',
        customerPhone,
        recipientName: customerName || 'Valued Customer',
        recipientPhone: customerPhone,
        customerEmail: customerEmail || undefined,
        serviceAddress,
        serviceLatitude: serviceCoords.latitude,
        serviceLongitude: serviceCoords.longitude,
        urgency,
        paymentMethod,
        driverId: assignedDriverId || undefined,
        notes,
        problemNotes: notes || undefined,
        makeUserAccount,
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
          makeModel: vehicleMakeModel || 'Customer Vehicle',
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
      title="Create Roadside Job Ticket"
      maxWidth="max-w-2xl"
    >
      <form 
        ref={formRef} 
        onSubmit={handleSubmit} 
        className="space-y-5 max-h-[80vh] overflow-y-auto px-1 pr-2"
      >
        {/* Step 1: Regional Silo Country Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] font-mono flex items-center justify-center font-bold">1</span>
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>Operating Country / Currency Silo</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">Cross-Border Intake</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { code: 'CA', label: '🇨🇦 Canada (CAD)' },
              { code: 'US', label: '🇺🇸 United States (USD)' },
              { code: 'UK', label: '🇬🇧 United Kingdom (GBP)' },
            ].map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setFormCountry(c.code as any)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  formCountry === c.code
                    ? 'border-red-600 bg-red-50 text-red-700 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Customer Phone Number */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 text-[10px] font-mono flex items-center justify-center font-bold">2</span>
            <Phone className="w-3.5 h-3.5 text-red-600" />
            <span>Caller Phone Number <span className="text-red-500">*</span></span>
          </label>
          <input
            type="text"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="+1 (416) 555-0199"
            required
            autoFocus
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          />
        </div>

        {/* Step 3: Customer Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">3</span>
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Customer Name <span className="text-red-500">*</span></span>
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g. John Smith"
            required
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          />
        </div>

        {/* Step 4: Customer Email & Portal Access */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">4</span>
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>Customer Email (Optional)</span>
          </label>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="john@example.com"
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          />
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={makeUserAccount}
              onChange={(e) => setMakeUserAccount(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer"
            />
            <span>Auto-provision customer portal access & live SMS driver tracking</span>
          </label>
        </div>

        {/* Step 5: Breakdown Address & Mapbox Autocomplete */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 text-[10px] font-mono flex items-center justify-center font-bold">5</span>
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              <span>Breakdown Location / Service Address <span className="text-red-500">*</span></span>
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
            placeholder={`Enter street address, highway mile marker in ${formCountry}...`}
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

        {/* Step 6: Vehicle Make & Model */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">6</span>
            <Car className="w-3.5 h-3.5 text-slate-400" />
            <span>Vehicle Make & Model</span>
          </label>
          <input
            type="text"
            value={vehicleMakeModel}
            onChange={(e) => setVehicleMakeModel(e.target.value)}
            placeholder="e.g. 2022 Ford F-150 / Honda Civic"
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          />
        </div>

        {/* Step 7: Vehicle Year & License Plate */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">7</span>
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>Model Year</span>
            </label>
            <input
              type="number"
              value={vehicleYear}
              onChange={(e) => setVehicleYear(e.target.value)}
              placeholder="2023"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>License Plate</span>
            </label>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              placeholder="e.g. CZXP-921"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 font-mono font-bold uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Step 8: Tire Specification */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">8</span>
              <Wrench className="w-3.5 h-3.5 text-slate-400" />
              <span>Tire Size / Specification</span>
            </label>
            <div className="flex items-center gap-1">
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
          <input
            type="text"
            value={tireSize}
            onChange={(e) => setTireSize(e.target.value)}
            placeholder="e.g. 275/65R18 or 11R22.5"
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          />
        </div>

        {/* Step 9: Work Order Services & Pricing */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">9</span>
            <Wrench className="w-3.5 h-3.5 text-red-600" />
            <span>Roadside Services & Billable Work Order</span>
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

        {/* Step 10: Arrival Timing & Service Window (Between Time) */}
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
            onChange={setArrivalWindow}
          />
        </div>

        {/* Step 11: Urgency Level */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">11</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Dispatch Urgency Priority</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'URGENT', label: 'Urgent / Emergency', desc: 'Highway / hazard', color: 'border-red-500 text-red-700 bg-red-50' },
              { id: 'STANDARD', label: 'Standard Call', desc: 'Typical roadside', color: 'border-blue-500 text-blue-700 bg-blue-50' },
              { id: 'FUTURE', label: 'Scheduled Later', desc: 'Window booking', color: 'border-purple-500 text-purple-700 bg-purple-50' },
            ].map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setUrgency(u.id as any)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  urgency === u.id
                    ? `${u.color} font-bold shadow-2xs`
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold leading-tight">{u.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{u.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 12: Assign Driver Directly (Optional) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">12</span>
              <Navigation className="w-3.5 h-3.5 text-slate-400" />
              <span>Direct Roadside Technician Assignment (Optional)</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">{drivers.length} drivers online in {formCountry}</span>
          </label>
          <select
            value={assignedDriverId}
            onChange={(e) => setAssignedDriverId(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          >
            <option value="">-- Leave Unassigned (Dispatch Queue Pool) --</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} ({d.phone || 'No phone'}) • {d.assignedVehicle || 'Van'}
              </option>
            ))}
          </select>
        </div>

        {/* Step 13: Notes & Instructions */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">13</span>
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Internal Dispatch Notes & Scene Safety</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Flat on passenger front tire. Vehicle on shoulder with hazard lights on. Customer has lug nut key."
            rows={2}
            className="w-full px-4 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
          />
        </div>

        {/* Total Price Summary & Submit Bar */}
        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-slate-500">Estimated Total Quote:</div>
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
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{createJobMutation.isPending ? 'Creating Ticket...' : 'Create Roadside Job Ticket'}</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-red-800/60 rounded text-red-200">
                Alt+Enter
              </kbd>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
