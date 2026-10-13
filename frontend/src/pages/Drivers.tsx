import { useState, useMemo } from 'react';
import {
  Truck,
  Search,
  Plus,
  RefreshCw,
  Power,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userService, type UserItem } from '../services/userService';
import AddDriverModal from '../components/dispatch/AddDriverModal';
import DriverDetailDrawer from '../components/dispatch/DriverDetailDrawer';

/**
 * Render driver profiles filtered by region, type, and search, with creation,
 * duty controls, and a profile/job-history drawer.
 */
export default function Drivers() {
  const queryClient = useQueryClient();

  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INTERNAL' | 'EXTERNAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<UserItem | null>(null);
  const [togglingDriverId, setTogglingDriverId] = useState<string | null>(null);

  // Fetch Drivers across all regions or active tenant
  const {
    data: rawDrivers = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery<UserItem[]>({
    queryKey: ['drivers', regionFilter],
    queryFn: () => userService.getDrivers(regionFilter === 'ALL' ? undefined : (regionFilter as any)),
  });

  // Filtered Drivers
  const filteredDrivers = useMemo(() => {
    return rawDrivers.filter((d) => {
      // Region filter
      if (regionFilter !== 'ALL' && d.countryCode !== regionFilter) return false;

      // Internal vs External type filter
      const isExt = d.assignedVehicle === 'EXTERNAL_CONTRACTOR' || d.assignedVehicle?.startsWith('EXTERNAL');
      if (typeFilter === 'INTERNAL' && isExt) return false;
      if (typeFilter === 'EXTERNAL' && !isExt) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = d.fullName.toLowerCase().includes(q);
        const matchesPhone = d.phone?.toLowerCase().includes(q);
        const matchesVehicle = d.assignedVehicle?.toLowerCase().includes(q);
        const matchesAddress = d.address?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesVehicle && !matchesAddress) return false;
      }
      return true;
    });
  }, [rawDrivers, regionFilter, typeFilter, searchQuery]);

  // Toggle On-Duty presence
  /**
   * Stop the card click, save the opposite duty state, refresh drivers, and update
   * the selected profile when it matches. Request failures become error toasts.
   */
  const handleToggleDuty = async (e: React.MouseEvent, driver: UserItem) => {
    e.stopPropagation(); // prevent opening drawer when clicking toggle
    try {
      setTogglingDriverId(driver.id);
      const nextState = !driver.isAgentActive;
      await userService.updateUser(driver.id, { isAgentActive: nextState });
      toast.success(`${driver.fullName} is now ${nextState ? 'On-Duty' : 'Off-Duty'}`);
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      if (selectedDriver?.id === driver.id) {
        setSelectedDriver({ ...selectedDriver, isAgentActive: nextState });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update driver status');
    } finally {
      setTogglingDriverId(null);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-16 px-1 sm:px-2">
      {/* 1. Header (Clean, minimal, no subtitles) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Drivers & Technicians
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {filteredDrivers.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition cursor-pointer disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Driver</span>
          </button>
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Region Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto select-none">
            {[
              { id: 'ALL', label: 'All Regions' },
              { id: 'CA', label: 'Canada (CA)' },
              { id: 'US', label: 'United States (US)' },
              { id: 'UK', label: 'United Kingdom (UK)' },
            ].map((tab) => {
              const isSelected = regionFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRegionFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Type Filter (Internal vs External) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl select-none">
            {[
              { id: 'ALL', label: 'All Types' },
              { id: 'INTERNAL', label: 'Internal Fleet' },
              { id: 'EXTERNAL', label: 'External Contractors' },
            ].map((tab) => {
              const isSelected = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    isSelected
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search driver by name, rig, phone..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      {/* 3. Driver Cards Grid (Clicking card opens Slide-Over Drawer) */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
          Loading technicians...
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center">
          <Truck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900">No technicians found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery
              ? 'No driver matches your search query.'
              : 'Add your first technician to start dispatching jobs.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredDrivers.map((driver) => {
            const isOnDuty = Boolean(driver.isAgentActive);
            const isToggling = togglingDriverId === driver.id;
            const isExternal = driver.assignedVehicle === 'EXTERNAL_CONTRACTOR' || driver.assignedVehicle?.startsWith('EXTERNAL');

            return (
              <div
                key={driver.id}
                onClick={() => setSelectedDriver(driver)}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between hover:border-slate-300 transition-all space-y-3 cursor-pointer group"
              >
                {/* Header: Driver Name, Region, Duty Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                      <Truck className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {driver.fullName}
                        </h3>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[9px] font-bold shrink-0">
                          {driver.countryCode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {isExternal ? (driver.phone || 'External Contractor') : driver.email}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {isExternal ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-200 bg-blue-50 text-blue-700 shrink-0">
                      EXTERNAL
                    </span>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors shrink-0 ${
                        isOnDuty
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
                    </span>
                  )}
                </div>

                {/* Rig and Contact Info */}
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[10px] text-slate-400">{isExternal ? 'Contractor:' : 'Rig:'}</span>
                    <strong className="text-slate-800 font-semibold truncate max-w-[170px] text-[11px]">
                      {isExternal
                        ? (driver.assignedVehicle?.replace(/^EXTERNAL:\s*/, '') || 'Outsourced Contractor')
                        : (driver.assignedVehicle || 'Mobile Service Rig')}
                    </strong>
                  </div>

                  {driver.phone && (
                    <div className="flex items-center justify-between text-slate-600 border-t border-slate-200/60 pt-1">
                      <span className="text-[10px] text-slate-400">Phone:</span>
                      <span className="font-mono text-slate-700 text-[11px] font-medium">
                        {driver.phone}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Bar: Quick Duty Toggle & Job History Indicator */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={(e) => handleToggleDuty(e, driver)}
                    className={`py-1 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                      isOnDuty
                        ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <Power size={11} />
                    <span>{isOnDuty ? 'Set Off Duty' : 'Set On Duty'}</span>
                  </button>

                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">
                    <span>History & Profile</span>
                    <ChevronRight size={13} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Driver Detail Drawer */}
      {selectedDriver && (
        <DriverDetailDrawer
          driver={selectedDriver}
          isOpen={Boolean(selectedDriver)}
          onClose={() => setSelectedDriver(null)}
          onDutyToggled={() => {
            refetch();
            setSelectedDriver((prev: any) => (prev ? { ...prev, isAgentActive: !prev.isAgentActive } : null));
          }}
          onDriverUpdated={(updated) => {
            refetch();
            setSelectedDriver(updated);
          }}
        />
      )}

      {/* Add Driver Modal */}
      {isAddModalOpen && (
        <AddDriverModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
