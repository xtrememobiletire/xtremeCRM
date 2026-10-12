import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Phone, 
  MessageSquare, 
  CheckCircle, 
  Disc, 
  XCircle,
  Check,
  Clock,
  Zap,
  CreditCard,
  Banknote,
  Smartphone,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ArrowRight,
  History as HistoryIcon,
  Calendar,
  Copy,
  ExternalLink,
  Navigation,
  Map,
  Layers,
  Car
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { jobService, type JobItem } from '../services/jobService';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { formatCurrency, centsToDollars } from '../utils/currency';
import { toast } from 'sonner';
import JobChatModal from '../components/dispatch/JobChatModal';
import { useUpdateJobStatus } from '../hooks/useJobs';
import { useSocket } from '../context/SocketContext';
import TechnicianMap from '../components/maps/TechnicianMap';

// Classify jobs into Urgent Roadside vs Scheduled Appointment
const isScheduledJob = (job: any): boolean => {
  if (job.urgency === 'FUTURE' || job.urgency === 'SCHEDULED' || job.urgency === 'LOW') return true;
  if (job.urgency === 'URGENT' || job.urgency === 'EMERGENCY' || job.urgency === 'HIGH') return false;
  if (job.arrivalWindowEnd) return true;
  return false;
};

// 1. Urgent sorting: based on ETA set on the job (nearest ETA first)
const getUrgentSortTime = (job: any): number => {
  if (job.driverEstimatedArrivalAt) {
    const t = new Date(job.driverEstimatedArrivalAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (job.driverEtaMinutes && (job.assignedAt || job.createdAt)) {
    const base = new Date(job.assignedAt || job.createdAt).getTime();
    if (!isNaN(base)) return base + job.driverEtaMinutes * 60 * 1000;
  }
  if (job.estimatedArrivalAt) {
    const t = new Date(job.estimatedArrivalAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (job.driverEtaMinutes) {
    return job.driverEtaMinutes * 60 * 1000;
  }
  const fallback = new Date(job.assignedAt || job.createdAt || 0).getTime();
  return isNaN(fallback) ? 0 : fallback;
};

// 2. Scheduled sorting: based on end time of arrival (arrivalWindowEnd from schema)
const getScheduledSortTime = (job: any): number => {
  if (job.arrivalWindowEnd) {
    const t = new Date(job.arrivalWindowEnd).getTime();
    if (!isNaN(t)) return t;
  }
  if (job.arrivalWindowStart) {
    const t = new Date(job.arrivalWindowStart).getTime();
    if (!isNaN(t)) return t;
  }
  if (job.appointmentDate) {
    const t = new Date(job.appointmentDate).getTime();
    if (!isNaN(t)) return t;
  }
  const fallback = new Date(job.assignedAt || job.createdAt || 0).getTime();
  return isNaN(fallback) ? 0 : fallback;
};

const formatUrgentEta = (job: any): string => {
  if (job.driverEtaMinutes) {
    return `ETA ~${job.driverEtaMinutes}m`;
  }
  if (job.driverEstimatedArrivalAt) {
    const d = new Date(job.driverEstimatedArrivalAt);
    return `ETA ~${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (job.estimatedArrivalAt) {
    const d = new Date(job.estimatedArrivalAt);
    return `ETA ~${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return 'Immediate ETA';
};

const formatScheduledWindow = (job: any): string => {
  if (job.arrivalWindowStart && job.arrivalWindowEnd) {
    const s = new Date(job.arrivalWindowStart).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const e = new Date(job.arrivalWindowEnd).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${s} – ${e}`;
  }
  if (job.arrivalWindowEnd) {
    const e = new Date(job.arrivalWindowEnd).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `Ends ~${e}`;
  }
  if (job.appointmentDate) {
    const d = new Date(job.appointmentDate);
    return `Appt: ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return 'Scheduled Window';
};

export default function TechnicianPortal() {
  const { user } = useAuth();
  const { currencySymbol } = useTenant();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [chatJob, setChatJob] = useState<JobItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'POS' | 'E_TRANSFER'>('CASH');
  const [amountInput, setAmountInput] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);
  const [driverSelectedStatus, setDriverSelectedStatus] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [queueTab, setQueueTab] = useState<'ALL' | 'URGENT' | 'SCHEDULED'>('ALL');

  const handleCopyAddress = (addr: string) => {
    if (!addr) return;
    navigator.clipboard.writeText(addr);
    setCopiedAddress(true);
    toast.success('Address copied to clipboard!');
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const getGoogleMapsUrl = (job: any): string => {
    const address = job?.serviceAddress || job?.locationAddress || '';
    if (job?.serviceLatitude && job?.serviceLongitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${job.serviceLatitude},${job.serviceLongitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const { socket } = useSocket();
  const updateStatusMutation = useUpdateJobStatus();

  // Fetch driver assigned jobs - strictly scoped to this driver without country restriction or background polling
  const { data: jobsResponse, refetch } = useQuery({
    queryKey: ['technician-jobs', user?.id],
    queryFn: () => jobService.getJobs({ limit: 50, driverId: user?.id }),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
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

  // Active jobs split into Urgent Roadside Dispatches and Scheduled Appointments
  const urgentJobs = useMemo(() => {
    const activeStatuses = ['ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'IN_PROGRESS', 'PENDING'];
    return jobs
      .filter((j: any) => activeStatuses.includes(j.status) && !isScheduledJob(j))
      .sort((a: any, b: any) => getUrgentSortTime(a) - getUrgentSortTime(b));
  }, [jobs]);

  const scheduledJobs = useMemo(() => {
    const activeStatuses = ['ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'IN_PROGRESS', 'PENDING'];
    return jobs
      .filter((j: any) => activeStatuses.includes(j.status) && isScheduledJob(j))
      .sort((a: any, b: any) => getScheduledSortTime(a) - getScheduledSortTime(b));
  }, [jobs]);

  const allActiveJobs = useMemo(() => {
    return [...urgentJobs, ...scheduledJobs];
  }, [urgentJobs, scheduledJobs]);

  const filteredQueueJobs = useMemo(() => {
    if (queueTab === 'URGENT') return urgentJobs;
    if (queueTab === 'SCHEDULED') return scheduledJobs;
    return allActiveJobs;
  }, [queueTab, urgentJobs, scheduledJobs, allActiveJobs]);

  const activeJob = useMemo(() => {
    if (!allActiveJobs.length) return null;
    if (selectedJobId) {
      const found = allActiveJobs.find((j: any) => j.id === selectedJobId);
      if (found) return found;
    }
    return urgentJobs[0] || scheduledJobs[0] || allActiveJobs[0];
  }, [allActiveJobs, urgentJobs, scheduledJobs, selectedJobId]);

  const requiredAmount = activeJob?.totalCents ? centsToDollars(activeJob.totalCents) : 0;

  useEffect(() => {
    setDriverSelectedStatus(null);
    setReceiptFile(null);
    setReceiptPreview(null);
    setValidationError(null);
  }, [activeJob?.id]);

  // Pre-fill amount input if job already has charges
  useEffect(() => {
    if (activeJob && (activeJob.status === 'IN_PROGRESS' || activeJob.status === 'EN_ROUTE' || activeJob.status === 'ON_SCENE')) {
      if (!amountInput && requiredAmount > 0) {
        setAmountInput(requiredAmount.toFixed(2));
      }
    }
  }, [activeJob?.id, activeJob?.status, requiredAmount, amountInput]);

  const currentStage = useMemo<'ASSIGNED' | 'ACCEPTED' | 'EN_ROUTE' | 'ON_SCENE' | 'COMPLETED'>(() => {
    if (driverSelectedStatus) {
      if (driverSelectedStatus === 'ARRIVED') return 'ON_SCENE';
      if (['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ON_SCENE', 'COMPLETED'].includes(driverSelectedStatus)) {
        return driverSelectedStatus as any;
      }
    }
    const disp = activeJob?.dispositionNotes;
    if (disp === 'ACCEPTED' || disp === 'EN_ROUTE' || disp === 'ON_SCENE' || disp === 'ARRIVED') {
      return disp === 'ARRIVED' ? 'ON_SCENE' : (disp as any);
    }
    if ((activeJob as any)?.effectiveStatus) {
      const eff = (activeJob as any).effectiveStatus;
      if (eff === 'ACCEPTED' || eff === 'EN_ROUTE' || eff === 'ON_SCENE' || eff === 'ARRIVED') {
        return eff === 'ARRIVED' ? 'ON_SCENE' : (eff as any);
      }
    }
    if (activeJob?.status === 'COMPLETED') return 'COMPLETED';
    if (activeJob?.status === 'IN_PROGRESS') return 'ON_SCENE';
    return 'ASSIGNED';
  }, [driverSelectedStatus, activeJob]);

  const currentStatus = currentStage;

  const handleUpdateStatus = (jobId: string, nextStatus: string, cashAmountCents?: number) => {
    setUpdatingId(jobId);
    setDriverSelectedStatus(nextStatus);
    updateStatusMutation.mutate(
      { id: jobId, status: nextStatus, cashAmountCents },
      {
        onSuccess: () => {
          setDriverSelectedStatus(nextStatus);
          toast.success(`Job stage updated: ${nextStatus.replace('_', ' ').toLowerCase()}`);
          if (nextStatus === 'COMPLETED') {
            setAmountInput('');
            setReceiptFile(null);
            setReceiptPreview(null);
            setValidationError(null);
            setDriverSelectedStatus(null);
          }
        },
        onError: (err: any) => {
          setDriverSelectedStatus(null);
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

      {/* Single Unified Container for all Assigned Dispatches */}
      {allActiveJobs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Container Header with Queue Tab / Filter Switcher */}
          <div className="p-3.5 sm:p-4 bg-slate-50/90 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Assigned Work Orders</span>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {allActiveJobs.length} {allActiveJobs.length === 1 ? 'Job' : 'Jobs'}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  {allActiveJobs.length > 1 ? 'Tap any job card to select and manage' : 'Current active roadside dispatch assignment'}
                </p>
              </div>
            </div>

            {/* Mobile-friendly Tabs / Filter Pills inside this same container */}
            {urgentJobs.length > 0 && scheduledJobs.length > 0 && (
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setQueueTab('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    queueTab === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({allActiveJobs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueTab('URGENT')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    queueTab === 'URGENT'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-amber-800 hover:text-amber-950'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>Urgent ({urgentJobs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQueueTab('SCHEDULED')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    queueTab === 'SCHEDULED'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-blue-800 hover:text-blue-950'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>Scheduled ({scheduledJobs.length})</span>
                </button>
              </div>
            )}
          </div>

          {/* Body of the single container: Table form & List form */}
          {filteredQueueJobs.length > 0 ? (
            <div>
              {/* Desktop & Tablet: Clean Table form */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3">Job Code</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Customer & Location</th>
                      <th className="py-2.5 px-3">Vehicle & Spec</th>
                      <th className="py-2.5 px-3">Timing / ETA</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Fee & Collection</th>
                      <th className="py-2.5 px-3 text-center w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQueueJobs.map((job: any, idx: number) => {
                      const isSelected = activeJob?.id === job.id;
                      const isUrgent = !isScheduledJob(job);
                      const timingDisplay = isUrgent ? formatUrgentEta(job) : formatScheduledWindow(job);
                      const earning = formatCurrency(centsToDollars(job.repairerFeeCents || 4500), currencySymbol);
                      const seqNum = idx + 1;

                      return (
                        <tr
                          key={job.id}
                          onClick={() => setSelectedJobId(job.id)}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50/70 font-medium'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                                idx === 0
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : isSelected
                                  ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                                  : 'bg-slate-100 text-slate-600 font-bold'
                              }`}
                            >
                              {seqNum}
                            </span>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-200">
                                #{job.jobCode || job.jobNumber}
                              </span>
                              {idx === 0 && (
                                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                  {isUrgent ? 'Nearest ETA' : 'Earliest Window'}
                                </span>
                              )}
                              {isSelected && (
                                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                                  Active
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            {isUrgent ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Zap className="w-3 h-3 text-amber-600" />
                                <span>Urgent Roadside</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                <Calendar className="w-3 h-3 text-blue-600" />
                                <span>Scheduled Appt</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 min-w-[200px] max-w-xs">
                            <div className="font-bold text-slate-900 truncate">
                              {job.customer?.fullName || job.recipientName || 'Customer'}
                            </div>
                            {(job.customer?.phone || job.recipientPhone) && (
                              <div className="text-[11px] mt-0.5">
                                <a
                                  href={`tel:${job.customer?.phone || job.recipientPhone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 hover:underline"
                                >
                                  <Phone size={10} className="shrink-0 text-emerald-600" />
                                  <span>{job.customer?.phone || job.recipientPhone}</span>
                                </a>
                              </div>
                            )}
                            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                              <MapPin size={11} className="text-red-500 shrink-0" />
                              <span className="truncate">{job.serviceAddress || job.locationAddress || 'Roadside Location'}</span>
                            </div>
                            {job.problemNotes && (
                              <div className="text-[10px] text-amber-800 bg-amber-50/90 px-1.5 py-0.5 rounded border border-amber-200/70 truncate flex items-center gap-1 mt-1" title={job.problemNotes}>
                                <AlertCircle size={10} className="text-amber-600 shrink-0" />
                                <span className="truncate">Notes: {job.problemNotes}</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 min-w-[150px]">
                            <div className="font-semibold text-slate-900 flex items-center gap-1 truncate">
                              <Car size={12} className="text-slate-500 shrink-0" />
                              <span className="truncate">
                                {job.vehicle ? `${job.vehicle.year || ''} ${job.vehicle.make || ''} ${job.vehicle.model || ''}`.trim() || 'Vehicle on file' : 'Vehicle on file'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              {job.vehicle?.licensePlate && (
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 border border-slate-300 text-slate-800">
                                  {job.vehicle.licensePlate}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                <Disc size={10} className="text-emerald-600 shrink-0" />
                                <span>{job.vehicle?.tireSize || 'Check size'}</span>
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <div
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border ${
                                isUrgent
                                  ? 'text-amber-800 bg-amber-50 border-amber-200'
                                  : 'text-blue-800 bg-blue-50 border-blue-200'
                              }`}
                            >
                              <Clock size={11} className={isUrgent ? 'text-amber-600' : 'text-blue-600'} />
                              <span>{timingDisplay}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                job.status === 'EN_ROUTE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : job.status === 'ON_SCENE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : job.status === 'IN_PROGRESS'
                                  ? 'bg-cyan-100 text-cyan-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {job.status.replace('_', ' ')}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="font-mono font-bold text-emerald-700 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 inline-block">
                              Fee: {earning}
                            </div>
                            <div className="text-[10px] mt-0.5">
                              {job.totalCents && job.totalCents > 0 ? (
                                <span className="text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-flex items-center gap-1">
                                  <Banknote size={10} />
                                  <span>Collect: {formatCurrency(centsToDollars(job.totalCents), currencySymbol)}</span>
                                </span>
                              ) : (
                                <span className="text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                                  Prepaid / Account
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {isSelected ? (
                              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-600 text-white shadow-2xs">
                                Active
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedJobId(job.id);
                                }}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                              >
                                Select
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Phone: Clean Vertical Numbered List */}
              <div className="sm:hidden divide-y divide-slate-100">
                {filteredQueueJobs.map((job: any, idx: number) => {
                  const isSelected = activeJob?.id === job.id;
                  const isUrgent = !isScheduledJob(job);
                  const timingDisplay = isUrgent ? formatUrgentEta(job) : formatScheduledWindow(job);
                  const earning = formatCurrency(centsToDollars(job.repairerFeeCents || 4500), currencySymbol);
                  const seqNum = idx + 1;

                  return (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`p-3 space-y-2 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/70 border-l-4 border-l-emerald-500'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black shrink-0 ${
                              idx === 0
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : isSelected
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {seqNum}
                          </span>
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-200">
                            #{job.jobCode || job.jobNumber}
                          </span>
                          {idx === 0 && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              #1 Priority
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                              Active
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                            job.status === 'EN_ROUTE'
                              ? 'bg-amber-100 text-amber-800'
                              : job.status === 'ON_SCENE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : job.status === 'IN_PROGRESS'
                              ? 'bg-cyan-100 text-cyan-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="pl-7 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {job.customer?.fullName || job.recipientName || 'Customer'}
                          </p>
                          {(job.customer?.phone || job.recipientPhone) && (
                            <a
                              href={`tel:${job.customer?.phone || job.recipientPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1 shrink-0 hover:bg-emerald-100"
                            >
                              <Phone size={10} className="text-emerald-600" />
                              <span>{job.customer?.phone || job.recipientPhone}</span>
                            </a>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                          <MapPin size={11} className="text-red-500 shrink-0" />
                          <span className="truncate">{job.serviceAddress || job.locationAddress || 'Roadside Location'}</span>
                        </p>
                      </div>

                      {/* Vehicle & Tire Spec Row */}
                      <div className="pl-7 flex items-center gap-1.5 flex-wrap text-xs pt-0.5">
                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <Car size={11} className="text-slate-600 shrink-0" />
                          <span className="truncate">
                            {job.vehicle ? `${job.vehicle.year || ''} ${job.vehicle.make || ''} ${job.vehicle.model || ''}`.trim() || 'Vehicle on file' : 'Vehicle on file'}
                          </span>
                          {job.vehicle?.licensePlate && (
                            <span className="font-mono text-[10px] font-bold px-1 rounded bg-white border border-slate-300 text-slate-800">
                              {job.vehicle.licensePlate}
                            </span>
                          )}
                        </div>

                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          <Disc size={10} className="text-emerald-600 shrink-0" />
                          <span>{job.vehicle?.tireSize || 'Check size'}</span>
                        </span>
                      </div>

                      {/* Roadside Problem Notes if present */}
                      {job.problemNotes && (
                        <div className="ml-7 p-1.5 bg-amber-50 rounded-lg border border-amber-200/70 text-[10px] text-amber-900 flex items-start gap-1">
                          <AlertCircle size={11} className="text-amber-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            <strong className="font-bold text-amber-950">Notes:</strong> {job.problemNotes}
                          </span>
                        </div>
                      )}

                      <div className="pl-7 flex flex-wrap items-center justify-between gap-2 text-xs pt-1.5 border-t border-slate-100">
                        <div
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border ${
                            isUrgent ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-blue-800 bg-blue-50 border-blue-200'
                          }`}
                        >
                          <Clock size={11} className={isUrgent ? 'text-amber-600' : 'text-blue-600'} />
                          <span>{timingDisplay}</span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {job.totalCents && job.totalCents > 0 ? (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-flex items-center gap-1">
                              <Banknote size={10} />
                              <span>Collect: {formatCurrency(centsToDollars(job.totalCents), currencySymbol)}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              Prepaid
                            </span>
                          )}
                          <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                            Fee: {earning}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              No assignments found for this filter tab.
            </div>
          )}
        </div>
      )}

      {/* Primary Active Job Card - Modern High-End Styling */}
      {activeJob ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          {/* Card Top Banner - Luxury Slate-900 Header with Emerald Accents */}
          <div className="bg-slate-900 px-5 py-4 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono font-bold text-sm bg-slate-800 text-emerald-400 px-2.5 py-1 rounded-lg border border-slate-700/60">
                #{activeJob.jobCode || activeJob.jobNumber}
              </span>
              <div className="bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-emerald-400">Job Earning</span>
                <span className="text-xs font-black text-emerald-300 font-mono">
                  {formatCurrency(centsToDollars(activeJob.repairerFeeCents || 4500), currencySymbol)}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold tracking-wide">
                <span className={`w-2 h-2 rounded-full ${
                  currentStage === 'ASSIGNED' ? 'bg-amber-400 animate-ping' :
                  currentStage === 'ACCEPTED' ? 'bg-blue-400 animate-pulse' :
                  currentStage === 'EN_ROUTE' ? 'bg-indigo-400 animate-pulse' :
                  currentStage === 'ON_SCENE' ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400'
                }`} />
                <span className={
                  currentStage === 'ASSIGNED' ? 'text-amber-300' :
                  currentStage === 'ACCEPTED' ? 'text-blue-300' :
                  currentStage === 'EN_ROUTE' ? 'text-indigo-300' :
                  currentStage === 'ON_SCENE' ? 'text-purple-300' : 'text-emerald-300'
                }>
                  {currentStage === 'ASSIGNED' ? 'Stage: Assigned' :
                   currentStage === 'ACCEPTED' ? 'Stage: Accepted' :
                   currentStage === 'EN_ROUTE' ? 'Stage: En Route' :
                   currentStage === 'ON_SCENE' ? 'Stage: Arrived' : 'Completed'}
                </span>
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

              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Breakdown Location & Navigation
                </span>
                <p className="text-xs font-bold text-slate-900 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="break-words">{activeJob.serviceAddress || activeJob.locationAddress || 'Address on file'}</span>
                </p>

                {/* Mobile-First Navigation Actions: Direct Google Maps link, Copy Address string, View Map Popup */}
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <a
                    href={getGoogleMapsUrl(activeJob)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Open in Google Maps</span>
                    <ExternalLink className="w-3 h-3 text-emerald-200" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyAddress(activeJob.serviceAddress || activeJob.locationAddress || '')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition cursor-pointer"
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Address</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                  >
                    <Map className="w-3.5 h-3.5 text-blue-600" />
                    <span>View Map (Popup)</span>
                  </button>
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

                <div className="flex items-center gap-2 flex-wrap">
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

                  {/* Customer Payment Collection Pill */}
                  <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                    <Banknote className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-400 block leading-none">Customer Payment</span>
                      <strong className="text-sm font-black text-slate-900">
                        {activeJob.totalCents && activeJob.totalCents > 0
                          ? `Collect: ${formatCurrency(centsToDollars(activeJob.totalCents), currencySymbol)}`
                          : 'Prepaid / Fleet Account'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {activeJob.problemNotes && (
                <div className="p-2.5 bg-amber-50/90 rounded-lg border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-950 font-bold">Roadside & Safety Notes:</strong>{' '}
                    <span>{activeJob.problemNotes}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 4-Step Progressive Workflow Stepper */}
            <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Driver Operational Workflow</span>
                    <span className="text-xs font-black text-slate-800">
                      {currentStage === 'ASSIGNED' ? 'Step 1 of 4: Awaiting Driver Acceptance' :
                       currentStage === 'ACCEPTED' ? 'Step 2 of 4: Accepted • Ready to Travel' :
                       currentStage === 'EN_ROUTE' ? 'Step 3 of 4: Driving to Customer Location' :
                       currentStage === 'ON_SCENE' ? 'Step 4 of 4: Arrived on Scene • Payment & Completion' : 'Work Order Completed'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-lg border ${
                    currentStage === 'ASSIGNED' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    currentStage === 'ACCEPTED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    currentStage === 'EN_ROUTE' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                    currentStage === 'ON_SCENE' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                    'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {currentStage === 'ASSIGNED' ? '1. Assigned' :
                     currentStage === 'ACCEPTED' ? '2. Accepted' :
                     currentStage === 'EN_ROUTE' ? '3. En Route' :
                     currentStage === 'ON_SCENE' ? '4. Arrived' : 'Completed'}
                  </span>
                </div>
              </div>

              {/* Stepper Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  { step: 1, key: 'ASSIGNED', label: '1. Accept', desc: 'Confirm Job' },
                  { step: 2, key: 'ACCEPTED', label: '2. En Route', desc: 'Start Travel' },
                  { step: 3, key: 'EN_ROUTE', label: '3. Arrived', desc: 'On Location' },
                  { step: 4, key: 'ON_SCENE', label: '4. Complete', desc: 'Settle Payment' },
                ].map((s) => {
                  const stepIdx = currentStage === 'ASSIGNED' ? 1 :
                                  currentStage === 'ACCEPTED' ? 2 :
                                  currentStage === 'EN_ROUTE' ? 3 :
                                  currentStage === 'ON_SCENE' ? 4 : 5;
                  const isPast = stepIdx > s.step;
                  const isCurrent = stepIdx === s.step;

                  return (
                    <div
                      key={s.key}
                      className={`relative rounded-xl p-2.5 border text-center transition-all ${
                        isCurrent
                          ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                          : isPast
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                          : 'bg-white/60 border-slate-200/80 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-1">
                        {isPast ? (
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </span>
                        ) : isCurrent ? (
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-emerald-400 border border-emerald-500 flex items-center justify-center text-[10px] font-black animate-pulse">
                            {s.step}
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-bold">
                            {s.step}
                          </span>
                        )}
                      </div>
                      <span className={`text-[11px] font-bold block truncate ${
                        isCurrent ? 'text-slate-900' : isPast ? 'text-emerald-700' : 'text-slate-400'
                      }`}>
                        {s.label}
                      </span>
                      <span className="text-[9px] text-slate-400 block truncate">
                        {s.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Single Smart Progressive Action Section */}
            {currentStage === 'ASSIGNED' && (
              /* Stage 1: Accept Dispatch */
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 border border-slate-700/80 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                        Step 1 • Dispatch Assigned
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Order #{activeJob.jobCode || activeJob.jobNumber} assigned to your queue. Tap to accept this job.
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-xl self-start sm:self-auto flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase font-bold text-emerald-400">Guaranteed Fee:</span>
                    <span className="text-sm font-black text-emerald-300 font-mono">
                      {formatCurrency(centsToDollars(activeJob.repairerFeeCents || 4500), currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* Single Progressive Action Button (Step 1) */}
                <button
                  type="button"
                  disabled={updatingId === activeJob.id}
                  onClick={() => handleUpdateStatus(activeJob.id, 'ACCEPTED')}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 active:scale-[0.99] transition cursor-pointer disabled:opacity-50 tracking-wide"
                >
                  {updatingId === activeJob.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Accepting Job...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                      <span>1. Accept Job</span>
                      <ArrowRight className="w-4 h-4 text-emerald-200" />
                    </>
                  )}
                </button>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={updatingId === activeJob.id}
                    onClick={() => {
                      if (window.confirm('Are you sure you want to decline this dispatch? The dispatcher will be notified immediately.')) {
                        handleUpdateStatus(activeJob.id, 'CANCELLED');
                      }
                    }}
                    className="text-xs text-slate-400 hover:text-rose-400 transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Decline Dispatch</span>
                  </button>
                </div>
              </div>
            )}

            {currentStage === 'ACCEPTED' && (
              /* Stage 2: Start Route (En Route) */
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 border border-slate-700/80 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                        Step 2 • Job Accepted • Ready to Drive
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Order #{activeJob.jobCode || activeJob.jobNumber} is locked. Tap below when you begin driving to the customer location.
                      </p>
                    </div>
                  </div>

                  <a
                    href={getGoogleMapsUrl(activeJob)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition self-start sm:self-auto"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Launch GPS Route</span>
                  </a>
                </div>

                {/* Single Progressive Action Button (Step 2) */}
                <button
                  type="button"
                  disabled={updatingId === activeJob.id}
                  onClick={() => handleUpdateStatus(activeJob.id, 'EN_ROUTE')}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/25 active:scale-[0.99] transition cursor-pointer disabled:opacity-50 tracking-wide"
                >
                  {updatingId === activeJob.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Updating to En Route...</span>
                    </>
                  ) : (
                    <>
                      <Car className="w-5 h-5 text-blue-200" />
                      <span>2. Start Route (En Route)</span>
                      <ArrowRight className="w-4 h-4 text-blue-200" />
                    </>
                  )}
                </button>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={updatingId === activeJob.id}
                    onClick={() => {
                      if (window.confirm('Cancel this dispatch? Dispatcher will be notified.')) {
                        handleUpdateStatus(activeJob.id, 'CANCELLED');
                      }
                    }}
                    className="text-xs text-slate-400 hover:text-rose-400 transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Dispatch</span>
                  </button>
                </div>
              </div>
            )}

            {currentStage === 'EN_ROUTE' && (
              /* Stage 3: Arrived on Scene */
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 border border-slate-700/80 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                    </span>
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-400">
                        Step 3 • Traveling to Customer
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        En route to destination. Tap below as soon as you reach the customer location to mark Arrived.
                      </p>
                    </div>
                  </div>

                  <a
                    href={getGoogleMapsUrl(activeJob)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition self-start sm:self-auto"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Navigate GPS</span>
                  </a>
                </div>

                {/* Single Progressive Action Button (Step 3) */}
                <button
                  type="button"
                  disabled={updatingId === activeJob.id}
                  onClick={() => handleUpdateStatus(activeJob.id, 'ON_SCENE')}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2.5 shadow-lg shadow-purple-500/25 active:scale-[0.99] transition cursor-pointer disabled:opacity-50 tracking-wide"
                >
                  {updatingId === activeJob.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Confirming Arrival...</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-5 h-5 text-purple-200" />
                      <span>3. Arrived on Scene</span>
                      <ArrowRight className="w-4 h-4 text-purple-200" />
                    </>
                  )}
                </button>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={updatingId === activeJob.id}
                    onClick={() => {
                      if (window.confirm('Cancel this dispatch? Dispatcher will be notified.')) {
                        handleUpdateStatus(activeJob.id, 'CANCELLED');
                      }
                    }}
                    className="text-xs text-slate-400 hover:text-rose-400 transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Dispatch</span>
                  </button>
                </div>
              </div>
            )}

            {(currentStage === 'ON_SCENE' || currentStage === 'COMPLETED') && (
              /* Stage 4: Arrived - Payment Collection & Complete Work Order */
              <div className="pt-2 border-t border-slate-100 space-y-4">
                <div id="payment-capture-section" className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Step 4 • Roadside Payment Capture & Work Order Completion</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Customer service arrived. Record payment collected and tap below to complete work order.
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

                  {/* Single Progressive Action Button (Step 4: Complete Job) */}
                  <div className="pt-2 flex flex-col gap-3 border-t border-emerald-100">
                    <button
                      type="button"
                      disabled={updatingId === activeJob.id}
                      onClick={handleCompleteJob}
                      className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 active:scale-[0.99] transition cursor-pointer disabled:opacity-50 tracking-wide"
                    >
                      {updatingId === activeJob.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Verifying & Completing Order...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 text-emerald-200" />
                          <span>4. Complete Work Order & Settle</span>
                          <ArrowRight className="w-4 h-4 text-emerald-200" />
                        </>
                      )}
                    </button>

                    <div className="text-xs text-slate-500 font-medium text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Your Driver Earning:</span>
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

      {/* Dedicated History & Earnings Link Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <HistoryIcon className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Completed Dispatches & Audited Earnings</h3>
            <p className="text-xs text-slate-500">Track approved earnings, pending audit tickets, and roadside receipts in your dedicated history ledger.</p>
          </div>
        </div>
        <Link
          to="/history"
          className="btn-secondary text-xs px-4 py-2 font-bold inline-flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <span>View History & Earnings</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
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

      {/* Map Popup Modal (Opened only when driver taps 'View Map') */}
      {showMapModal && activeJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4"
          onClick={() => setShowMapModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Breakdown Location & GPS Map
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                    {activeJob.serviceAddress || activeJob.locationAddress || 'Roadside address'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200">
              <TechnicianMap
                address={activeJob.serviceAddress || activeJob.locationAddress || ''}
                latitude={(activeJob as any).serviceLatitude}
                longitude={(activeJob as any).serviceLongitude}
                customerName={activeJob.customer?.fullName || activeJob.recipientName}
                customerPhone={activeJob.customer?.phone || activeJob.recipientPhone}
                jobCode={activeJob.jobCode}
                height="340px"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={() => handleCopyAddress(activeJob.serviceAddress || activeJob.locationAddress || '')}
                className="text-slate-600 hover:text-slate-900 font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Copy size={13} />
                <span>Copy Address</span>
              </button>
              <a
                href={getGoogleMapsUrl(activeJob)}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-1"
              >
                <span>Open in Google Maps App</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
