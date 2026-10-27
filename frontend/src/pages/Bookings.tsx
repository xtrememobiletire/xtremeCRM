import { useState, useMemo, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Globe, 
  MapPin, 
  Phone, 
  User, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Car,
  Mail,
  Copy,
  LayoutList,
  LayoutGrid
} from 'lucide-react';
const VerifyAddressModal = lazy(() => import('../components/bookings/VerifyAddressModal'));
import EmptyState from '../components/ui/EmptyState';
import { jobService } from '../services/jobService';
import { useTenant } from '../context/TenantContext';
import { toast } from 'sonner';
import { formatDate, formatTimeInTz, getDefaultTimezoneForCountry, PKT_TIMEZONE } from '../utils/date';

export type BookingCategoryTab = 'ALL' | 'PUBLIC_WEB' | 'MEMBER' | 'FLEET';
export type ViewMode = 'table' | 'cards';

function parseBookingDetails(b: any) {
  const customerName = b.recipientName || b.customer?.fullName || (b.fleet ? b.fleet.name : 'Online Customer');
  const customerPhone = b.recipientPhone || b.customer?.phone || (b.fleet ? b.fleet.phone : 'No Phone');
  const rawAddress = b.serviceAddress || b.locationAddress || 'No address provided';

  // Extract email if in notes or direct fields
  let email = b.customer?.email || b.email || '';
  let cleanNotes = b.problemNotes || '';
  
  if (!email && cleanNotes) {
    const emailMatch = cleanNotes.match(/Customer Email:\s*([^\s\r\n]+)/i) || cleanNotes.match(/Email:\s*([^\s\r\n]+)/i);
    if (emailMatch) {
      email = emailMatch[1];
    }
  }

  // Clean up notes so raw email or repetitive prefixes don't clutter the notes
  if (cleanNotes) {
    cleanNotes = cleanNotes
      .replace(/Customer Email:\s*[^\s\r\n]+/gi, '')
      .replace(/Time Preference:\s*[^\r\n]+/gi, '')
      .trim();
  }

  const vehicleStr = b.vehicle
    ? `${b.vehicle.year || ''} ${b.vehicle.make} ${b.vehicle.model}`.trim()
    : b.vehicleMakeModel || '';

  const tireSize = b.vehicle?.tireSize || b.tireSize || '';
  const plate = b.vehicle?.licensePlate || b.licensePlate || '';
  const unitNumber = b.vehicle?.unitNumber || b.unitNumber || '';

  return {
    customerName,
    customerPhone,
    rawAddress,
    email,
    cleanNotes,
    vehicleStr,
    tireSize,
    plate,
    unitNumber,
  };
}

export default function Bookings() {
  const queryClient = useQueryClient();
  const { country: tenantCountry } = useTenant();
  const [selectedCountry, setSelectedCountry] = useState<string>(tenantCountry || 'CA');
  const [activeCategoryTab, setActiveCategoryTab] = useState<BookingCategoryTab>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [verifyBooking, setVerifyBooking] = useState<any>(null);

  // 1. Fetch Inbound Website Bookings (status: UNVERIFIED_PUBLIC)
  const {
    data: bookingsResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['bookings-queue', selectedCountry, search, page],
    queryFn: () =>
      jobService.getJobs({
        page,
        limit: 25,
        countryCode: selectedCountry,
        status: 'UNVERIFIED_PUBLIC',
        search: search || undefined,
      }),
    refetchInterval: 15000, // Poll every 15s for incoming website bookings
  });

  // 2. Reject / Cancel Booking Mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => jobService.updateJobStatus(id, 'CANCELLED'),
    onSuccess: () => {
      toast.success('Booking cancelled and removed from triage queue');
      queryClient.invalidateQueries({ queryKey: ['bookings-queue'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    },
  });

  const rawBookings = bookingsResponse?.data || [];

  const counts = useMemo(() => {
    let publicWeb = 0;
    let member = 0;
    let fleet = 0;

    for (const b of rawBookings) {
      if (b.source === 'MEMBER_PORTAL' || b.customer?.customerType === 'MEMBERSHIP') {
        member++;
      } else if (b.source === 'FLEET_PORTAL' || Boolean(b.fleetId)) {
        fleet++;
      } else {
        publicWeb++;
      }
    }

    return {
      all: rawBookings.length,
      publicWeb,
      member,
      fleet,
    };
  }, [rawBookings]);

  const filteredBookings = useMemo(() => {
    return rawBookings.filter((b: any) => {
      const isMember = b.source === 'MEMBER_PORTAL' || b.customer?.customerType === 'MEMBERSHIP';
      const isFleet = b.source === 'FLEET_PORTAL' || Boolean(b.fleetId);
      if (activeCategoryTab === 'PUBLIC_WEB') return !isMember && !isFleet;
      if (activeCategoryTab === 'MEMBER') return isMember;
      if (activeCategoryTab === 'FLEET') return isFleet;
      return true;
    });
  }, [rawBookings, activeCategoryTab]);

  const handleCancel = (booking: any) => {
    if (confirm(`Are you sure you want to reject/cancel booking #${booking.jobCode || booking.jobNumber}?`)) {
      cancelMutation.mutate(booking.id);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}: ${text}`);
  };

  return (
    <div className="space-y-6">
      {/* Header with Regional Filter & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
              <Globe size={22} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Website Form Inbound Bookings
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Triage queue for public website requests • Confirm customer address via Mapbox before dispatch
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Table / Cards View Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View (Fast & Compact)"
            >
              <LayoutList size={14} />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Cards View (Detailed Cards)"
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          {/* Regional Country Selector */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            {(['CA', 'US', 'UK'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setSelectedCountry(c);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  selectedCountry === c
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            title="Refresh Bookings"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search Bar & Category Tabs */}
      <div className="space-y-3">
        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search booking code, phone, address..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          <div className="text-xs font-semibold text-slate-500 font-mono">
            {filteredBookings.length} {activeCategoryTab !== 'ALL' ? 'matching' : 'pending verification'} in {selectedCountry}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto select-none">
          {[
            { id: 'ALL' as const, label: 'All Bookings', count: counts.all },
            { id: 'PUBLIC_WEB' as const, label: 'Public Web', count: counts.publicWeb },
            { id: 'MEMBER' as const, label: 'VIP Members', count: counts.member },
            { id: 'FLEET' as const, label: 'Fleet Accounts', count: counts.fleet },
          ].map((tab) => {
            const isSelected = activeCategoryTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategoryTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center ${
                      isSelected
                        ? 'bg-slate-100 text-slate-800'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bookings Feed */}
      <div>
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
            Loading {selectedCountry} website bookings...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 bg-white rounded-xl border border-slate-200">
            <EmptyState
              title={
                activeCategoryTab === 'ALL'
                  ? 'All Requests & Bookings Verified'
                  : `No ${activeCategoryTab === 'MEMBER' ? 'VIP Member' : activeCategoryTab === 'FLEET' ? 'Fleet Account' : 'Public Web'} Requests`
              }
              description={
                activeCategoryTab === 'ALL'
                  ? `There are currently zero unverified bookings in region ${selectedCountry}.`
                  : `There are currently zero unverified ${activeCategoryTab === 'MEMBER' ? 'VIP member' : activeCategoryTab === 'FLEET' ? 'fleet account' : 'public website'} requests in region ${selectedCountry}.`
              }
              action={
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs cursor-pointer"
                >
                  Refresh Queue
                </button>
              }
            />
          </div>
        ) : viewMode === 'table' ? (
          /* ========================================================================= */
          /* TABLE VIEW: Compact, High-Density, Perfectly Aligned for Quick Scanning   */
          /* ========================================================================= */
          <div className="table-container shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-th w-[210px]">Booking / Source</th>
                  <th className="table-th w-[220px]">Promised Window</th>
                  <th className="table-th w-[220px]">Customer & Contact</th>
                  <th className="table-th w-[200px]">Vehicle & Tire</th>
                  <th className="table-th">Service Location</th>
                  <th className="table-th text-right w-[190px] sticky right-0 bg-slate-50/95 backdrop-blur-xs shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)] z-10">Triage Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b: any) => {
                  const details = parseBookingDetails(b);
                  const jobTz = b.serviceTimezone || getDefaultTimezoneForCountry(b.countryCode || selectedCountry);
                  const code = b.jobCode || b.jobNumber;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Booking / Source */}
                      <td className="table-td align-top">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {code}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(code, 'Booking code')}
                              className="text-slate-400 hover:text-slate-700 transition"
                              title="Copy code"
                            >
                              <Copy size={11} />
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-1">
                            {b.source === 'MEMBER_PORTAL' || b.customer?.customerType === 'MEMBERSHIP' ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-300">
                                VIP Member
                              </span>
                            ) : b.source === 'FLEET_PORTAL' || b.fleetId ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-blue-100 text-blue-900 border border-blue-300">
                                Fleet: {b.fleet?.name || 'Commercial'}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-purple-100 text-purple-900 border border-purple-200">
                                Web Inbound
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              Awaiting Triage
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-400 font-mono">
                            {formatDate(b.createdAt, jobTz)}
                          </div>
                        </div>
                      </td>

                      {/* 2. Promised Window (Dual Timezone) */}
                      <td className="table-td align-top">
                        {b.arrivalWindowStart || b.appointmentDate ? (
                          <div className="space-y-1.5">
                            <div className="text-xs font-bold text-slate-900 flex items-start gap-1.5">
                              <Clock size={13} className="text-blue-600 shrink-0 mt-0.5" />
                              <div>
                                <div>{formatDate(b.arrivalWindowStart || b.appointmentDate, jobTz)}</div>
                                {b.arrivalWindowEnd && (
                                  <div className="text-[11px] text-slate-500 font-mono">
                                    Window: {formatTimeInTz(b.arrivalWindowStart || b.appointmentDate, jobTz)} – {formatTimeInTz(b.arrivalWindowEnd, jobTz)}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span>PKT: {formatTimeInTz(b.arrivalWindowStart || b.appointmentDate, PKT_TIMEZONE)}</span>
                              {b.arrivalWindowEnd && <span>– {formatTimeInTz(b.arrivalWindowEnd, PKT_TIMEZONE)}</span>}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 font-mono">ASAP / Urgent Dispatch</div>
                        )}
                      </td>

                      {/* 3. Customer & Contact */}
                      <td className="table-td align-top">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <User size={13} className="text-slate-400 shrink-0" />
                            <span>{details.customerName}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${details.customerPhone}`}
                              className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <Phone size={11} />
                              <span>{details.customerPhone}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(details.customerPhone, 'Phone number')}
                              className="text-slate-400 hover:text-slate-700 transition p-0.5"
                              title="Copy phone"
                            >
                              <Copy size={11} />
                            </button>
                          </div>

                          {details.email && (
                            <a
                              href={`mailto:${details.email}`}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 hover:underline truncate max-w-[200px]"
                              title={details.email}
                            >
                              <Mail size={11} className="shrink-0 text-slate-400" />
                              <span className="truncate">{details.email}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* 4. Vehicle & Tire */}
                      <td className="table-td align-top">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-xs">
                            <Car size={13} className="text-slate-500 shrink-0" />
                            <span>{details.vehicleStr || 'Vehicle Pending'}</span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {details.plate && (
                              <span className="font-mono font-bold bg-slate-100 border border-slate-300 text-slate-800 px-1.5 py-0.2 rounded text-[10px]">
                                {details.plate}
                              </span>
                            )}
                            {details.unitNumber && (
                              <span className="font-bold text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-800 border border-blue-200 rounded">
                                Unit {details.unitNumber}
                              </span>
                            )}
                            {details.tireSize && (
                              <span className="font-mono text-red-700 font-bold text-[10px] bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                                {details.tireSize}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 5. Service Location & Notes */}
                      <td className="table-td align-top">
                        <div className="space-y-1">
                          <div className="flex items-start gap-1.5 text-xs text-slate-900 font-medium">
                            <MapPin size={13} className="text-red-600 shrink-0 mt-0.5" />
                            <span className="leading-snug">{details.rawAddress}</span>
                          </div>

                          {details.cleanNotes && (
                            <div className="mt-1 text-[11px] text-slate-600 italic bg-slate-50 border border-slate-200/60 px-2 py-1 rounded-md">
                              "{details.cleanNotes}"
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 6. Triage Action */}
                      <td className="table-td align-top text-right sticky right-0 bg-white/95 group-hover:bg-slate-50/95 backdrop-blur-xs shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)] z-10">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleCancel(b)}
                            disabled={cancelMutation.isPending}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer flex items-center gap-1"
                            title="Reject Booking"
                          >
                            <XCircle size={13} />
                            <span>Reject</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setVerifyBooking(b)}
                            className="btn-primary px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                          >
                            <CheckCircle2 size={13} />
                            <span>Verify Address</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ========================================================================= */
          /* CARDS VIEW: Modern, Structured Grid Cards (No Clutter)                    */
          /* ========================================================================= */
          <div className="space-y-4">
            {filteredBookings.map((b: any) => {
              const details = parseBookingDetails(b);
              const jobTz = b.serviceTimezone || getDefaultTimezoneForCountry(b.countryCode || selectedCountry);
              const code = b.jobCode || b.jobNumber;

              return (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-4"
                >
                  {/* Top Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {code}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(code, 'Booking code')}
                        className="text-slate-400 hover:text-slate-700 transition"
                        title="Copy code"
                      >
                        <Copy size={12} />
                      </button>

                      {b.source === 'MEMBER_PORTAL' || b.customer?.customerType === 'MEMBERSHIP' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold uppercase tracking-wide">
                          VIP Member Request
                        </span>
                      ) : b.source === 'FLEET_PORTAL' || b.fleetId ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-extrabold uppercase tracking-wide">
                          Fleet: {b.fleet?.name || 'Commercial Account'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-bold tracking-wide">
                          Website Inbound
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                        Awaiting Triage
                      </span>

                      <span className="text-[11px] text-slate-400 font-mono ml-1">
                        Received: {formatDate(b.createdAt, jobTz)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleCancel(b)}
                        disabled={cancelMutation.isPending}
                        className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1 text-rose-600 hover:bg-rose-50 hover:border-rose-200 cursor-pointer"
                      >
                        <XCircle size={13} />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setVerifyBooking(b)}
                        className="btn-primary px-3.5 py-1.5 text-xs flex items-center gap-1.5 shadow-xs cursor-pointer font-bold"
                      >
                        <CheckCircle2 size={13} />
                        <span>Verify Address</span>
                      </button>
                    </div>
                  </div>

                  {/* 3-Column Structured Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Col 1: Timing & Window */}
                    <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Promised Arrival Window
                      </span>
                      {b.arrivalWindowStart || b.appointmentDate ? (
                        <div className="space-y-2">
                          <div className="flex items-start gap-1.5 text-slate-900 font-bold">
                            <Clock size={13} className="text-blue-600 shrink-0 mt-0.5" />
                            <div>
                              <div>Customer: {formatDate(b.arrivalWindowStart || b.appointmentDate, jobTz)}</div>
                              {b.arrivalWindowEnd && (
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {formatTimeInTz(b.arrivalWindowStart || b.appointmentDate, jobTz)} – {formatTimeInTz(b.arrivalWindowEnd, jobTz)}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span>PKT: {formatTimeInTz(b.arrivalWindowStart || b.appointmentDate, PKT_TIMEZONE)}</span>
                            {b.arrivalWindowEnd && <span>– {formatTimeInTz(b.arrivalWindowEnd, PKT_TIMEZONE)}</span>}
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-500 italic">No scheduled window (Urgent Roadside)</div>
                      )}
                    </div>

                    {/* Col 2: Customer & Vehicle */}
                    <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Customer & Vehicle
                      </span>
                      <div className="space-y-1.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" />
                          <span>{details.customerName}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${details.customerPhone}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-mono font-semibold"
                          >
                            <Phone size={12} />
                            <span>{details.customerPhone}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(details.customerPhone, 'Phone number')}
                            className="text-slate-400 hover:text-slate-700 transition"
                            title="Copy phone"
                          >
                            <Copy size={11} />
                          </button>
                        </div>

                        {details.email && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] truncate">
                            <Mail size={12} className="shrink-0 text-slate-400" />
                            <a href={`mailto:${details.email}`} className="truncate hover:underline">
                              {details.email}
                            </a>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-slate-700 pt-1 border-t border-slate-200/60 flex-wrap">
                          <Car size={13} className="text-slate-500" />
                          <span className="font-semibold">{details.vehicleStr || 'Vehicle TBD'}</span>
                          {details.plate && (
                            <span className="font-mono font-bold bg-white px-1.5 py-0.2 border border-slate-300 rounded text-[10px]">
                              {details.plate}
                            </span>
                          )}
                          {details.tireSize && (
                            <span className="font-mono text-red-700 font-bold bg-red-50 border border-red-200 px-1 rounded text-[10px]">
                              {details.tireSize}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Col 3: Service Location & Notes */}
                    <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Service Location & Notes
                      </span>
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-1.5 text-slate-900 font-medium">
                          <MapPin size={13} className="text-red-600 shrink-0 mt-0.5" />
                          <span className="leading-snug">{details.rawAddress}</span>
                        </div>

                        {details.cleanNotes && (
                          <div className="text-[11px] text-slate-600 italic bg-white border border-slate-200/70 p-2 rounded-lg">
                            "{details.cleanNotes}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Verify Address Modal */}
      {verifyBooking && (
        <Suspense fallback={null}>
          <VerifyAddressModal
            isOpen={Boolean(verifyBooking)}
            onClose={() => setVerifyBooking(null)}
            booking={verifyBooking}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['bookings-queue'] });
              queryClient.invalidateQueries({ queryKey: ['jobs'] });
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
