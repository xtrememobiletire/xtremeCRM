import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Truck, Users, Wrench, Clock, FileText, CheckCircle2, MessageSquare, 
  MapPin
} from 'lucide-react';
import { api } from '../utils/api';
import { useTenant } from '../context/TenantContext';
import { formatCurrency, centsToDollars } from '../utils/currency';
import PageHeader from '../components/ui/PageHeader';
import { toast } from 'sonner';

type Tab = 'dashboard' | 'vehicles' | 'drivers' | 'request' | 'status' | 'pending-invoices' | 'paid-invoices' | 'inbox';

export default function FleetDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { currencySymbol } = useTenant();
  const queryClient = useQueryClient();

  // Booking Form State
  const [vehicleId, setVehicleId] = useState('');
  const [serviceName, setServiceName] = useState('Tire Repair (plug)');
  const [serviceType, setServiceType] = useState<'STANDARD' | 'EMERGENCY'>('STANDARD');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // 1. Dashboard KPI query
  const { data: dashboardData } = useQuery({
    queryKey: ['fleet-portal-dashboard'],
    queryFn: async () => {
      const res = await api.get('/fleet-portal/dashboard');
      return res.data?.data;
    },
  });

  // 2. Vehicles
  const { data: vehicles = [] } = useQuery({
    queryKey: ['fleet-portal-vehicles'],
    queryFn: async () => {
      const res = await api.get('/fleet-portal/vehicles');
      return res.data?.data || [];
    },
  });

  // 3. Drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ['fleet-portal-drivers'],
    queryFn: async () => {
      const res = await api.get('/fleet-portal/drivers');
      return res.data?.data || [];
    },
  });

  // 4. Jobs / Service Status
  const { data: jobs = [] } = useQuery({
    queryKey: ['fleet-portal-jobs'],
    queryFn: async () => {
      const res = await api.get('/fleet-portal/jobs');
      return res.data?.data || [];
    },
  });

  // 5. Invoices
  const { data: pendingInvoices = [] } = useQuery({
    queryKey: ['fleet-portal-invoices', 'PENDING'],
    queryFn: async () => {
      const res = await api.get('/fleet-portal/invoices?status=PENDING');
      return res.data?.data || [];
    },
  });

  const { data: paidInvoices = [] } = useQuery({
    queryKey: ['fleet-portal-invoices', 'PAID'],
    queryFn: async () => {
      const res = await api.get('/fleet-portal/invoices?status=PAID');
      return res.data?.data || [];
    },
  });

  // 6. Messages
  const { data: messages = [] } = useQuery({
    queryKey: ['fleet-portal-messages'],
    queryFn: async () => {
      const res = await api.get('/fleet-portal/messages');
      return res.data?.data || [];
    },
  });

  // Request Service Mutation
  const bookServiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/jobs', payload);
    },
    onSuccess: () => {
      toast.success('Service request submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['fleet-portal-jobs'] });
      setActiveTab('status');
      setAddress('');
      setNotes('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit service request');
    },
  });

  const handleBookService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !address) {
      toast.error('Please select a vehicle and provide a breakdown/service address');
      return;
    }
    const selectedVeh = vehicles.find((v: any) => v.id === vehicleId);

    bookServiceMutation.mutate({
      vehicleId,
      fleetId: dashboardData?.fleet?.id,
      serviceAddress: address,
      urgency: serviceType === 'EMERGENCY' ? 'URGENT' : 'STANDARD',
      serviceItems: [{ serviceName, quantity: 1, unitPriceCents: 12000 }],
      recipientPhone: contactPhone || dashboardData?.fleet?.contactPhone,
      recipientName: dashboardData?.fleet?.companyName,
      problemNotes: `[Fleet Self-Request] Tire: ${selectedVeh?.tireSize || 'N/A'}. ${notes}`,
      source: 'FLEET_PORTAL',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={dashboardData?.fleet?.companyName ? `${dashboardData.fleet.companyName} — Fleet Portal` : 'Fleet Manager Portal'}
        subtitle={`Account: ${dashboardData?.fleet?.accountCode || 'B2B Client'} | Dispatch Hotline: (437) 375-5674`}
        badge={
          <span className="badge-brand inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Contract Verified</span>
          </span>
        }
      />

      {/* Navigation Tabs (PRD FR-3.1: 7 Core Views + Inbox) */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-semibold">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Truck },
          { id: 'vehicles', label: `Vehicles (${vehicles.length})`, icon: Truck },
          { id: 'drivers', label: `My Drivers (${drivers.length})`, icon: Users },
          { id: 'request', label: 'Request Service', icon: Wrench },
          { id: 'status', label: `Service Status (${jobs.length})`, icon: Clock },
          { id: 'pending-invoices', label: `Pending Invoices (${pendingInvoices.length})`, icon: FileText },
          { id: 'paid-invoices', label: `Paid Invoices (${paidInvoices.length})`, icon: CheckCircle2 },
          { id: 'inbox', label: `Inbox (${messages.length})`, icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 whitespace-nowrap transition ${
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

      {/* TAB CONTENT */}

      {/* 1. Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Registered Fleet Vehicles</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {vehicles.length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Authorized Drivers</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {drivers.length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Active & Past Jobs</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {jobs.length}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-800">Company Account Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
              <div><strong>Company:</strong> {dashboardData?.fleet?.companyName || '—'}</div>
              <div><strong>Account Code:</strong> {dashboardData?.fleet?.accountCode || '—'}</div>
              <div><strong>Primary Email:</strong> {dashboardData?.fleet?.contactEmail || 'piratheep@xtrememobiletire.com'}</div>
              <div><strong>Dispatch Phone:</strong> {dashboardData?.fleet?.contactPhone || '+1 (437) 375-5674'}</div>
              <div className="md:col-span-2"><strong>Depot Address:</strong> {dashboardData?.fleet?.address || '857 Winterton Way, Mississauga, ON'}</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Vehicles Directory */}
      {activeTab === 'vehicles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {vehicles.map((v: any) => (
              <div key={v.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-800">
                    {v.licensePlate || 'NO PLATE'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{v.year || '2024'}</span>
                </div>
                <div className="font-bold text-sm text-slate-900">{v.make} {v.model}</div>
                <div className="text-xs text-slate-500">
                  Tire Spec: <strong className="text-red-700 font-mono">{v.tireSize || '11R22.5'}</strong>
                </div>
              </div>
            ))}
            {vehicles.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                No fleet vehicles registered. Contact operations to register your units.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. My Drivers */}
      {activeTab === 'drivers' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {drivers.map((d: any) => (
              <div key={d.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                <div>
                  <div className="font-bold text-slate-900">{d.fullName || d.name}</div>
                  <div className="text-slate-500 font-mono mt-0.5">{d.phone}</div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-semibold text-[10px]">
                  Authorized Driver
                </span>
              </div>
            ))}
            {drivers.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No authorized drivers listed. Drivers calling dispatch from the road are verified by company code.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Request Service */}
      {activeTab === 'request' && (
        <form onSubmit={handleBookService} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs max-w-xl space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-800">Book Roadside or Scheduled Maintenance</h3>
          
          <div>
            <label className="font-semibold text-slate-700">Select Fleet Vehicle *</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="select-base mt-1"
              required
            >
              <option value="">-- Choose registered vehicle --</option>
              {vehicles.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate ? `[${v.licensePlate}] ` : ''}{v.year} {v.make} {v.model} ({v.tireSize || '11R22.5'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700">Service Category</label>
              <select value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="select-base mt-1">
                <option value="Tire Repair (plug)">Tire Repair (plug)</option>
                <option value="New Tire Replacement">New Tire Replacement</option>
                <option value="Used tire replacement">Used tire replacement</option>
                <option value="Tire Swap (ON RIM)">Tire Swap (ON RIM)</option>
                <option value="Spare Tire Change">Spare Tire Change</option>
                <option value="Battery Booster">Jump Start / Booster</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700">Service Urgency</label>
              <select value={serviceType} onChange={(e) => setServiceType(e.target.value as any)} className="select-base mt-1">
                <option value="STANDARD">Standard Scheduled</option>
                <option value="EMERGENCY">Roadside Emergency (Priority)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Breakdown Location Address *</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Hwy 401 Eastbound Shoulder at Dixie Rd"
              className="input-base mt-1"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700">On-Scene Driver Contact Phone</label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Driver cell number for dispatch ETA"
              className="input-base mt-1"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700">Notes / Wheel Position</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Trailer right-rear outer tire blowout"
              className="textarea-base mt-1"
              rows={2}
            />
          </div>

          <button
            type="submit"
            disabled={bookServiceMutation.isPending}
            className="btn-primary w-full py-2.5 text-xs font-bold"
          >
            {bookServiceMutation.isPending ? 'Submitting...' : 'Dispatch Request Now'}
          </button>
        </form>
      )}

      {/* 5. Service Status */}
      {activeTab === 'status' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {jobs.map((j: any) => (
              <div key={j.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{j.jobCode || `JOB-${j.id.slice(0, 6)}`}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      j.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      j.status === 'ASSIGNED' || j.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {j.status}
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600 font-semibold">{j.vehicle ? `${j.vehicle.make} ${j.vehicle.model} [${j.vehicle.licensePlate || 'NO PLATE'}]` : 'Fleet Vehicle'}</span>
                  </div>
                  <div className="text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{j.serviceAddress}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900">
                      {formatCurrency(centsToDollars(j.totalCents || 0), currencySymbol)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(j.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {jobs.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">No service requests found.</div>
            )}
          </div>
        </div>
      )}

      {/* 6. Pending Invoices */}
      {activeTab === 'pending-invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {pendingInvoices.map((inv: any) => (
              <div key={inv.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">Due: {new Date(inv.dueDate).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-red-600">
                    {formatCurrency(centsToDollars(inv.totalCents), currencySymbol)}
                  </div>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
            {pendingInvoices.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">Zero outstanding invoices. Account in good standing!</div>
            )}
          </div>
        </div>
      )}

      {/* 7. Paid Invoices */}
      {activeTab === 'paid-invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {paidInvoices.map((inv: any) => (
              <div key={inv.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">Settled: {new Date(inv.updatedAt).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-700">
                    {formatCurrency(centsToDollars(inv.totalCents), currencySymbol)}
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                    PAID
                  </span>
                </div>
              </div>
            ))}
            {paidInvoices.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">No historical settled invoices.</div>
            )}
          </div>
        </div>
      )}

      {/* 8. Inbox */}
      {activeTab === 'inbox' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {messages.map((m: any) => (
              <div key={m.id} className="p-4 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{m.senderName || 'Operations Team'}</span>
                  <span className="text-slate-400 text-[10px]">{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-600">{m.content}</p>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">Your portal notification inbox is empty.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
