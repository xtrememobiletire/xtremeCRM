import { Car, Truck } from 'lucide-react';
import { cleanText, formatVehicleName, formatPlateBadge, formatTireSpecBadge } from '../../utils/displayFormatters';

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
              {(() => {
                const vehName = formatVehicleName(`${v.year ? `${v.year} ` : ''}${v.make || ''} ${v.model || ''}`);
                const plateBadge = formatPlateBadge(v.licensePlate, `${v.make || ''} ${v.model || ''}`);
                const tireBadge = formatTireSpecBadge(v.tireSize);
                return (
                  <>
                    <td className="table-td">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                        <Car size={15} className="text-red-600 shrink-0" />
                        <span>{vehName}</span>
                      </div>
                    </td>
                    <td className="table-td">
                      {plateBadge.isPlaceholder ? (
                        <span className="inline-block font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                          {plateBadge.text}
                        </span>
                      ) : (
                        <div className="font-mono text-xs font-bold text-slate-800 tabular-nums">
                          {plateBadge.text}
                        </div>
                      )}
                      {v.vin && <div className="font-mono text-[10px] text-slate-400 truncate mt-0.5">{v.vin}</div>}
                    </td>
                    <td className="table-td">
                      {tireBadge.isPlaceholder ? (
                        <span className="inline-block px-2 py-0.5 rounded font-mono text-xs bg-slate-100 text-slate-600 border border-slate-200">
                          {tireBadge.text}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-xs bg-red-50 text-red-700 border border-red-200 tabular-nums">
                          {tireBadge.text}
                        </span>
                      )}
                    </td>
                    <td className="table-td">
                      {v.fleetCompany ? (
                        <div className="flex items-center gap-1 text-xs text-blue-700 font-semibold">
                          <Truck size={13} />
                          <span>{cleanText(v.fleetCompany.companyName)}</span>
                        </div>
                      ) : v.customer ? (
                        <div className="text-xs font-medium text-slate-800">
                          {cleanText(v.customer.name)} <span className="tabular-nums">({v.customer.phone})</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Unassigned</span>
                      )}
                    </td>
                  </>
                );
              })()}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
