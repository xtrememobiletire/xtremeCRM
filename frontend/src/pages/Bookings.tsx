import { useState } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import VerifyAddressModal from '../components/bookings/VerifyAddressModal';
import EmptyState from '../components/ui/EmptyState';
import { jobService } from '../services/jobService';
import { useTenant } from '../context/TenantContext';
import { toast } from 'sonner';

export default function Bookings() {
  const queryClient = useQueryClient();
  const { country: tenantCountry } = useTenant();
  const [selectedCountry, setSelectedCountry] = useState<string>(tenantCountry || 'CA');
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

  const handleCancel = (booking: any) => {
    if (confirm(`Are you sure you want to reject/cancel booking #${booking.jobCode || booking.jobNumber}?`)) {
      cancelMutation.mutate(booking.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Regional Filter */}
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

        <div className="flex items-center gap-3">
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

      {/* Info Notice Banner */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
        <AlertTriangle size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Two-Step Address Verification Active:</span>
          <p className="text-blue-800 mt-0.5">
            Public website forms submit un-geocoded customer text to protect Mapbox tokens. Call the customer to confirm their location, then click <strong>"Verify Address"</strong> to select the canonical Mapbox address and release the job to the active Dispatch queue.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-3">
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
          {rawBookings.length} pending verification in {selectedCountry}
        </div>
      </div>

      {/* Bookings Feed */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
            Loading {selectedCountry} website bookings...
          </div>
        ) : rawBookings.length === 0 ? (
          <div className="p-12 bg-white rounded-xl border border-slate-200">
            <EmptyState
              title="All Website Bookings Verified"
              description={`There are currently zero unverified public bookings in region ${selectedCountry}.`}
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
        ) : (
          rawBookings.map((b: any) => {
            const customerName = b.recipientName || b.customer?.fullName || 'Online Customer';
            const customerPhone = b.recipientPhone || b.customer?.phone || 'No Phone';
            const rawAddress = b.serviceAddress || b.locationAddress || 'No address provided';

            return (
              <div
                key={b.id}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Booking Details */}
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {b.jobCode || b.jobNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold tracking-wide">
                      UNVERIFIED PUBLIC
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      <span>{new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <User size={13} className="text-slate-400" />
                      <span>{customerName}</span>
                    </div>

                    <a
                      href={`tel:${customerPhone}`}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-mono font-semibold"
                    >
                      <Phone size={13} />
                      <span>{customerPhone}</span>
                    </a>

                    {b.vehicle && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <Car size={13} />
                        <span>{b.vehicle.year} {b.vehicle.make} {b.vehicle.model}</span>
                      </div>
                    )}
                  </div>

                  {/* Raw Address */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-start gap-1.5 text-slate-700">
                      <MapPin size={14} className="text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-500 text-[10px] uppercase block">Raw Customer Address:</span>
                        <span className="font-medium text-slate-900">{rawAddress}</span>
                        {b.problemNotes && (
                          <p className="text-slate-500 text-[11px] mt-0.5 italic">"{b.problemNotes}"</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex sm:flex-col md:flex-row items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCancel(b)}
                    disabled={cancelMutation.isPending}
                    className="btn-secondary px-3 py-2 text-xs flex items-center gap-1 text-rose-600 hover:bg-rose-50 hover:border-rose-200 cursor-pointer w-full sm:w-auto justify-center"
                  >
                    <XCircle size={14} />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerifyBooking(b)}
                    className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5 shadow-xs cursor-pointer w-full sm:w-auto justify-center"
                  >
                    <CheckCircle2 size={14} />
                    <span>Verify Address</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Verify Address Modal */}
      {verifyBooking && (
        <VerifyAddressModal
          isOpen={Boolean(verifyBooking)}
          onClose={() => setVerifyBooking(null)}
          booking={verifyBooking}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['bookings-queue'] });
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
          }}
        />
      )}
    </div>
  );
}
