import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, Wrench, Disc, Zap, Truck } from 'lucide-react';

export interface ServiceCategory {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  services: string[];
}

export const CATEGORIZED_SERVICES: ServiceCategory[] = [
  {
    title: 'Tire Repair & Maintenance',
    icon: Wrench,
    services: [
      'Tire Repair (plug)',
      'Stem valve replacement',
      'Tire Swap (ON RIM)',
      'Tire Swap (OFF RIM)',
      'Tire Rotation',
    ],
  },
  {
    title: 'Tire & Rim Replacement',
    icon: Disc,
    services: [
      'New Tire Replacement',
      'Used tire replacement',
      'NEW RIM replacement',
      'USED RIM replacement',
      'Spare Tire Change',
    ],
  },
  {
    title: 'Battery & Electrical',
    icon: Zap,
    services: [
      'Jump Start',
      'Battery Booster',
      'Battery Replacement',
      'Battery Installation',
    ],
  },
  {
    title: 'Emergency Towing & Lockout',
    icon: Truck,
    services: [
      'Lock Smith Service',
      'Towing Service',
    ],
  },
];

interface ServiceSelectDropdownProps {
  value: string;
  onChange: (service: string) => void;
}

export default function ServiceSelectDropdown({ value, onChange }: ServiceSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = CATEGORIZED_SERVICES.map((cat) => ({
    ...cat,
    services: cat.services.filter((s) => s.toLowerCase().includes(search.toLowerCase())),
  })).filter((cat) => cat.services.length > 0);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-left transition shadow-2xs cursor-pointer select-none"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <span className="text-xs font-bold text-slate-800 tracking-tight block">
              {value || 'Select Roadside Service'}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-red-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services (e.g. plug, battery, tow)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:border-red-500"
                autoFocus
              />
            </div>
          </div>

          {/* Categorized Options List */}
          <div className="max-h-64 overflow-y-auto overscroll-contain p-2 space-y-3">
            {filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching service found
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <div key={cat.title} className="space-y-1">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 select-none">
                      <CatIcon className="w-3 h-3 text-slate-400" />
                      <span>{cat.title}</span>
                    </div>
                    <div className="space-y-0.5">
                      {cat.services.map((srv) => {
                        const isSelected = value === srv;
                        return (
                          <button
                            key={srv}
                            type="button"
                            onClick={() => {
                              onChange(srv);
                              setIsOpen(false);
                              setSearch('');
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition cursor-pointer ${
                              isSelected
                                ? 'bg-red-50 text-red-700 font-bold'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium'
                            }`}
                          >
                            <span>{srv}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-red-600 shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
