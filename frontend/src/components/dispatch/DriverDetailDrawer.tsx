import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Truck,
  Phone,
  MapPin,
  Calendar,
  Power,
  Edit3,
  Clock,
} from 'lucide-react';
import { type UserItem, userService } from '../../services/userService';
import { jobService, type JobItem } from '../../services/jobService';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import EditDriverForm from './EditDriverForm';

interface DriverDetailDrawerProps {
  driver: UserItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDutyToggled?: () => void;
  onDriverUpdated?: (updated: UserItem) => void;
}

/**
 * Show a selected driver's profile, duty controls, and up to 50 dispatched jobs
 * when open; earnings and cash metrics use only completed jobs in that result.
 */
export default function DriverDetailDrawer({
  driver,
  isOpen,
  onClose,
  onDutyToggled,
  onDriverUpdated,
}: DriverDetailDrawerProps) {
  const { user } = useAuth();
  const { currencySymbol } = useTenant();
  const [isToggling, setIsToggling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Check if current user can edit drivers (Admin, GM, or Dispatcher)
  const canEdit =
    user?.role === 'ADMIN' ||
    user?.role === 'GENERAL_MANAGER' ||
    user?.role === 'DISPATCHER';

  // Fetch this driver's dispatched job history
  const {
    data: jobsResponse,
    isLoading: isLoadingJobs,
    refetch: refetchJobs,
  } = useQuery({
    queryKey: ['driver-jobs', driver?.id],
    queryFn: () => jobService.getJobs({ driverId: driver!.id, limit: 50 }),
    enabled: isOpen && !!driver?.id,
  });

  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Close on Escape key press (stabilized via ref)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus management: move focus into dialog when opened, restore previous focus when closed
  useEffect(() => {
    if (!isOpen) return;
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      previousActiveElementRef.current?.focus();
    };
  }, [isOpen]);

  const jobs: JobItem[] = jobsResponse?.data || [];

  if (!isOpen || !driver) return null;

  const isOnDuty = Boolean(driver.isAgentActive);

  /**
   * Save the opposite duty state and notify onDutyToggled on success;
   * request failures are shown as error toasts.
   */
  const handleToggleDuty = async () => {
    try {
      setIsToggling(true);
      const nextState = !isOnDuty;
      await userService.updateUser(driver.id, { isAgentActive: nextState });
      toast.success(`${driver.fullName} is now ${nextState ? 'On-Duty' : 'Off-Duty'}`);
      onDutyToggled?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update driver status');
    } finally {
      setIsToggling(false);
    }
  };

  // Calculate driver stats
  const completedJobs = jobs.filter((j) => j.status === 'COMPLETED');
  const totalEarnedCents = completedJobs.reduce((sum, j) => sum + (j.repairerFeeCents || 0), 0);
  const totalCashCollectedCents = completedJobs.reduce((sum, j) => sum + (j.cashCollectedCents || 0), 0);

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="driver-drawer-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden cursor-default focus:outline-none"
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="driver-drawer-title" className="text-base font-bold text-slate-900 truncate">
                  {driver.fullName}
                </h2>
                <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">
                  {driver.countryCode}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isOnDuty
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{driver.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer"
                title="Edit Details"
              >
                <Edit3 size={13} />
                <span>Edit</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {isEditing ? (
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90">
              <EditDriverForm
                driver={driver}
                onSuccess={(updated) => {
                  setIsEditing(false);
                  onDriverUpdated?.(updated);
                }}
                onCancel={() => setIsEditing(false)}
              />
            </div>
          ) : (
            <>
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                    Total Jobs
                  </span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">{jobs.length}</span>
                  <span className="text-[10px] text-slate-500 font-medium">Dispatched</span>
                </div>
                <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider block">
                    Completed
                  </span>
                  <span className="text-base font-black text-emerald-800 mt-0.5 block">
                    {completedJobs.length}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">Delivered</span>
                </div>
                <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200/80">
                  <span className="text-[10px] font-bold uppercase text-blue-700 tracking-wider block">
                    Labor Fee
                  </span>
                  <span className="text-base font-black text-blue-900 mt-0.5 block font-mono">
                    {currencySymbol}{(totalEarnedCents / 100).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-blue-600 font-medium">Earned payout</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                    Cash in Hand
                  </span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block font-mono">
                    {currencySymbol}{(totalCashCollectedCents / 100).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Field cash</span>
                </div>
              </div>

              {/* Profile & Vehicle Info */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Driver Profile & Assigned Unit
                  </span>
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 size={11} />
                        <span>Edit</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={handleToggleDuty}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        isOnDuty
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      <Power size={12} />
                      <span>{isOnDuty ? 'Set Off Duty' : 'Set On Duty'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/70 text-slate-700">
                  <div className="flex items-center gap-2">
                    <Truck size={13} className="text-slate-400 shrink-0" />
                    <span className="font-medium truncate">
                      Rig: <strong>{driver.assignedVehicle || 'Mobile Service Rig'}</strong>
                    </span>
                  </div>
                  {driver.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      <a
                        href={`tel:${driver.phone}`}
                        className="font-mono text-blue-600 hover:underline font-semibold"
                      >
                        {driver.phone}
                      </a>
                    </div>
                  )}
                  {driver.address && (
                    <div className="flex items-center gap-2 col-span-2">
                      <MapPin size={13} className="text-rose-500 shrink-0" />
                      <span className="truncate">{driver.address}</span>
                    </div>
                  )}
                  {driver.workingDays && (
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">Days: {driver.workingDays}</span>
                    </div>
                  )}
                  {driver.workingHours && (
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">Hours: {driver.workingHours}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Dispatched Job History */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <span className="font-bold text-slate-900 text-xs">
                  Dispatched Job History ({jobs.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => refetchJobs()}
                className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Refresh History
              </button>
            </div>

            {isLoadingJobs ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                Loading job history...
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                No jobs dispatched to this technician yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-0.5">
                {jobs.map((job) => {
                  const isCompleted = job.status === 'COMPLETED';
                  const customerName =
                    job.customer?.fullName || job.customer?.name || job.recipientName || 'Valued Motorist';
                  const dateStr = job.createdAt
                    ? new Date(job.createdAt).toLocaleDateString()
                    : 'Recent';

                  return (
                    <div
                      key={job.id}
                      className="p-3 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200/90 transition shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {job.jobNumber || job.jobCode}
                          </span>
                          <span className="text-[10px] text-slate-400">{dateStr}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : job.status === 'IN_PROGRESS' || job.status === 'EN_ROUTE'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : job.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600 gap-2">
                        <span className="font-semibold text-slate-800 truncate">
                          {customerName}
                        </span>
                        <span className="font-mono font-bold text-slate-900 shrink-0">
                          {currencySymbol}{((job.totalCents || job.totalAmount || 0) / 100).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="truncate max-w-[280px]">
                          {job.serviceAddress || job.locationAddress || 'Roadside Dispatch'}
                        </span>
                        {job.repairerFeeCents ? (
                          <span className="text-emerald-700 font-semibold font-mono shrink-0">
                            Labor: {currencySymbol}{(job.repairerFeeCents / 100).toFixed(2)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
