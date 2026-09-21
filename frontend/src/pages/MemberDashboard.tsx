import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Car, Wrench, Clock, Receipt, ShieldCheck, MapPin } from 'lucide-react';
import { api } from '../utils/api';
import { useTenant } from '../context/TenantContext';
import { formatCurrency, centsToDollars } from '../utils/currency';
import PageHeader from '../components/ui/PageHeader';
import { toast } from 'sonner';

type Tab = 'garage' | 'request' | 'history' | 'receipts';

export default function MemberDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('garage');
  const { currencySymbol } = useTenant();
  const queryClient = useQueryClient();

  // Booking state
  const [vehicleId, setVehicleId] = useState('');
  const [serviceName, setServiceName] = useState('Tire Repair (plug)');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

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

  // 3. Receipts
  const { data: receipts = [] } = useQuery({
    queryKey: ['member-portal-receipts'],
    queryFn: async () => {
      const res = await api.get('/member-portal/receipts');
      return res.data?.data || [];
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

    bookMemberService.mutate({
      vehicleId,
      serviceAddress: address,
      urgency: 'URGENT',
      serviceItems: [{ serviceName, quantity: 1, unitPriceCents: 9500 }],
      problemNotes: `[Member Priority Request] Tire: ${selectedVeh?.tireSize || 'N/A'}. ${notes}`,
      source: 'MEMBER_PORTAL',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personal Member Portal"
        subtitle="Exclusive member perks, roadside priority, and digital garage"
        badge={
          <span className="badge-brand inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Active Roadside Member</span>
          </span>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-semibold">
        {[
          { id: 'garage', label: `My Garage (${vehicles.length})`, icon: Car },
          { id: 'request', label: 'Request Roadside Assistance', icon: Wrench },
          { id: 'history', label: `Service History (${jobs.length})`, icon: Clock },
          { id: 'receipts', label: `Payment Receipts (${receipts.length})`, icon: Receipt },
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

      {/* 1. My Garage */}
      {activeTab === 'garage' && (
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
            </div>
          ))}
          {vehicles.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs">
              No saved vehicles in your garage. Your vehicles will appear here after your first service ticket.
            </div>
          )}
        </div>
      )}

      {/* 2. Request Service */}
      {activeTab === 'request' && (
        <form onSubmit={handleSubmitBooking} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs max-w-xl space-y-4 text-xs">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 font-medium">
            🚨 Priority Roadside Dispatch for Active Members — Technician en route immediately upon confirmation.
          </div>

          <div>
            <label className="font-semibold text-slate-700">Select Vehicle from Garage *</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="select-base mt-1"
              required
            >
              <option value="">-- Choose vehicle --</option>
              {vehicles.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate ? `[${v.licensePlate}] ` : ''}{v.year} {v.make} {v.model} ({v.tireSize})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Roadside Service</label>
            <select value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="select-base mt-1">
              <option value="Tire Repair (plug)">Tire Repair (plug) — Roadside Patch</option>
              <option value="Spare Tire Change">Spare Tire Installation</option>
              <option value="Jump Start">Battery Jump Start / Booster</option>
              <option value="New Tire Replacement">Emergency New Tire Replacement</option>
              <option value="Lock Smith Service">Lockout Assistance</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Breakdown Location Address *</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 100 King St West, Toronto or Hwy 401 Eastbound shoulder"
              className="input-base mt-1"
              required
            />
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
            disabled={bookMemberService.isPending}
            className="btn-primary w-full py-2.5 text-xs font-bold"
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
                    <MapPin className="w-3 h-3" />
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

      {/* 4. Receipts */}
      {activeTab === 'receipts' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
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
            {receipts.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">No payment receipts available yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
