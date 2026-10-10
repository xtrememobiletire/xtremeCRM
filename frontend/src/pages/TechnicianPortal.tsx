import { useState, useEffect } from 'react';
import { 
  MapPin, 
  Phone, 
  MessageSquare, 
  CheckCircle, 
  Disc, 
  XCircle,
  ShieldCheck,
  Check,
  Clock,
  Zap,
  CreditCard,
  Banknote,
  Smartphone,
  Camera,
  Image as ImageIcon,
  Eye,
  CheckCircle2,
  Calendar,
  Car,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { jobService, type JobItem } from '../services/jobService';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { formatCurrency, centsToDollars } from '../utils/currency';
import { formatDate } from '../utils/date';
import { toast } from 'sonner';
import JobChatModal from '../components/dispatch/JobChatModal';
import { useUpdateJobStatus } from '../hooks/useJobs';
import { useSocket } from '../context/SocketContext';
import TechnicianMap from '../components/maps/TechnicianMap';

export default function TechnicianPortal() {
  const { user } = useAuth();
  const { currencySymbol } = useTenant();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [chatJob, setChatJob] = useState<JobItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'POS' | 'E_TRANSFER'>('CASH');
  const [amountInput, setAmountInput] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);
  const [driverSelectedStatus, setDriverSelectedStatus] = useState<string | null>(null);

  const { socket } = useSocket();
  const updateStatusMutation = useUpdateJobStatus();

  // Fetch driver assigned jobs - strictly scoped to this driver without country restriction or background polling
  const { data: jobsResponse, refetch } = useQuery({
    queryKey: ['technician-jobs', user?.id],
    queryFn: () => jobService.getJobs({ limit: 10, driverId: user?.id }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // Socket.io instant sync for driver jobs
  useEffect(() => {
    if (!socket) return;
    const handleJobUpdate = () => refetch();
    socket.on('job:assigned', handleJobUpdate);
    socket.on('job:status_updated', handleJobUpdate);
    socket.on('notification:job_assigned', handleJobUpdate);
    return () => {
      socket.off('job:assigned', handleJobUpdate);
      socket.off('job:status_updated', handleJobUpdate);
      socket.off('notification:job_assigned', handleJobUpdate);
    };
  }, [socket, refetch]);

  const rawJobs = jobsResponse?.data || [];
  // Strict driver isolation: only show jobs where driverId matches current user ID
  const jobs = user?.id
    ? rawJobs.filter((j: any) => j.driverId === user.id || j.driver?.id === user.id)
    : rawJobs;

  // Categorize jobs
  const activeJob = jobs.find(
    (j) => j.status === 'ASSIGNED' || j.status === 'EN_ROUTE' || j.status === 'ON_SCENE' || j.status === 'IN_PROGRESS' || j.status === 'PENDING'
  );
  const completedJobs = jobs.filter((j) => j.status === 'COMPLETED');

  const requiredAmount = activeJob?.totalCents ? centsToDollars(activeJob.totalCents) : 0;

  useEffect(() => {
    setDriverSelectedStatus(null);
  }, [activeJob?.id]);

  // Pre-fill amount input if job already has charges
  useEffect(() => {
    if (activeJob && (activeJob.status === 'IN_PROGRESS' || activeJob.status === 'EN_ROUTE' || activeJob.status === 'ON_SCENE')) {
      if (!amountInput && requiredAmount > 0) {
        setAmountInput(requiredAmount.toFixed(2));
      }
    }
  }, [activeJob?.id, activeJob?.status, requiredAmount]);

  const handleUpdateStatus = (jobId: string, nextStatus: string, cashAmountCents?: number) => {
    setUpdatingId(jobId);
    updateStatusMutation.mutate(
      { id: jobId, status: nextStatus, cashAmountCents },
      {
        onSuccess: () => {
          toast.success(`Job marked as ${nextStatus.replace('_', ' ').toLowerCase()}`);
          if (nextStatus === 'COMPLETED') {
            setAmountInput('');
            setReceiptFile(null);
            setReceiptPreview(null);
            setValidationError(null);
          }
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to update job status');
        },
        onSettled: () => {
          setUpdatingId(null);
        },
      }
    );
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
      if (validationError) setValidationError(null);
    }
  };

  const handleCompleteJob = () => {
    if (!activeJob) return;
    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Please enter a valid payment amount greater than 0');
      toast.error('Payment amount is required');
      return;
    }

    if (requiredAmount > 0) {
      if (parsedAmount < requiredAmount) {
        const errorMsg = `Amount collected (${formatCurrency(parsedAmount, currencySymbol)}) cannot be less than required invoice total (${formatCurrency(requiredAmount, currencySymbol)})`;
        setValidationError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      if (parsedAmount > requiredAmount) {
        // If greater than required amount, write to default value
        setAmountInput(requiredAmount.toFixed(2));
      }
    }

    if ((paymentMethod === 'POS' || paymentMethod === 'E_TRANSFER') && !receiptFile) {
      const label = paymentMethod === 'POS' ? 'POS terminal slip photo' : 'E-Transfer confirmation screenshot';
      setValidationError(`Mandatory proof missing: Please attach a ${label}`);
      toast.error(`Receipt proof photo is required for ${paymentMethod.replace('_', ' ')}`);
      return;
    }

    const effectiveAmount = requiredAmount > 0 && parsedAmount > requiredAmount ? requiredAmount : parsedAmount;
    const cents = Math.round(effectiveAmount * 100);
    const formData = new FormData();
    formData.append('status', 'COMPLETED');
    formData.append('paymentMethod', paymentMethod);
    formData.append('amountCents', String(cents));
    if (paymentMethod === 'CASH') {
      formData.append('cashAmountCents', String(cents));
    }
    if (receiptFile) {
      formData.append('receipt', receiptFile);
    }

    setUpdatingId(activeJob.id);
    updateStatusMutation.mutate(
      { id: activeJob.id, formData },
      {
        onSuccess: () => {
          toast.success('Job marked as COMPLETED! Payment verification submitted.');
          setAmountInput('');
          setReceiptFile(null);
          setReceiptPreview(null);
          setValidationError(null);
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to complete job');
        },
        onSettled: () => {
          setUpdatingId(null);
        },
      }
    );
  };

  const currentStatus = driverSelectedStatus || activeJob?.status || 'PENDING';

  const handleDropdownStatusChange = (newStatus: string) => {
    if (!activeJob) return;

    if (newStatus === currentStatus) return;

    if (newStatus === 'COMPLETED') {
      if (activeJob.status === 'ASSIGNED' || activeJob.status === 'PENDING') {
        const errorMsg = 'Please accept the dispatch and record the collected payment before marking as completed';
        setValidationError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      const parsedAmount = parseFloat(amountInput);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        const errorMsg = 'Please enter the payment amount first before marking as Completed';
        setValidationError(errorMsg);
        toast.error(errorMsg);
        const section = document.getElementById('payment-capture-section');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
        const input = document.getElementById('driver-amount-input');
        if (input) (input as HTMLInputElement).focus();
        return;
      }

      if (requiredAmount > 0) {
        if (parsedAmount < requiredAmount) {
          const errorMsg = `Amount collected (${formatCurrency(parsedAmount, currencySymbol)}) cannot be less than required invoice total (${formatCurrency(requiredAmount, currencySymbol)})`;
          setValidationError(errorMsg);
          toast.error(errorMsg);
          const section = document.getElementById('payment-capture-section');
          if (section) section.scrollIntoView({ behavior: 'smooth' });
          const input = document.getElementById('driver-amount-input');
          if (input) (input as HTMLInputElement).focus();
          return;
        }
        if (parsedAmount > requiredAmount) {
          setAmountInput(requiredAmount.toFixed(2));
        }
      }

      if ((paymentMethod === 'POS' || paymentMethod === 'E_TRANSFER') && !receiptFile) {
        const label = paymentMethod === 'POS' ? 'POS terminal slip photo' : 'E-Transfer confirmation screenshot';
        const errorMsg = `Mandatory proof missing: Please attach a ${label}`;
        setValidationError(errorMsg);
        toast.error(`Receipt proof photo is required for ${paymentMethod.replace('_', ' ')}`);
        const section = document.getElementById('payment-capture-section');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      handleCompleteJob();
      return;
    }

    if (newStatus === 'CANCELLED') {
      const confirmed = window.confirm('Decline or cancel this active dispatch? Dispatcher will be notified.');
      if (confirmed) {
        handleUpdateStatus(activeJob.id, 'CANCELLED');
        setDriverSelectedStatus(null);
      }
      return;
    }

    setDriverSelectedStatus(newStatus);
    handleUpdateStatus(activeJob.id, newStatus);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Driver Portal</h1>
          <p className="text-xs text-slate-500 font-medium">Assigned work orders and field dispatch operations</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="btn-secondary text-xs px-3.5 py-1.5 cursor-pointer font-semibold"
        >
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Primary Active Job Card - Modern High-End Styling */}
      {activeJob ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          {/* Card Top Banner - Luxury Slate-900 Header with Emerald Accents */}
          <div className="bg-slate-900 px-5 py-4 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-sm bg-slate-800 text-emerald-400 px-2.5 py-1 rounded-lg border border-slate-700/60">
                #{activeJob.jobCode || activeJob.jobNumber}
              </span>
              <div className="relative inline-flex items-center">
                <select
                  aria-label="Update Driver Status"
                  value={currentStatus}
                  disabled={updatingId === activeJob.id}
                  onChange={(e) => handleDropdownStatusChange(e.target.value)}
                  className="appearance-none text-xs font-bold pl-3 pr-8 py-1.5 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700 hover:border-emerald-500/50 focus:border-emerald-500 focus:outline-none transition cursor-pointer disabled:opacity-50"
                >
                  <option value="PENDING" className="bg-slate-900 text-slate-200">Pending</option>
                  <option value="ASSIGNED" className="bg-slate-900 text-slate-200">Assigned</option>
                  <option value="EN_ROUTE" className="bg-slate-900 text-slate-200">En Route</option>
                  <option value="ON_SCENE" className="bg-slate-900 text-emerald-400 font-bold">Arrived on Location (On Scene)</option>
                  <option value="IN_PROGRESS" className="bg-slate-900 text-cyan-400">In Progress</option>
                  <option value="COMPLETED" className="bg-slate-900 text-emerald-400 font-bold">Completed</option>
                  <option value="CANCELLED" className="bg-slate-900 text-rose-400">Cancelled</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
              </div>
              {activeJob.urgency && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {activeJob.urgency}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setChatJob(activeJob)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dispatcher Chat</span>
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            {/* Timing Commitment Bar (Customer Promised SLA vs Technician Drive ETA) */}
            {(activeJob.arrivalWindowStart || activeJob.estimatedArrivalAt || (activeJob as any).driverEtaMinutes || (activeJob as any).driverEstimatedArrivalAt) && (
              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Customer Promised Window</span>
                    <strong className="text-slate-900 font-bold text-xs">
                      {activeJob.arrivalWindowStart && activeJob.arrivalWindowEnd
                        ? `${new Date(activeJob.arrivalWindowStart).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${new Date(activeJob.arrivalWindowEnd).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                        : activeJob.estimatedArrivalAt
                        ? `Promised ~${new Date(activeJob.estimatedArrivalAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                        : 'ASAP Roadside Response'}
                    </strong>
                  </div>
                </div>

                {((activeJob as any).driverEtaMinutes || (activeJob as any).driverEstimatedArrivalAt) && (
                  <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
                    <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[9px] uppercase font-bold text-emerald-700 block leading-tight">Your Travel ETA</span>
                      <strong className="text-emerald-900 font-bold font-mono text-xs">
                        {(activeJob as any).driverEtaMinutes ? `~${(activeJob as any).driverEtaMinutes} MINS` : new Date((activeJob as any).driverEstimatedArrivalAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Customer & Location Block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Customer Contact
                </span>
                <p className="text-base font-bold text-slate-900">
                  {activeJob.customer?.fullName || activeJob.recipientName || 'Roadside Motorist'}
                </p>
                <div className="pt-1">
                  <a
                    href={`tel:${activeJob.customer?.phone || activeJob.recipientPhone || ''}`}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call: {activeJob.customer?.phone || activeJob.recipientPhone || 'No Phone on file'}</span>
                  </a>
                </div>
              </div>

              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Breakdown Location & GPS Telemetry
                </span>
                <p className="text-xs font-semibold text-slate-800 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{activeJob.serviceAddress || activeJob.locationAddress || 'Address on file'}</span>
                </p>
                <div className="pt-2">
                  <TechnicianMap
                    address={activeJob.serviceAddress || activeJob.locationAddress || ''}
                    latitude={(activeJob as any).serviceLatitude}
                    longitude={(activeJob as any).serviceLongitude}
                    customerName={activeJob.customer?.fullName || activeJob.recipientName}
                    jobCode={activeJob.jobCode}
                    height="240px"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle & Tire Specifications */}
            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Vehicle Specification
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {activeJob.vehicle
                      ? `${activeJob.vehicle.year || ''} ${activeJob.vehicle.make || ''} ${activeJob.vehicle.model || ''}`
                      : 'Vehicle information recorded on ticket'}
                    {activeJob.vehicle?.licensePlate && (
                      <span className="ml-2 font-mono text-xs px-2 py-0.5 rounded bg-white border border-slate-300 font-bold text-slate-800">
                        {activeJob.vehicle.licensePlate}
                      </span>
                    )}
                  </p>
                </div>

                {/* Tire Spec Highlight */}
                <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                  <Disc className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block leading-none">Required Tire Spec</span>
                    <strong className="text-sm font-black text-slate-900">
                      {activeJob.vehicle?.tireSize || 'Check on scene'}
                    </strong>
                  </div>
                </div>
              </div>

              {activeJob.problemNotes && (
                <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-700 font-medium">
                  <strong className="text-slate-900">Roadside Notes:</strong> {activeJob.problemNotes}
                </div>
              )}
            </div>

            {/* Driver Operational Status Bar */}
            <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Operational Status</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">Current:</span>
                    <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {currentStatus === 'ON_SCENE' ? 'Arrived on Location' : currentStatus.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="driver-body-status-select" className="text-xs font-bold text-slate-700 shrink-0">
                  Update Status:
                </label>
                <div className="relative">
                  <select
                    id="driver-body-status-select"
                    value={currentStatus}
                    disabled={updatingId === activeJob.id}
                    onChange={(e) => handleDropdownStatusChange(e.target.value)}
                    className="appearance-none bg-white text-slate-900 text-xs font-bold pl-3 pr-8 py-2 rounded-xl border border-slate-300 shadow-2xs hover:border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition cursor-pointer disabled:opacity-50"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="EN_ROUTE">En Route</option>
                    <option value="ON_SCENE">Arrived on Location (On Scene)</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* 2-State Operational Action Flows */}
            {activeJob.status === 'ASSIGNED' || activeJob.status === 'PENDING' ? (
              /* State 1: Accept or Decline Job */
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Review details and accept order to begin roadside response.</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={updatingId === activeJob.id}
                    onClick={() => {
                      const confirmed = window.confirm('Decline this dispatch? Dispatcher will be notified.');
                      if (confirmed) {
                        handleUpdateStatus(activeJob.id, 'CANCELLED');
                      }
                    }}
                    className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Decline</span>
                  </button>

                  <button
                    type="button"
                    disabled={updatingId === activeJob.id}
                    onClick={() => handleUpdateStatus(activeJob.id, 'IN_PROGRESS')}
                    className="flex-1 sm:flex-none py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{updatingId === activeJob.id ? 'Accepting...' : 'Accept Job'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* State 2: Accepted / In-Progress - Complete Job with Payment Capture */
              <div className="pt-2 border-t border-slate-100 space-y-4">
                <div id="payment-capture-section" className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Roadside Payment Capture & Settlement
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Select customer payment method, enter amount, and attach required proof slip.
                      </p>
                    </div>
                    {validationError && (
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1">
                        <AlertCircle size={12} />
                        <span>{validationError}</span>
                      </span>
                    )}
                  </div>

                  {/* 1. Payment Method Pills */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                      1. Payment Method <span className="text-emerald-600">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('CASH');
                          setValidationError(null);
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          paymentMethod === 'CASH'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Banknote size={14} />
                        <span>Cash</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('POS');
                          setValidationError(null);
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          paymentMethod === 'POS'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <CreditCard size={14} />
                        <span>POS Terminal</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('E_TRANSFER');
                          setValidationError(null);
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          paymentMethod === 'E_TRANSFER'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Smartphone size={14} />
                        <span>E-Transfer</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Amount Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                        2. {paymentMethod === 'CASH' ? 'Cash Amount Collected' : paymentMethod === 'POS' ? 'POS Terminal Charged Amount' : 'E-Transfer Amount Received'} <span className="text-emerald-600">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 font-mono">
                          Invoice Total: <strong>{formatCurrency(requiredAmount, currencySymbol)}</strong>
                        </span>
                        {requiredAmount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setAmountInput(requiredAmount.toFixed(2));
                              setValidationError(null);
                            }}
                            className="text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-md transition cursor-pointer"
                          >
                            Reset to Default
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
                        {currencySymbol}
                      </span>
                      <input
                        id="driver-amount-input"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="0.00"
                        value={amountInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          const num = parseFloat(val);
                          if (requiredAmount > 0 && !isNaN(num) && num > requiredAmount) {
                            // If greater than required amount, write to default value
                            setAmountInput(requiredAmount.toFixed(2));
                            toast.info(`Amount cannot exceed invoice total. Reset to default ${formatCurrency(requiredAmount, currencySymbol)}`);
                            setValidationError(null);
                            return;
                          }
                          setAmountInput(val);
                          if (requiredAmount > 0 && !isNaN(num) && num < requiredAmount) {
                            setValidationError(`Amount collected cannot be less than required invoice total (${formatCurrency(requiredAmount, currencySymbol)})`);
                          } else {
                            setValidationError(null);
                          }
                        }}
                        onBlur={() => {
                          const num = parseFloat(amountInput);
                          if (requiredAmount > 0) {
                            if (isNaN(num) || num > requiredAmount) {
                              setAmountInput(requiredAmount.toFixed(2));
                              setValidationError(null);
                            } else if (num < requiredAmount) {
                              setValidationError(`Amount collected cannot be less than required invoice total (${formatCurrency(requiredAmount, currencySymbol)})`);
                            }
                          }
                        }}
                        className={`w-full pl-8 pr-4 py-2.5 text-base font-bold font-mono text-slate-900 bg-white rounded-xl border outline-none transition placeholder:text-slate-300 shadow-2xs ${
                          requiredAmount > 0 && amountInput && parseFloat(amountInput) < requiredAmount
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                            : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        }`}
                      />
                    </div>
                    {requiredAmount > 0 && amountInput && parseFloat(amountInput) < requiredAmount && (
                      <p className="text-xs font-bold text-rose-600 flex items-center gap-1 mt-1">
                        <AlertCircle size={13} />
                        <span>Amount collected cannot be less than required invoice total ({formatCurrency(requiredAmount, currencySymbol)})</span>
                      </p>
                    )}
                  </div>

                  {/* 3. Mandatory Receipt Proof Image */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Camera size={13} className="text-emerald-600" />
                        <span>
                          3. {paymentMethod === 'POS'
                            ? 'POS Terminal Slip Photo *'
                            : paymentMethod === 'E_TRANSFER'
                            ? 'Interac / Bank Confirmation Screenshot *'
                            : 'Cash Receipt / Customer Signature (Optional)'}
                        </span>
                      </label>
                      {paymentMethod !== 'CASH' ? (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          Mandatory Proof
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Optional</span>
                      )}
                    </div>

                    {receiptPreview ? (
                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                        <img src={receiptPreview} alt="Receipt preview" className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{receiptFile?.name || 'Attached Photo'}</p>
                          <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={11} />
                            <span>Proof attached and ready</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptFile(null);
                            setReceiptPreview(null);
                          }}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl bg-white/80 hover:bg-emerald-50/20 transition cursor-pointer">
                        <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                          <Camera size={16} className="text-emerald-600" />
                          <span>Tap to Take Photo or Upload Image</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG, HEIC up to 10MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleReceiptFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Submission Action */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-emerald-100">
                    <button
                      type="button"
                      disabled={updatingId === activeJob.id}
                      onClick={handleCompleteJob}
                      className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{updatingId === activeJob.id ? 'Verifying & Completing...' : 'Complete Job & Submit Payment'}</span>
                    </button>

                    <div className="text-xs text-slate-500 font-medium text-right w-full sm:w-auto">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Payout:</span>
                      <strong className="text-emerald-600">
                        {formatCurrency(centsToDollars(activeJob.repairerFeeCents || 4500), currencySymbol)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <button
                    type="button"
                    disabled={updatingId === activeJob.id}
                    onClick={() => {
                      const confirmed = window.confirm('Cancel this active dispatch? Dispatcher will be notified.');
                      if (confirmed) {
                        handleUpdateStatus(activeJob.id, 'CANCELLED');
                      }
                    }}
                    className="text-slate-500 hover:text-rose-600 transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel dispatch</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2 shadow-xs">
          <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">All Dispatches Clear</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No active assignments. New roadside calls appear automatically.
          </p>
        </div>
      )}

      {/* Completed Dispatches History */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Completed Dispatches History</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified roadside jobs, payment settlement proof, and technician compensation records.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
              {completedJobs.length} Completed
            </span>
            <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
              Earned: {formatCurrency(centsToDollars(completedJobs.reduce((acc, j) => acc + (j.repairerFeeCents || 0), 0)), currencySymbol)}
            </span>
          </div>
        </div>

        {completedJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-xs font-bold text-slate-700">No completed dispatches logged yet today</h4>
            <p className="text-[11px] text-slate-400">Completed jobs will appear here with settlement proof and earnings audit status.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {completedJobs.map((job) => {
              const method = job.paymentMethod || 'CASH';
              const isAudited = Boolean((job as any).expenseStatedById);
              const feeCents = job.repairerFeeCents || 0;

              return (
                <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-lg">
                        #{job.jobCode || job.jobNumber}
                      </span>
                      <span className="font-bold text-slate-800 text-xs">
                        {job.customer?.fullName || job.recipientName || 'Customer'}
                      </span>
                      {job.customer?.phone && (
                        <a href={`tel:${job.customer.phone}`} className="text-[11px] font-mono text-blue-600 hover:underline flex items-center gap-1">
                          <Phone size={10} />
                          <span>{job.customer.phone}</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar size={11} />
                        <span>{formatDate(job.completedAt || job.createdAt)}</span>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Completed
                      </span>
                    </div>
                  </div>

                  {/* Body: Location, Vehicle, and Payment Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Service Location</span>
                      <p className="text-slate-700 font-medium truncate mt-0.5 flex items-start gap-1" title={job.serviceAddress || 'Address on file'}>
                        <MapPin size={12} className="text-red-500 shrink-0 mt-0.5" />
                        <span className="truncate">{job.serviceAddress || 'Roadside Location'}</span>
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Vehicle & Tire</span>
                      <p className="text-slate-800 font-semibold mt-0.5 flex items-center gap-1.5">
                        <Car size={12} className="text-slate-400 shrink-0" />
                        <span>{job.vehicle ? `${job.vehicle.year || ''} ${job.vehicle.make} ${job.vehicle.model}`.trim() : 'Standard Vehicle'}</span>
                      </p>
                      {job.vehicle?.tireSize && (
                        <span className="text-[10px] font-mono text-slate-500">
                          Tire: <strong>{job.vehicle.tireSize}</strong>
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Settlement & Method</span>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          method === 'CASH'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : method === 'POS'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-purple-50 text-purple-800 border-purple-200'
                        }`}>
                          {method.replace('_', ' ')}
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(centsToDollars(job.totalCents || job.cashCollectedCents || 0), currencySymbol)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer: Payout audit & proof button */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isAudited ? (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span>Audited Compensation: {formatCurrency(centsToDollars(feeCents), currencySymbol)}</span>
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-flex items-center gap-1.5">
                          <Clock size={12} className="text-amber-600" />
                          <span>Estimated Payout: {formatCurrency(centsToDollars(feeCents || 4500), currencySymbol)} (Pending Audit)</span>
                        </span>
                      )}

                      {job.receiptUrl && (
                        <button
                          type="button"
                          onClick={() => setViewingReceiptUrl(job.receiptUrl || null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-200 transition cursor-pointer"
                          title="View Roadside Proof Slip"
                        >
                          <Eye size={12} />
                          <span>View Proof Slip</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setChatJob(job)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200 transition cursor-pointer"
                      title="View Chat Logs"
                    >
                      <MessageSquare size={12} />
                      <span>Chat Logs</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two-Way Job Chat Modal */}
      {chatJob && (
        <JobChatModal
          isOpen={!!chatJob}
          onClose={() => setChatJob(null)}
          jobId={chatJob.id}
          jobCode={chatJob.jobCode || chatJob.jobNumber}
          driverName="Dispatcher / HQ"
        />
      )}

      {/* Proof Receipt Image Preview Modal */}
      {viewingReceiptUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4" 
          onClick={() => setViewingReceiptUrl(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full p-4 space-y-3 shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ImageIcon size={16} className="text-emerald-600" />
                <span>Roadside Payment Proof Receipt</span>
              </span>
              <button 
                type="button" 
                onClick={() => setViewingReceiptUrl(null)} 
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center max-h-[70vh]">
              <img src={viewingReceiptUrl} alt="Payment Receipt" className="max-h-[65vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
