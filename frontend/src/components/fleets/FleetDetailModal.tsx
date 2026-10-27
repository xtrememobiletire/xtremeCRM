import { useState, useEffect } from 'react';
import { Truck, Car, Users, Save, Copy, Check, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../ui/Modal';
import FleetInfoSection, { type FleetFormData } from './FleetInfoSection';
import FleetVehiclesSection, { type FleetVehicleItem } from './FleetVehiclesSection';
import FleetDriversSection, { type FleetDriverItem } from './FleetDriversSection';
import { fleetService } from '../../services/fleetService';
import { vehicleService } from '../../services/vehicleService';
import { useApproveFleet, useDeleteFleet } from '../../hooks/useFleets';
import { toast } from 'sonner';

interface FleetDetailModalProps {
  fleet: any | null;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'details' | 'vehicles' | 'drivers';

export default function FleetDetailModal({ fleet, isOpen, onClose }: FleetDetailModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('details');

  const approveMutation = useApproveFleet();
  const deleteMutation = useDeleteFleet();

  // Fetch full fleet details with populated vehicles and drivers
  const { data: fullFleet, refetch } = useQuery({
    queryKey: ['fleet-detail', fleet?.id],
    queryFn: () => fleetService.getFleetById(fleet.id),
    enabled: !!fleet?.id && isOpen,
  });

  const activeFleet = fullFleet || fleet;

  const [formData, setFormData] = useState<FleetFormData>({
    companyName: '',
    contactPerson: '',
    fleetManager: '',
    ceoOwnerName: '',
    phone: '',
    altPhone: '',
    email: '',
    password: '',
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
    if (activeFleet) {
      setFormData({
        companyName: activeFleet.companyName || activeFleet.name || '',
        contactPerson: activeFleet.contactPerson || activeFleet.contactName || '',
        fleetManager: activeFleet.fleetManager || '',
        ceoOwnerName: activeFleet.ceoOwnerName || '',
        phone: activeFleet.phone || '',
        altPhone: activeFleet.altPhone || '',
        email: activeFleet.email || '',
        password: '',
        poaEmail: activeFleet.poaEmail || '',
        address: activeFleet.address || '',
        website: activeFleet.website || '',
        numberOfUnits: activeFleet.numberOfUnits ?? '',
        customFleetCode: activeFleet.fleetCode || '',
        discountPercent: activeFleet.discountPercent || 0,
      });

      if (Array.isArray(activeFleet.vehicles)) {
        setVehicles(
          activeFleet.vehicles.map((v: any) => ({
            id: v.id,
            licensePlate: v.licensePlate,
            make: v.make,
            model: v.model,
            year: v.year,
            tireSize: v.tireSize,
            vin: v.vin,
          }))
        );
      }

      if (Array.isArray(activeFleet.drivers)) {
        setDrivers(
          activeFleet.drivers.map((d: any) => ({
            id: d.id,
            fullName: d.fullName,
            phone: d.phone,
            licensePlate: d.licensePlate,
          }))
        );
      }
    }
  }, [activeFleet]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => fleetService.updateFleet(activeFleet.id, payload),
    onSuccess: () => {
      toast.success('Fleet profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update fleet');
    },
  });

  const handleFieldChange = (field: keyof FleetFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddVehicle = async (vehicle: FleetVehicleItem) => {
    if (!activeFleet?.id) return;
    try {
      await vehicleService.createVehicle({
        ...vehicle,
        fleetId: activeFleet.id,
        countryCode: activeFleet.countryCode || 'CA',
      });
      toast.success(`Vehicle ${vehicle.licensePlate} added to fleet`);
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add vehicle');
    }
  };

  const handleRemoveVehicle = async (index: number) => {
    const v = vehicles[index] as any;
    if (v?.id) {
      try {
        await vehicleService.deleteVehicle(v.id);
        toast.success('Vehicle removed');
        refetch();
      } catch (err: any) {
        toast.error('Failed to remove vehicle');
      }
    } else {
      setVehicles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleAddDriver = async (driver: FleetDriverItem) => {
    if (!activeFleet?.id) return;
    try {
      await fleetService.addFleetDriver(activeFleet.id, driver);
      toast.success(`Driver ${driver.fullName} enrolled in fleet`);
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add driver');
    }
  };

  const handleRemoveDriver = (index: number) => {
    setDrivers((prev) => prev.filter((_, i) => i !== index));
  };

  const [copiedInvite, setCopiedInvite] = useState(false);

  const handleCopyInvite = () => {
    const credText = `🏢 Xtreme Mobile Tire — Fleet Manager Portal
🔗 Portal: ${window.location.origin}/login
📧 Login Email: ${formData.email || activeFleet?.email || '—'}
🔑 Password: ${activeFleet?.password || (formData.password ? formData.password : '(Managed via User Account)')}
🏷️ Fleet Code: ${formData.customFleetCode || activeFleet?.fleetCode || activeFleet?.id || '—'}`;

    navigator.clipboard.writeText(credText);
    setCopiedInvite(true);
    toast.success('Fleet manager portal credentials copied to clipboard');
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFleet?.id) return;

    updateMutation.mutate({
      name: formData.companyName,
      companyName: formData.companyName,
      contactPerson: formData.contactPerson,
      fleetManager: formData.fleetManager || undefined,
      ceoOwnerName: formData.ceoOwnerName || undefined,
      phone: formData.phone,
      altPhone: formData.altPhone || undefined,
      email: formData.email || undefined,
      password: formData.password?.trim() ? formData.password.trim() : undefined,
      poaEmail: formData.poaEmail || undefined,
      address: formData.address || undefined,
      website: formData.website || undefined,
      numberOfUnits: formData.numberOfUnits ? Number(formData.numberOfUnits) : undefined,
      discountPercent: formData.discountPercent,
    });
  };

  const handleApprove = () => {
    if (!activeFleet?.id) return;
    approveMutation.mutate(activeFleet.id, {
      onSuccess: () => {
        toast.success(`Fleet ${activeFleet.fleetCode || ''} approved successfully!`);
        queryClient.invalidateQueries({ queryKey: ['fleets'] });
        onClose();
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Failed to approve fleet');
      },
    });
  };

  const handleDelete = () => {
    if (!activeFleet?.id) return;
    if (window.confirm(`Are you sure you want to delete or reject registration for "${formData.companyName}"?`)) {
      deleteMutation.mutate(activeFleet.id, {
        onSuccess: () => {
          toast.success('Pending fleet registration deleted');
          queryClient.invalidateQueries({ queryKey: ['fleets'] });
          onClose();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to delete registration');
        },
      });
    }
  };

  if (!fleet) return null;

  const isPending = activeFleet?.status === 'PENDING';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Fleet Account Management — ${formData.companyName || fleet.companyName}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Pending Review Amber Alert Banner */}
        {isPending && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <div>
                <span className="font-bold">Pending Review &amp; Approval: </span>
                <span className="text-amber-800">
                  This commercial fleet application is pending review. Approve to activate Net-30 commercial billing.
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={approveMutation.isPending}
              onClick={handleApprove}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Check size={13} />
              <span>{approveMutation.isPending ? 'Approving...' : 'Approve Now'}</span>
            </button>
          </div>
        )}

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
            <span>Profile & Terms</span>
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
            <span>Vehicles</span>
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
            <span>Drivers</span>
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

          <button
            type="button"
            onClick={handleCopyInvite}
            className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
            title="Copy portal URL and login credentials for this fleet manager"
          >
            {copiedInvite ? (
              <>
                <Check size={13} className="text-emerald-600" />
                <span className="text-emerald-700">Copied Invite!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy Portal Invite</span>
              </>
            )}
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

        {/* Actions Footer */}
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
            {isPending && (
              <>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold cursor-pointer transition disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  <span>{deleteMutation.isPending ? 'Deleting...' : 'Delete Registration'}</span>
                </button>

                <button
                  type="button"
                  disabled={approveMutation.isPending}
                  onClick={handleApprove}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs transition disabled:opacity-50"
                >
                  <Check size={13} />
                  <span>{approveMutation.isPending ? 'Approving...' : 'Approve Fleet'}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Close
            </button>
            {activeTab === 'details' && (
              <button
                type="button"
                disabled={updateMutation.isPending}
                onClick={handleSaveProfile}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50 transition"
              >
                <Save size={13} />
                <span>{updateMutation.isPending ? 'Saving...' : 'Save Fleet Changes'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
