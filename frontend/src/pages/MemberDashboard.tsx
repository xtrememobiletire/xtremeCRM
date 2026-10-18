import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Car, Wrench, Clock, Receipt, ShieldCheck, MapPin, Plus, FileText, X } from 'lucide-react';
import { api } from '../utils/api';
import { useTenant } from '../context/TenantContext';
import { formatCurrency, centsToDollars } from '../utils/currency';
import PageHeader from '../components/ui/PageHeader';
import AddressAutocompleteInput from '../components/common/AddressAutocompleteInput';
import InvoicePdfModal from '../components/invoices/InvoicePdfModal';
import { toast } from 'sonner';

type Tab = 'garage' | 'request' | 'history' | 'receipts';

const MEMBER_SERVICE_OPTIONS: Array<{
  name: string;
  category: 'TIRE_SERVICE' | 'ROADSIDE_ASSISTANCE' | 'MAINTENANCE';
  priceCents: number;
}> = [
  { name: 'Flat Tire Repair', category: 'TIRE_SERVICE', priceCents: 10800 },
  { name: 'New Tire Replacement', category: 'TIRE_SERVICE', priceCents: 21600 },
  { name: 'Seasonal Tire Swap (On-Rim)', category: 'TIRE_SERVICE', priceCents: 9900 },
  { name: 'Jump Start', category: 'ROADSIDE_ASSISTANCE', priceCents: 8550 },
  { name: 'Lock Smith Service', category: 'ROADSIDE_ASSISTANCE', priceCents: 12150 },
  { name: 'Fuel Delivery', category: 'ROADSIDE_ASSISTANCE', priceCents: 9450 },
  { name: 'Towing Service', category: 'ROADSIDE_ASSISTANCE', priceCents: 16650 },
];

export default function MemberDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('garage');
  const { currencySymbol, country } = useTenant();
  const queryClient = useQueryClient();

  // Booking state
  const [vehicleId, setVehicleId] = useState('');
  const [serviceName, setServiceName] = useState('Flat Tire Repair');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [notes, setNotes] = useState('');

  // Modals & Invoices
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    tireSize: '225/65R17',
    color: '',
    vin: '',
  });

  // 1. My Vehicles
  const { data: vehicles = [] } = useQuery({
    queryKey: ['member-portal-vehicles'],
    queryFn: async () => {
      const res = await api.get('/member-portal/vehicles');
      return res.data?.data || [];
    },
  });

  // 2. Job History
  const { data: jobs = [] } = useQuery({
    queryKey: ['member-portal-jobs'],
    queryFn: async () => {
      const res = await api.get('/member-portal/jobs');
      return res.data?.data || [];
    },
  });

  // 3. Invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['member-portal-invoices'],
    queryFn: async () => {
      const res = await api.get('/member-portal/invoices');
      return res.data?.data || [];
    },
  });

  // 4. Receipts
  const { data: receipts = [] } = useQuery({
    queryKey: ['member-portal-receipts'],
    queryFn: async () => {
      const res = await api.get('/member-portal/receipts');
      return res.data?.data || [];
    },
  });

  // Add vehicle mutation
  const addVehicleMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/member-portal/vehicles', payload);
    },
    onSuccess: (res: any) => {
      toast.success('Vehicle successfully added to your garage!');
      queryClient.invalidateQueries({ queryKey: ['member-portal-vehicles'] });
      setIsAddVehicleOpen(false);
      const createdId = res.data?.data?.id;
      if (createdId) setVehicleId(createdId);
      setNewVehicle({
        make: '',
        model: '',
        year: new Date().getFullYear(),
        licensePlate: '',
        tireSize: '225/65R17',
        color: '',
        vin: '',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add vehicle');
    },
  });

  // Book service mutation
  const bookMemberService = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/jobs', payload);
    },
    onSuccess: () => {
      toast.success('Priority roadside assistance requested!');
      queryClient.invalidateQueries({ queryKey: ['member-portal-jobs'] });
      setActiveTab('history');
      setAddress('');
      setCoords(null);
      setNotes('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    },
  });

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !address) {
      toast.error('Vehicle and breakdown location are required');
      return;
    }

    const selectedVeh = vehicles.find((v: any) => v.id === vehicleId);
    const selectedSvc = MEMBER_SERVICE_OPTIONS.find((s) => s.name === serviceName) || MEMBER_SERVICE_OPTIONS[0];

    bookMemberService.mutate({
      vehicleId,
      countryCode: country,
      serviceAddress: address,
      serviceLatitude: coords?.latitude || null,
      serviceLongitude: coords?.longitude || null,
      urgency: 'URGENT',
      serviceItems: [
        {
          serviceName: selectedSvc.name,
          category: selectedSvc.category,
          quantity: 1,
          unitPriceCents: selectedSvc.priceCents,
        },
      ],
      problemNotes: `[Member Priority Request] Tire: ${selectedVeh?.tireSize || 'N/A'}. ${notes}`.trim(),
      source: 'MEMBER_PORTAL',
    });
  };

  const handleAddVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.make.trim() || !newVehicle.model.trim()) {
      toast.error('Vehicle make and model are required');
      return;
    }
    addVehicleMutation.mutate(newVehicle);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personal Member Portal"
        subtitle="Exclusive member perks, roadside priority, and digital garage"
        badge={
          <span className="badge-brand inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Active Roadside Member (10% VIP Discount)</span>
          </span>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-semibold">
        {[
          { id: 'garage', label: `My Garage (${vehicles.length})`, icon: Car },
          { id: 'request', label: 'Request Roadside Assistance', icon: Wrench },
          { id: 'history', label: `Service History (${jobs.length})`, icon: Clock },
          { id: 'receipts', label: `Invoices & Receipts (${invoices.length || receipts.length})`, icon: Receipt },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. My Garage */}
      {activeTab === 'garage' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registered Vehicles</h3>
              <p className="text-xs text-slate-500">Vehicles eligible for instant roadside emergency dispatch</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddVehicleOpen(true)}
              className="btn-primary py-2 px-3 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Vehicle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {vehicles.map((v: any) => (
              <div key={v.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-800">
                    {v.licensePlate || 'NO PLATE'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{v.year}</span>
                </div>
                <div className="font-bold text-sm text-slate-900">{v.make} {v.model}</div>
                <div className="text-xs text-slate-500">
                  Tire Size: <strong className="text-red-700 font-mono">{v.tireSize || '225/65R17'}</strong>
                </div>
                {v.color && (
                  <div className="text-[11px] text-slate-400">Color: {v.color}</div>
                )}
              </div>
            ))}
            {vehicles.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs space-y-3 bg-white rounded-xl border border-dashed border-slate-300">
                <Car className="w-8 h-8 text-slate-300 mx-auto" />
                <div>No saved vehicles in your garage yet.</div>
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(true)}
                  className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Your First Vehicle</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Request Service */}
      {activeTab === 'request' && (
        <form onSubmit={handleSubmitBooking} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs max-w-xl space-y-4 text-xs">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 font-medium">
            🚨 Priority Roadside Dispatch for Active Members — Technician en route immediately upon confirmation.
          </div>

          {vehicles.length === 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-3">
              <div>
                <strong className="block font-semibold">No vehicle in your garage!</strong>
                Please add a vehicle to request roadside service.
              </div>
              <button
                type="button"
                onClick={() => setIsAddVehicleOpen(true)}
                className="btn-primary py-1.5 px-3 text-xs font-bold whitespace-nowrap inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Vehicle</span>
              </button>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">Select Vehicle from Garage *</label>
              <button
                type="button"
                onClick={() => setIsAddVehicleOpen(true)}
                className="text-[11px] text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-0.5 cursor-pointer"
              >
                <Plus size={12} />
                <span>Add New Vehicle</span>
              </button>
            </div>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="select-base mt-1"
              required
            >
              <option value="">-- Choose vehicle --</option>
              {vehicles.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate ? `[${v.licensePlate}] ` : ''}{v.year} {v.make} {v.model} ({v.tireSize || 'TBD'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Roadside Service (VIP Member Rate - 10% Off)</label>
            <select
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="select-base mt-1"
            >
              {MEMBER_SERVICE_OPTIONS.map((svc) => (
                <option key={svc.name} value={svc.name}>
                  {svc.name} — {formatCurrency(centsToDollars(svc.priceCents), currencySymbol)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Breakdown Location Address *</label>
            <div className="mt-1">
              <AddressAutocompleteInput
                value={address}
                countryCode={country}
                onChange={(val) => setAddress(val)}
                onSelectLocation={(loc) => {
                  setAddress(loc.address);
                  setCoords({ latitude: loc.latitude, longitude: loc.longitude });
                }}
                placeholder="e.g. 100 King St West, Toronto or Hwy 401 Eastbound shoulder"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Describe the Issue</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Front driver-side flat tire, hazard lights are on"
              className="textarea-base mt-1"
              rows={2}
            />
          </div>

          <button
            type="submit"
            disabled={bookMemberService.isPending || !vehicleId}
            className="btn-primary w-full py-2.5 text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            {bookMemberService.isPending ? 'Requesting Priority Unit...' : 'Dispatch Roadside Unit Now'}
          </button>
        </form>
      )}

      {/* 3. History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {jobs.map((j: any) => (
              <div key={j.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{j.jobCode || `JOB-${j.id.slice(0, 6)}`}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      j.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {j.status}
                    </span>
                  </div>
                  <div className="text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{j.serviceAddress}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900">
                    {formatCurrency(centsToDollars(j.totalCents || 0), currencySymbol)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(j.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
            {jobs.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">No service records found.</div>
            )}
          </div>
        </div>
      )}

      {/* 4. Invoices & Receipts */}
      {activeTab === 'receipts' && (
        <div className="space-y-6">
          {/* Member Invoices */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Member Invoices</h4>
                <p className="text-[11px] text-slate-500">Official billing statements and itemized work receipts</p>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {invoices.map((inv: any) => {
                const isPaid = inv.status === 'PAID';
                return (
                  <div key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          inv.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        Issued: {new Date(inv.issueDate || inv.createdAt).toLocaleDateString()}
                        {inv.dueDate && ` • Due: ${new Date(inv.dueDate).toLocaleDateString()}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">
                          {formatCurrency(centsToDollars(inv.totalCents), currencySymbol)}
                        </div>
                        {!isPaid && (
                          <div className="text-[11px] text-amber-600 font-medium">
                            Balance Due: {formatCurrency(centsToDollars(inv.balanceDueCents ?? inv.totalCents), currencySymbol)}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        className="btn-secondary py-1.5 px-3 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText size={13} />
                        <span>View PDF</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {invoices.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs">No invoices generated yet.</div>
              )}
            </div>
          </div>

          {/* Payment Receipts */}
          {receipts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h4 className="font-bold text-slate-900 text-xs">Verified Payment Receipts</h4>
              </div>
              <div className="divide-y divide-slate-100">
                {receipts.map((r: any) => (
                  <div key={r.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-slate-900">{r.jobCode}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Settled on {r.completedAt ? new Date(r.completedAt).toLocaleDateString() : 'Recent'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-mono font-bold text-emerald-700">
                        {formatCurrency(centsToDollars(r.totalCents), currencySymbol)}
                      </div>
                      {r.receiptUrl ? (
                        <a
                          href={r.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-[11px] py-1 px-2.5"
                        >
                          Download Receipt
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">E-Receipt Settled</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Vehicle Modal */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden text-xs">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-red-600" />
                <h3 className="font-bold text-slate-900 text-sm">Add Vehicle to Garage</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVehicleOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddVehicleSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Make *</label>
                  <input
                    type="text"
                    value={newVehicle.make}
                    onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                    placeholder="e.g. Toyota"
                    className="input-base mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Model *</label>
                  <input
                    type="text"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    placeholder="e.g. RAV4"
                    className="input-base mt-1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Year</label>
                  <input
                    type="number"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle({ ...newVehicle, year: Number(e.target.value) })}
                    className="input-base mt-1 font-mono"
                    min="1980"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">License Plate</label>
                  <input
                    type="text"
                    value={newVehicle.licensePlate}
                    onChange={(e) => setNewVehicle({ ...newVehicle, licensePlate: e.target.value.toUpperCase() })}
                    placeholder="e.g. ABCD-123"
                    className="input-base mt-1 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Tire Size</label>
                  <input
                    type="text"
                    value={newVehicle.tireSize}
                    onChange={(e) => setNewVehicle({ ...newVehicle, tireSize: e.target.value })}
                    placeholder="e.g. 225/65R17"
                    className="input-base mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Color</label>
                  <input
                    type="text"
                    value={newVehicle.color}
                    onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                    placeholder="e.g. Silver"
                    className="input-base mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">VIN (Optional)</label>
                <input
                  type="text"
                  value={newVehicle.vin}
                  onChange={(e) => setNewVehicle({ ...newVehicle, vin: e.target.value.toUpperCase() })}
                  placeholder="17-character VIN"
                  className="input-base mt-1 font-mono uppercase text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="btn-secondary py-2 px-3.5 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addVehicleMutation.isPending}
                  className="btn-primary py-2 px-4 text-xs font-bold cursor-pointer"
                >
                  {addVehicleMutation.isPending ? 'Saving...' : 'Save to Garage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice PDF Modal */}
      {selectedInvoiceId && (
        <InvoicePdfModal
          isOpen={!!selectedInvoiceId}
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          onStatusUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['member-portal-invoices'] });
          }}
        />
      )}
    </div>
  );
}
