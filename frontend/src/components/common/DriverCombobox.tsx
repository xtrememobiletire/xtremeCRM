import React, { useState, useRef, useEffect } from 'react';
import { User, Search, Plus, Check, X, Phone, Truck } from 'lucide-react';

export interface DriverOption {
  id?: string;
  name: string;
  phone?: string;
  vehicleId?: string | null;
  unitNumber?: string | null;
  licensePlate?: string | null;
  vehicle?: {
    id: string;
    unitNumber: string;
    licensePlate: string;
    make?: string | null;
    model?: string | null;
    year?: number | null;
  } | null;
}

interface DriverComboboxProps {
  drivers: DriverOption[];
  selectedDriverName?: string;
  selectedDriverPhone?: string;
  onSelect: (driver: { id?: string; name: string; phone: string; vehicleId?: string; unitNumber?: string; licensePlate?: string }) => void;
  onClear?: () => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const DriverCombobox: React.FC<DriverComboboxProps> = ({
  drivers,
  selectedDriverName = '',
  selectedDriverPhone = '',
  onSelect,
  onClear,
  label = 'Assigned Driver',
  placeholder = 'Search registered driver or enter custom...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filtered = drivers.filter((d) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      (d.phone && d.phone.toLowerCase().includes(q)) ||
      (d.unitNumber && d.unitNumber.toLowerCase().includes(q)) ||
      (d.licensePlate && d.licensePlate.toLowerCase().includes(q))
    );
  });

  const handleSelectDriver = (driver: DriverOption) => {
    const assignedVehicle = driver.vehicle || null;
    onSelect({
      id: driver.id,
      name: driver.name,
      phone: driver.phone || '',
      vehicleId: driver.vehicleId || assignedVehicle?.id || undefined,
      unitNumber: driver.unitNumber || assignedVehicle?.unitNumber || undefined,
      licensePlate: driver.licensePlate || assignedVehicle?.licensePlate || undefined,
    });
    setIsOpen(false);
    setIsCustomMode(false);
    setQuery('');
  };

  const handleApplyCustom = () => {
    if (!customName.trim()) return;
    onSelect({
      name: customName.trim(),
      phone: customPhone.trim(),
    });
    setIsOpen(false);
    setIsCustomMode(false);
    setQuery('');
  };

  const hasSelection = Boolean(selectedDriverName.trim());

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-600" />
          <span>{label}</span>
        </label>
      )}

      <div className="relative">
        {/* Selected Display / Search Input */}
        <div
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          className={`flex items-center justify-between px-3 py-2 rounded-xl border transition cursor-pointer bg-white text-xs ${
            isOpen ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 hover:border-slate-300'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            {hasSelection ? (
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-slate-900">{selectedDriverName}</span>
                {selectedDriverPhone && (
                  <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selectedDriverPhone}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {hasSelection && onClear && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Clear driver"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <Search className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Search filter input */}
            <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to filter or add custom..."
                className="w-full text-xs bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Sticky "+ Add Custom Driver" button / form */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
              {!isCustomMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(true);
                    setCustomName(query.trim());
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100/80 rounded-lg border border-red-200 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add Custom / Unregistered Driver
                </button>
              ) : (
                <div className="space-y-2 p-2 bg-white rounded-lg border border-red-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Custom Driver Details</span>
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(false)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Driver full name *"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <input
                    type="tel"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="Phone number (optional)"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustom}
                    disabled={!customName.trim()}
                    className="w-full py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition cursor-pointer"
                  >
                    Select This Driver
                  </button>
                </div>
              )}
            </div>

            {/* Drivers list */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  No registered drivers found matching &quot;{query}&quot;. Use the button above to add custom.
                </div>
              ) : (
                filtered.map((driver) => {
                  const isSelected = selectedDriverName === driver.name;
                  const unit = driver.unitNumber || driver.vehicle?.unitNumber;
                  const plate = driver.licensePlate || driver.vehicle?.licensePlate;

                  return (
                    <div
                      key={driver.id || driver.name}
                      onClick={() => handleSelectDriver(driver)}
                      className={`flex items-center justify-between p-2.5 hover:bg-slate-50 transition cursor-pointer text-xs ${
                        isSelected ? 'bg-red-50/60 font-semibold' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{driver.name}</span>
                          {driver.phone && (
                            <span className="text-[11px] font-mono text-slate-500">({driver.phone})</span>
                          )}
                        </div>
                        {(unit || plate) && (
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                            <Truck className="w-3 h-3 text-slate-400" />
                            {unit && <span>Unit: {unit}</span>}
                            {plate && <span>Plate: {plate}</span>}
                          </div>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-red-600 shrink-0 ml-2" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
