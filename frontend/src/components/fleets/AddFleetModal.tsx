import { useState, useEffect } from 'react';
import { Truck, Users, CheckCircle2, Building2 } from 'lucide-react';
import Modal from '../ui/Modal';
import FleetInfoSection, { type FleetFormData } from './FleetInfoSection';
import FleetVehiclesSection, { type FleetVehicleItem } from './FleetVehiclesSection';
import FleetDriversSection, { type FleetDriverItem } from './FleetDriversSection';
import CountrySiloSelector, { type SupportedCountry } from '../common/CountrySiloSelector';
import { useCreateFleet } from '../../hooks/useFleets';
import { toast } from 'sonner';
import { validateAndNormalizePhone } from '../../utils/phone';
import { useTenant } from '../../context/TenantContext';

interface AddFleetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'details' | 'vehicles' | 'drivers';

export default function AddFleetModal({ isOpen, onClose }: AddFleetModalProps) {
  const { country: tenantCountry } = useTenant();
  const createFleetMutation = useCreateFleet();

  const [activeCountry, setActiveCountry] = useState<SupportedCountry>((tenantCountry as any) || 'CA');
  const [activeTab, setActiveTab] = useState<TabType>('details');

  const [formData, setFormData] = useState<FleetFormData>({
    companyName: '',
    contactPerson: '',
    fleetManager: '',
    ceoOwnerName: '',
    phone: '',
    altPhone: '',
    email: '',
    poaEmail: '',
    address: '',
    website: '',
    numberOfUnits: '',
    customFleetCode: '',
    discountPercent: 0,
    paymentTerms: 'NET_30',
    creditLimit: '5000',
  });

  const [vehicles, setVehicles] = useState<FleetVehicleItem[]>([]);
  const [drivers, setDrivers] = useState<FleetDriverItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setActiveCountry((tenantCountry as any) || 'CA');
      setFormData({
        companyName: '',
        contactPerson: '',
        fleetManager: '',
        ceoOwnerName: '',
        phone: '',
        altPhone: '',
        email: '',
        poaEmail: '',
        address: '',
        website: '',
        numberOfUnits: '',
        customFleetCode: `XMT-${Math.floor(1000 + Math.random() * 9000)}`,
        discountPercent: 0,
        paymentTerms: 'NET_30',
        creditLimit: '5000',
      });
      setVehicles([]);
      setDrivers([]);
      setActiveTab('details');
    }
  }, [isOpen, tenantCountry]);

  const handleFieldChange = (field: keyof FleetFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddVehicle = (vehicle: FleetVehicleItem) => {
    setVehicles((prev) => [...prev, vehicle]);
  };

  const handleRemoveVehicle = (index: number) => {
    setVehicles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddDriver = (driver: FleetDriverItem) => {
    setDrivers((prev) => [...prev, driver]);
  };

  const handleRemoveDriver = (index: number) => {
    setDrivers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCompanyName = formData.companyName.trim();
    if (!cleanCompanyName) {
      toast.error('Company name is required');
      setActiveTab('details');
      return;
    }

    let normalizedPhone: string | undefined = undefined;
    if (formData.phone.trim()) {
      const phoneValidation = validateAndNormalizePhone(formData.phone, activeCountry);
      if (!phoneValidation.isValid) {
        toast.error(phoneValidation.error || 'Please enter a valid primary fleet phone number');
        setActiveTab('details');
        return;
      }
      normalizedPhone = phoneValidation.normalized;
    }

    let normalizedAltPhone: string | undefined = undefined;
    if (formData.altPhone.trim()) {
      const altValidation = validateAndNormalizePhone(formData.altPhone, activeCountry);
      if (altValidation.isValid) {
        normalizedAltPhone = altValidation.normalized;
      }
    }

    try {
      await createFleetMutation.mutateAsync({
        fleetCode: formData.customFleetCode.trim() || undefined,
        name: cleanCompanyName,
        companyName: cleanCompanyName,
        contactPerson: formData.contactPerson.trim() || 'Fleet Manager',
        contactName: formData.contactPerson.trim() || 'Fleet Manager',
        fleetManager: formData.fleetManager.trim() || undefined,
        ceoOwnerName: formData.ceoOwnerName.trim() || undefined,
        phone: normalizedPhone,
        altPhone: normalizedAltPhone,
        email: formData.email.trim() || undefined,
        poaEmail: formData.poaEmail.trim() || undefined,
        address: formData.address.trim() || undefined,
        website: formData.website.trim() || undefined,
        numberOfUnits: formData.numberOfUnits ? Number(formData.numberOfUnits) : undefined,
        discountPercent: formData.discountPercent || 0,
        paymentTerms: formData.paymentTerms || 'NET_30',
        creditLimitCents: formData.creditLimit ? Number(formData.creditLimit) * 100 : undefined,
        countryCode: activeCountry,
        vehicles,
        drivers,
      });

      toast.success(`Commercial Fleet "${cleanCompanyName}" registered with ${vehicles.length} vehicles and ${drivers.length} drivers`);
      onClose();
    } catch (err: any) {
      const fieldErrors = err.response?.data?.errors;
      let errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to create fleet account';
      if (fieldErrors && typeof fieldErrors === 'object') {
        const details = Object.values(fieldErrors).flat().join(', ');
        if (details) errorMsg = details;
      }
      toast.error(errorMsg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Register Contracted Fleet Account — ${formData.companyName || 'New Account'}`}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Operating Silo / Country */}
        <CountrySiloSelector
          country={activeCountry}
          onChange={(c) => setActiveCountry(c)}
          stepNumber={1}
          label="Commercial Dispatch Silo"
          subtitle="Operating Jurisdiction"
        />

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'details'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 size={13} />
            <span>1. Fleet Profile & Terms</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vehicles')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'vehicles'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Truck size={13} />
            <span>2. Enrolled Vehicles</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                vehicles.length > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {vehicles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('drivers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'drivers'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users size={13} />
            <span>3. Fleet Drivers</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                drivers.length > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {drivers.length}
            </span>
          </button>
        </div>

        {/* Tab Panes */}
        <div className="max-h-[55vh] overflow-y-auto pr-1">
          {activeTab === 'details' && (
            <FleetInfoSection
              formData={formData}
              onChange={handleFieldChange}
              countryCode={activeCountry}
            />
          )}

          {activeTab === 'vehicles' && (
            <FleetVehiclesSection
              vehicles={vehicles}
              onAddVehicle={handleAddVehicle}
              onRemoveVehicle={handleRemoveVehicle}
            />
          )}

          {activeTab === 'drivers' && (
            <FleetDriversSection
              drivers={drivers}
              onAddDriver={handleAddDriver}
              onRemoveDriver={handleRemoveDriver}
              countryCode={activeCountry}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {formData.customFleetCode || 'XMT-????'}
            </span>
            <span>•</span>
            <span className="font-semibold text-slate-700">{vehicles.length} Vehicles</span>
            <span>•</span>
            <span className="font-semibold text-slate-700">{drivers.length} Drivers</span>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary px-3 py-1.5 text-xs">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createFleetMutation.isPending}
              className="btn-primary px-4 py-1.5 text-xs flex items-center gap-1.5"
            >
              <CheckCircle2 size={13} />
              <span>{createFleetMutation.isPending ? 'Registering...' : 'Save Fleet Account'}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
