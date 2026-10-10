import { useState } from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';

export interface FleetDriverItem {
  fullName: string;
  phone: string;
  licensePlate?: string;
}

interface FleetDriversSectionProps {
  drivers: FleetDriverItem[];
  onAddDriver: (driver: FleetDriverItem) => void;
  onRemoveDriver: (index: number) => void;
}

export default function FleetDriversSection({
  drivers,
  onAddDriver,
  onRemoveDriver,
}: FleetDriversSectionProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;

    onAddDriver({
      fullName: fullName.trim(),
      phone: phone.trim(),
      licensePlate: licensePlate.trim().toUpperCase() || undefined,
    });

    setFullName('');
    setPhone('');
    setLicensePlate('');
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Add New Driver Form */}
      <form onSubmit={handleAdd} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center justify-between">
          <span>Enroll Fleet Driver / Operator</span>
          <span className="text-slate-400 font-normal">Optional now, addable anytime</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Driver Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Henderson"
              className="input-base"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Driver Mobile Phone *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+14165550201"
              className="input-base font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assigned Vehicle Plate</label>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="e.g. AB12345"
              className="input-base font-mono uppercase"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Driver to Roster</span>
          </button>
        </div>
      </form>

      {/* Added Drivers Table */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
          <span>Enrolled Drivers ({drivers.length})</span>
          {drivers.length > 0 && (
            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Ready to enroll
            </span>
          )}
        </div>

        {drivers.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-400">
            <Users size={24} className="mx-auto mb-1 text-slate-300" />
            <p className="font-medium text-xs">No drivers added yet</p>
            <p className="text-[11px]">You can enroll drivers now or manage them later in the fleet portal.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase">
                <tr>
                  <th className="py-2 px-3">Driver Name</th>
                  <th className="py-2 px-3">Phone</th>
                  <th className="py-2 px-3">Assigned Plate</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.map((d, idx) => (
                  <tr key={`${d.phone}-${idx}`} className="hover:bg-slate-50/60">
                    <td className="py-2 px-3 font-semibold text-slate-900">{d.fullName}</td>
                    <td className="py-2 px-3 font-mono text-slate-700">{d.phone}</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-800">{d.licensePlate || '—'}</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onRemoveDriver(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition cursor-pointer"
                        title="Remove driver"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
