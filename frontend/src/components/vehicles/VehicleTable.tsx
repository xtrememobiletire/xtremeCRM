import { Car, Truck } from 'lucide-react';

interface Vehicle {
  id: string;
  vin?: string;
  licensePlate?: string;
  make: string;
  model: string;
  year?: number;
  tireSize?: string;
  customer?: {
    id: string;
    name: string;
    phone: string;
  } | null;
  fleetCompany?: {
    id: string;
    companyName: string;
  } | null;
}

interface VehicleTableProps {
  vehicles: Vehicle[];
}

export default function VehicleTable({ vehicles }: VehicleTableProps) {
  if (!vehicles || vehicles.length === 0) return null;

  return (
    <div className="table-container">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className="table-th">Vehicle Make & Model</th>
            <th className="table-th">Plate / VIN</th>
            <th className="table-th">Tire Specification</th>
            <th className="table-th">Owner / Account</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {vehicles.map((v) => (
            <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="table-td">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <Car size={15} className="text-red-600 shrink-0" />
                  <span>{v.year || ''} {v.make} {v.model}</span>
                </div>
              </td>
              <td className="table-td">
                <div className="font-mono text-xs font-bold text-slate-800">
                  {v.licensePlate || 'NO PLATE'}
                </div>
                {v.vin && <div className="font-mono text-[10px] text-slate-400 truncate">{v.vin}</div>}
              </td>
              <td className="table-td">
                {v.tireSize ? (
                  <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-xs bg-red-50 text-red-700 border border-red-200">
                    {v.tireSize}
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs italic">Unspecified</span>
                )}
              </td>
              <td className="table-td">
                {v.fleetCompany ? (
                  <div className="flex items-center gap-1 text-xs text-blue-700 font-semibold">
                    <Truck size={13} />
                    <span>{v.fleetCompany.companyName}</span>
                  </div>
                ) : v.customer ? (
                  <div className="text-xs font-medium text-slate-800">
                    {v.customer.name} ({v.customer.phone})
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs">Unassigned</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
