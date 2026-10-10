import { useState, useEffect } from 'react';
import { Truck, Car, Users, CheckCircle2 } from 'lucide-react';
import Modal from '../ui/Modal';
import FleetInfoSection, { type FleetFormData } from '../fleets/FleetInfoSection';
import FleetVehiclesSection, { type FleetVehicleItem } from '../fleets/FleetVehiclesSection';
import FleetDriversSection, { type FleetDriverItem } from '../fleets/FleetDriversSection';

interface ConvertFleetModalProps {
  lead: any | null;
  isOpen: boolean;
  onClose: () => void;
  onConvert: (params: {
    id: string;
    customFleetCode?: string;
    discountPercent?: number;
    extraData?: any;
  }) => void;
  isPending: boolean;
}

type TabType = 'details' | 'vehicles' | 'drivers';

export default function ConvertFleetModal({
  lead,
  isOpen,
  onClose,
  onConvert,
  isPending,
}: ConvertFleetModalProps) {
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
  });

  const [vehicles, setVehicles] = useState<FleetVehicleItem[]>([]);
  const [drivers, setDrivers] = useState<FleetDriverItem[]>([]);

  useEffect(() => {
    if (lead) {
      setFormData({
        companyName: lead.companyName || '',
        contactPerson: lead.contactPerson || '',
        fleetManager: lead.fleetManager || '',
        ceoOwnerName: lead.ceoOwnerName || '',
        phone: lead.phone || '',
        altPhone: lead.altPhone || '',
        email: lead.email || '',
        poaEmail: lead.poaEmail || '',
        address: lead.address || '',
        website: lead.website || '',
        numberOfUnits: lead.numberOfUnits || '',
        customFleetCode: `XMT-${Math.floor(1000 + Math.random() * 9000)}`,
        discountPercent: 0,
      });
      setVehicles([]);
      setDrivers([]);
      setActiveTab('details');
    }
  }, [lead]);

  if (!lead) return null;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConvert({
      id: lead.id,
      customFleetCode: formData.customFleetCode || undefined,
      discountPercent: formData.discountPercent,
      extraData: {
        companyName: formData.companyName,
        contactPerson: formData.contactPerson,
        fleetManager: formData.fleetManager,
        ceoOwnerName: formData.ceoOwnerName,
        phone: formData.phone,
        altPhone: formData.altPhone,
        email: formData.email,
        poaEmail: formData.poaEmail,
        address: formData.address,
        website: formData.website,
        numberOfUnits: formData.numberOfUnits,
        vehicles,
        drivers,
      },
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Convert Lead to Contracted Fleet — ${formData.companyName || lead.companyName}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
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
            <Truck size={13} />
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
            <Car size={13} />
            <span>2. Enrolled Vehicles</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                vehicles.length > 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-700'
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
                drivers.length > 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {drivers.length}
            </span>
          </button>
        </div>

        {/* Tab Content Panes */}
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {activeTab === 'details' && (
            <FleetInfoSection formData={formData} onChange={handleFieldChange} />
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
            />
          )}
        </div>

        {/* Conversion Action Footer */}
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
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending || !formData.companyName.trim() || !formData.phone.trim()}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50 transition"
            >
              <CheckCircle2 size={14} />
              <span>{isPending ? 'Converting...' : 'Execute Fleet Conversion'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
