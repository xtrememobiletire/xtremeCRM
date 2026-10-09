import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, RefreshCw, MapPin } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import CustomerMap from '../../components/maps/CustomerMap';
import { mapService, type MapCustomer } from '../../services/mapService';
import { useTenant } from '../../context/TenantContext';

export default function CustomerMapView() {
  const { country } = useTenant();
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['customers-map-view', country],
    queryFn: () => mapService.getCustomers(country),
  });

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      (c.address && c.address.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Customer Geographic Map"
          subtitle="Mapbox spatial distribution of retail and membership accounts"
        />
        <button
          type="button"
          onClick={() => refetch()}
          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Map Canvas (8 cols) */}
        <div className="lg:col-span-8">
          <CustomerMap
            customers={filtered}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={(c: MapCustomer) => setSelectedCustomerId(c.id)}
            height="620px"
          />
        </div>

        {/* Directory Sidebar (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col h-[620px] overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers by name, phone..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Showing <b>{filtered.length}</b> customer locations
            </p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading customers...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No customers found</div>
            ) : (
              filtered.map((c) => {
                const isSelected = selectedCustomerId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`p-3 rounded-xl cursor-pointer transition border text-left space-y-1 ${
                      isSelected
                        ? 'bg-emerald-50/60 border-emerald-200 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{c.fullName}</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {c.customerType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{c.address || 'Address on file'}</span>
                    </p>
                    <p className="text-[11px] text-blue-600 font-medium">📞 {c.phone}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
