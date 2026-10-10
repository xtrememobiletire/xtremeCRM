import { useState } from 'react';
import { Truck, Plus, Trash2 } from 'lucide-react';

export interface FleetVehicleItem {
  licensePlate: string;
  make: string;
  model: string;
  year?: number;
  tireSize?: string;
  vin?: string;
}

interface FleetVehiclesSectionProps {
  vehicles: FleetVehicleItem[];
  onAddVehicle: (vehicle: FleetVehicleItem) => void;
  onRemoveVehicle: (index: number) => void;
}

export default function FleetVehiclesSection({
  vehicles,
  onAddVehicle,
  onRemoveVehicle,
}: FleetVehiclesSectionProps) {
  const [licensePlate, setLicensePlate] = useState('');
  const [make, setMake] = useState('Freightliner');
  const [model, setModel] = useState('Cascadia');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [tireSize, setTireSize] = useState('11R22.5');
  const [vin, setVin] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensePlate.trim()) return;

    onAddVehicle({
      licensePlate: licensePlate.trim().toUpperCase(),
      make: make.trim() || 'Commercial',
      model: model.trim() || 'Rig',
      year: year || new Date().getFullYear(),
      tireSize: tireSize.trim() || '11R22.5',
      vin: vin.trim() || undefined,
    });

    setLicensePlate('');
    setVin('');
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Add New Vehicle Form */}
      <form onSubmit={handleAdd} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center justify-between">
          <span>Add Fleet Vehicle / Rig</span>
          <span className="text-slate-400 font-normal">Optional now, addable anytime</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">License Plate *</label>
            <input
              type="text"
              required
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="e.g. AB12345"
              className="input-base font-mono uppercase font-bold"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Make</label>
            <input
              type="text"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="e.g. Freightliner"
              className="input-base"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. Cascadia"
              className="input-base"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Year</label>
            <input
              type="number"
              min="1990"
              max={new Date().getFullYear() + 2}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="input-base font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tire Size</label>
            <input
              type="text"
              value={tireSize}
              onChange={(e) => setTireSize(e.target.value)}
              placeholder="e.g. 11R22.5, 295/75R22.5"
              className="input-base font-mono font-medium"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">VIN (Optional)</label>
            <input
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="17-character VIN"
              className="input-base font-mono uppercase text-[11px]"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Vehicle to Roster</span>
          </button>
        </div>
      </form>

      {/* Added Vehicles Table */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
          <span>Enrolled Vehicles ({vehicles.length})</span>
          {vehicles.length > 0 && (
            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Ready to enroll
            </span>
          )}
        </div>

        {vehicles.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-400">
            <Truck size={24} className="mx-auto mb-1 text-slate-300" />
            <p className="font-medium text-xs">No vehicles added yet</p>
            <p className="text-[11px]">You can add initial rigs now or enroll them later from the Vehicles database.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase">
                <tr>
                  <th className="py-2 px-3">Plate</th>
                  <th className="py-2 px-3">Vehicle</th>
                  <th className="py-2 px-3">Tire Size</th>
                  <th className="py-2 px-3">VIN</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v, idx) => (
                  <tr key={`${v.licensePlate}-${idx}`} className="hover:bg-slate-50/60">
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">{v.licensePlate}</td>
                    <td className="py-2 px-3 text-slate-700">
                      {v.year} {v.make} {v.model}
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-800">{v.tireSize}</td>
                    <td className="py-2 px-3 font-mono text-slate-400 text-[10px]">{v.vin || '—'}</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onRemoveVehicle(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition cursor-pointer"
                        title="Remove vehicle"
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
