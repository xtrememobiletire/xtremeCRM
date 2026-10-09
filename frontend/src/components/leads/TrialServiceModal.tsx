import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wrench } from 'lucide-react';
import Modal from '../ui/Modal';
import { api } from '../../utils/api';

interface TrialServiceModalProps {
  lead: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: {
    id: string;
    data: {
      unitNumber?: string;
      tireSizes?: string;
      location?: string;
      scheduledDate?: string;
      description?: string;
      driverId?: string;
      priceDollars?: number;
    };
  }) => void;
  isPending: boolean;
}

export default function TrialServiceModal({
  lead,
  isOpen,
  onClose,
  onSubmit,
  isPending,
}: TrialServiceModalProps) {
  const [form, setForm] = useState({
    unitNumber: '',
    tireSizes: '',
    location: '',
    scheduledDate: '',
    description: '',
    driverId: '',
    priceDollars: 0,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['available-drivers', lead?.countryCode],
    queryFn: async () => {
      const res = await api.get(`/users?role=DRIVER&countryCode=${lead?.countryCode || 'CA'}`);
      return res.data?.data?.users || res.data?.data || [];
    },
    enabled: isOpen && !!lead,
  });

  useEffect(() => {
    if (lead) {
      setForm({
        unitNumber: '',
        tireSizes: lead.commonTireSizes || '',
        location: lead.address || '',
        scheduledDate: '',
        description: `Trial road service for prospective fleet onboarding: ${lead.companyName}`,
        driverId: '',
        priceDollars: 0,
      });
    }
  }, [lead]);

  if (!lead) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: lead.id,
      data: {
        unitNumber: form.unitNumber || undefined,
        tireSizes: form.tireSizes || undefined,
        location: form.location || undefined,
        scheduledDate: form.scheduledDate || undefined,
        description: form.description || undefined,
        driverId: form.driverId || undefined,
        priceDollars: Number(form.priceDollars) || 0,
      },
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Book Feasibility Trial Service — ${lead.companyName}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {/* Lead Identity Summary */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">{lead.companyName}</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] font-mono">
              Prospect Feasibility
            </span>
          </div>
          <div className="text-slate-600 text-[11px] flex items-center gap-2">
            <span>Contact: <strong>{lead.contactPerson}</strong></span>
            <span>•</span>
            <span className="font-mono">{lead.phone}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Unit / Fleet Vehicle #</label>
            <input
              type="text"
              placeholder="e.g. Unit #104"
              value={form.unitNumber}
              onChange={(e) => setForm({ ...form, unitNumber: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Tire Size Specification</label>
            <input
              type="text"
              placeholder="e.g. 11R22.5"
              value={form.tireSizes}
              onChange={(e) => setForm({ ...form, tireSizes: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
            />
          </div>
        </div>

        {/* Pricing / Trial Fee */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Trial Price ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                step="any"
                value={form.priceDollars}
                onChange={(e) => setForm({ ...form, priceDollars: Number(e.target.value) })}
                className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {form.priceDollars === 0 ? 'Complimentary ($0.00)' : 'Agreed trial charge'}
            </span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Assign Technician (Optional)
            </label>
            <select
              value={form.driverId}
              onChange={(e) => setForm({ ...form, driverId: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            >
              <option value="">Leave Unassigned (Dispatcher routes)</option>
              {drivers.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} ({d.phone || 'Driver'})
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Can be routed by Dispatcher later
            </span>
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Depot / Breakdown Location</label>
          <input
            type="text"
            placeholder="e.g. 100 Main St or Highway Depot"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Appointment / Trial Date</label>
          <input
            type="datetime-local"
            value={form.scheduledDate}
            onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Work Order Instructions</label>
          <textarea
            rows={2}
            placeholder="Instructions for technician on scene..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50 transition"
          >
            <Wrench size={12} />
            <span>{isPending ? 'Booking...' : 'Confirm Trial Dispatch'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
