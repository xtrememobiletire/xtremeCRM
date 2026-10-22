import React, { useState, useRef, useEffect } from 'react';
import { Truck, Search, Plus, Check, X } from 'lucide-react';

export interface VehicleOption {
  id?: string;
  unitNumber?: string | null;
  licensePlate?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  vin?: string | null;
}

interface VehicleComboboxProps {
  vehicles: VehicleOption[];
  selectedVehicleId?: string;
  selectedUnitNumber?: string;
  selectedLicensePlate?: string;
  selectedVehicleDetails?: string;
  onSelect: (vehicle: {
    id?: string;
    unitNumber: string;
    licensePlate: string;
    make?: string;
    model?: string;
    year?: number;
    description?: string;
  }) => void;
  onClear?: () => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const VehicleCombobox: React.FC<VehicleComboboxProps> = ({
  vehicles,
  selectedUnitNumber = '',
  selectedLicensePlate = '',
  selectedVehicleDetails = '',
  onSelect,
  onClear,
  label = 'Assigned Vehicle',
  placeholder = 'Search fleet vehicle by unit #, plate, or model...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customUnit, setCustomUnit] = useState('');
  const [customPlate, setCustomPlate] = useState('');
  const [customMakeModel, setCustomMakeModel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filtered = vehicles.filter((v) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      (v.unitNumber && v.unitNumber.toLowerCase().includes(q)) ||
      (v.licensePlate && v.licensePlate.toLowerCase().includes(q)) ||
      (v.make && v.make.toLowerCase().includes(q)) ||
      (v.model && v.model.toLowerCase().includes(q)) ||
      (v.vin && v.vin.toLowerCase().includes(q))
    );
  });

  const handleSelectVehicle = (v: VehicleOption) => {
    const unit = v.unitNumber || '';
    const plate = v.licensePlate || '';
    const makeModelYear = [v.year, v.make, v.model].filter(Boolean).join(' ');

    onSelect({
      id: v.id,
      unitNumber: unit,
      licensePlate: plate,
      make: v.make || undefined,
      model: v.model || undefined,
      year: v.year || undefined,
      description: makeModelYear || undefined,
    });
    setIsOpen(false);
    setIsCustomMode(false);
    setQuery('');
  };

  const handleApplyCustom = () => {
    if (!customUnit.trim() && !customPlate.trim()) return;
    onSelect({
      unitNumber: customUnit.trim(),
      licensePlate: customPlate.trim(),
      description: customMakeModel.trim() || undefined,
    });
    setIsOpen(false);
    setIsCustomMode(false);
    setQuery('');
  };

  const hasSelection = Boolean(selectedUnitNumber.trim() || selectedLicensePlate.trim());

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5 text-slate-600" />
          <span>{label}</span>
        </label>
      )}

      <div className="relative">
        <div
          onClick={() => {
            if (!disabled) setIsOpen(!isOpen);
          }}
          className={`flex items-center justify-between px-3 py-2 rounded-xl border transition cursor-pointer bg-white text-xs ${
            isOpen ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 hover:border-slate-300'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Truck className="w-4 h-4 text-slate-400 shrink-0" />
            {hasSelection ? (
              <div className="flex items-center gap-2 truncate">
                {selectedUnitNumber && (
                  <span className="font-bold text-slate-900 font-mono">Unit #{selectedUnitNumber}</span>
                )}
                {selectedLicensePlate && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedLicensePlate}
                  </span>
                )}
                {selectedVehicleDetails && (
                  <span className="text-slate-500 text-[11px] truncate">({selectedVehicleDetails})</span>
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
                title="Clear vehicle"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <Search className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {isOpen && !disabled && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search unit #, plate, make, model..."
                className="w-full text-xs bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
              {!isCustomMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(true);
                    setCustomUnit(query.trim());
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100/80 rounded-lg border border-red-200 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add Custom / Unregistered Vehicle
                </button>
              ) : (
                <div className="space-y-2 p-2 bg-white rounded-lg border border-red-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Custom Vehicle Details</span>
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(false)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      placeholder="Unit # (e.g. TRK-104)"
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                    />
                    <input
                      type="text"
                      value={customPlate}
                      onChange={(e) => setCustomPlate(e.target.value)}
                      placeholder="License plate"
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 font-mono uppercase"
                    />
                  </div>
                  <input
                    type="text"
                    value={customMakeModel}
                    onChange={(e) => setCustomMakeModel(e.target.value)}
                    placeholder="Year / Make / Model (e.g. 2022 Freightliner Cascadia)"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustom}
                    disabled={!customUnit.trim() && !customPlate.trim()}
                    className="w-full py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition cursor-pointer"
                  >
                    Select This Vehicle
                  </button>
                </div>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  No registered vehicles found matching &quot;{query}&quot;. Use the button above to add custom.
                </div>
              ) : (
                filtered.map((v) => {
                  const isSelected = selectedUnitNumber === v.unitNumber;
                  const makeModelYear = [v.year, v.make, v.model].filter(Boolean).join(' ');

                  return (
                    <div
                      key={v.id || v.unitNumber}
                      onClick={() => handleSelectVehicle(v)}
                      className={`flex items-center justify-between p-2.5 hover:bg-slate-50 transition cursor-pointer text-xs ${
                        isSelected ? 'bg-red-50/60 font-semibold' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 font-mono">
                            {v.unitNumber ? `Unit #${v.unitNumber}` : 'Fleet Unit'}
                          </span>
                          {v.licensePlate && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {v.licensePlate}
                            </span>
                          )}
                        </div>
                        {makeModelYear && (
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{makeModelYear}</p>
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
