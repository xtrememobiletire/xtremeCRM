import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, X } from 'lucide-react';
import { MAPBOX_TOKEN } from '../../hooks/useMapbox';

export interface GeocodeLocation {
  address: string;
  latitude: number;
  longitude: number;
}

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelectLocation?: (loc: GeocodeLocation) => void;
  countryCode?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  autoFocus?: boolean;
}

interface SuggestionItem {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
}

export default function AddressAutocompleteInput({
  value,
  onChange,
  onSelectLocation,
  countryCode = 'CA',
  placeholder = 'Type street, intersection, or postal code...',
  className = '',
  required = false,
  autoFocus = false,
}: AddressAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const cc = (countryCode || 'CA').toLowerCase();
      const token = MAPBOX_TOKEN;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json?access_token=${token}&country=${cc}&limit=5`;
      const res = await fetch(url);
      const data = await res.json();

      if (data && Array.isArray(data.features)) {
        const list: SuggestionItem[] = data.features.map((f: any) => ({
          id: f.id,
          place_name: f.place_name,
          center: f.center,
        }));
        setSuggestions(list);
        setIsOpen(list.length > 0);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch {
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (text: string) => {
    onChange(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 280);
  };

  const handleSelect = (item: SuggestionItem) => {
    onChange(item.place_name);
    setIsOpen(false);
    setSuggestions([]);

    if (onSelectLocation && item.center && item.center.length === 2) {
      onSelectLocation({
        address: item.place_name,
        longitude: item.center[0],
        latitude: item.center[1],
      });
    }
  };

  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500 pointer-events-none shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          className={`w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs ${className}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
          ) : value ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Search className="w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150 max-h-60 overflow-y-auto">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Verified Address Suggestions</span>
            <span className="font-mono text-red-600">{countryCode}</span>
          </div>
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full px-3.5 py-2.5 text-left text-xs hover:bg-red-50/70 transition flex items-start gap-2.5 cursor-pointer group"
            >
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 group-hover:text-red-700 transition-colors">
                  {s.place_name}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
