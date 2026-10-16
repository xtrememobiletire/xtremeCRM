import { useState, useEffect } from 'react';
import { 
  Building2, 
  Truck, 
  MapPin, 
  FileText, 
  Printer, 
  Sparkles,
  Zap,
  Edit2,
  Copy,
  Check,
  Save,
  Wrench,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Modal from '../../ui/Modal';
import { formatCurrency, centsToDollars } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import { useTenant } from '../../../context/TenantContext';
import { useAuth } from '../../../context/AuthContext';
import { useUpdateJobStatus } from '../../../hooks/useJobs';
import { JOB_STATUSES } from '../../../constants/statuses';
import InvoicePdfModal from '../../invoices/InvoicePdfModal';
import GenerateInvoicePopover from '../../invoices/GenerateInvoicePopover';
import AssignDriverModal from '../../jobs/AssignDriverModal';
import EditJobServicesModal from '../../jobs/EditJobServicesModal';
import { jobService } from '../../../services/jobService';
import { getNavigationUrl } from '../../../utils/navigation';
import { toast } from 'sonner';

interface FleetJobDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}

export default function FleetJobDetailModal({ isOpen, onClose, job }: FleetJobDetailModalProps) {
  const { user } = useAuth();
  const isAdminOrAccountant = user?.role === 'ADMIN' || user?.role === 'GENERAL_MANAGER' || user?.role === 'ACCOUNTANT';
  const isManagement = user?.role === 'ADMIN' || user?.role === 'GENERAL_MANAGER' || user?.role === 'DISPATCHER';
  const canManageInvoices = isAdminOrAccountant || user?.role === 'DISPATCHER';
  const { country, currencySymbol } = useTenant();
  const updateStatusMutation = useUpdateJobStatus();
  const queryClient = useQueryClient();

  const [updating, setUpdating] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(job?.invoice?.id || null);
  const [showGeneratePopover, setShowGeneratePopover] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditServicesModal, setShowEditServicesModal] = useState(false);
  const [status, setStatus] = useState<string>(job?.status || 'PENDING');
  const [copied, setCopied] = useState(false);

  // Management inline editing
  const [isEditingUpfront, setIsEditingUpfront] = useState(false);
  const [upfrontDollars, setUpfrontDollars] = useState<string>(
    job?.upfrontAmountCents ? (job.upfrontAmountCents / 100).toFixed(2) : '0.00'
  );
  const [upfrontReceiptFile, setUpfrontReceiptFile] = useState<File | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState<string>(job?.problemNotes || job?.notes || '');

  // Keep modal state in sync with incoming reactive job updates
  useEffect(() => {
    if (job) {
      if (!isEditingUpfront) {
        setUpfrontDollars(job.upfrontAmountCents ? (job.upfrontAmountCents / 100).toFixed(2) : '0.00');
      }
      setStatus(job.status || 'PENDING');
      if (!isEditingNotes) {
        setNotesInput(job.problemNotes || job.notes || '');
      }
    }
  }, [job, isEditingUpfront, isEditingNotes]);

  if (!job) return null;

  const totalCents = job.totalCents || job.totalAmount || 0;
  const currentUpfrontCents = Math.round((parseFloat(upfrontDollars) || 0) * 100);
  const balanceDueCents = Math.max(0, totalCents - currentUpfrontCents);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdating(true);
      await updateStatusMutation.mutateAsync({ id: job.id, status: newStatus });
      toast.success(`Work order status updated to ${newStatus}`);
      setStatus(newStatus);
    } catch {
      toast.error('Failed to update work order status');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveUpfront = async () => {
    try {
      setUpdating(true);
      const cents = Math.round((parseFloat(upfrontDollars) || 0) * 100);

      if (upfrontReceiptFile) {
        const formData = new FormData();
        formData.append('upfrontAmountCents', String(cents));
        formData.append('receipt', upfrontReceiptFile);
        await jobService.updateJobStatus(job.id, formData);
      } else {
        await jobService.updateJobStatus(job.id, {
          upfrontAmountCents: cents,
        });
      }

      // Synchronously patch cache for immediate UI feedback
      queryClient.setQueriesData({ queryKey: ['fleet-jobs'] }, (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) return old.map((j: any) => j.id === job.id ? { ...j, upfrontAmountCents: cents } : j);
        if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.map((j: any) => j.id === job.id ? { ...j, upfrontAmountCents: cents } : j),
          };
        }
        return old;
      });

      await queryClient.invalidateQueries({ queryKey: ['fleet-jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['job', job.id] });
      setIsEditingUpfront(false);
      setUpfrontReceiptFile(null);
      toast.success('Advance deposit updated successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save deposit');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveServices = async (newServices: any[]) => {
    try {
      setUpdating(true);
      await jobService.updateJobStatus(job.id, {
        serviceItems: newServices.map((s) => ({
          serviceName: s.serviceName,
          category: s.category || 'TIRE_SERVICE',
          unitPriceCents: s.unitPriceCents,
          quantity: s.quantity,
        })),
      });

      await queryClient.invalidateQueries({ queryKey: ['fleet-jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['job', job.id] });
      setShowEditServicesModal(false);
      toast.success('Commercial services updated successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update services');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setUpdating(true);
      await jobService.updateJobStatus(job.id, {
        problemNotes: notesInput,
      });
      await queryClient.invalidateQueries({ queryKey: ['fleet-jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['job', job.id] });
      setIsEditingNotes(false);
      toast.success('Work order notes saved successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save notes');
    } finally {
      setUpdating(false);
    }
  };

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!job.serviceAddress) return;
    navigator.clipboard.writeText(job.serviceAddress);
    setCopied(true);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const navUrl = getNavigationUrl({
    latitude: job.serviceLatitude,
    longitude: job.serviceLongitude,
    address: job.serviceAddress,
  });

  const isTrial = Boolean(job.isTestService);
  const fleetName = job.fleet?.companyName || job.fleet?.name || job.lead?.companyName || job.recipientName || 'Commercial Fleet';
  const fleetCode = job.fleet?.fleetCode || (isTrial ? 'TRIAL-RUN' : 'FLT-CORP');
  const paymentTerms = job.fleet?.paymentTerms || (isTrial ? 'COMPLIMENTARY_TRIAL' : 'NET_30');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="max-w-xl"
    >
      {/* TechnicianJobCard Inspired Minimal Unified Container */}
      <div className="space-y-3.5 -mt-2">
        {/* Header Bar: Job Code, Status Tag, Urgency, ETA */}
        <div className="bg-slate-50/90 rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              #{job.jobCode || job.jobNumber}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full">
              <Zap className="w-2.5 h-2.5 text-amber-600" />
              Fleet Dispatch
            </span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold border border-indigo-200">
              {job.countryCode || country}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-700">
              {job.driverEtaMinutes ? (
                `ETA ~${job.driverEtaMinutes}m`
              ) : job.arrivalWindowStart && job.arrivalWindowEnd ? (
                `${new Date(job.arrivalWindowStart).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}–${new Date(job.arrivalWindowEnd).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
              ) : (
                'Immediate'
              )}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              {formatDate(job.createdAt)}
            </span>
          </div>
        </div>

        {/* Minimal Status Progression Workflow */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2.5 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workflow Stage</span>
            <span className="text-[10px] font-bold text-slate-600 uppercase">{status}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {JOB_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                disabled={updating || status === st}
                onClick={() => handleStatusChange(st)}
                className={`px-2.5 py-1 text-[11px] rounded-lg font-bold border transition cursor-pointer ${
                  status === st
                    ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 disabled:opacity-50'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Trial Run Banner if prospective */}
        {isTrial && (
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-black uppercase tracking-wider text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={10} />
                <span>TRIAL RUN</span>
              </span>
              <span className="font-bold text-amber-950">{job.lead?.companyName || 'Prospective Lead'}</span>
            </div>
            <span className="font-mono font-bold text-xs text-amber-900">
              {centsToDollars(totalCents) === 0 ? '$0.00 Complimentary' : formatCurrency(centsToDollars(totalCents), currencySymbol)}
            </span>
          </div>
        )}

        {/* Unified Card Details: Fleet, Vehicle, Technician */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          {/* Corporate Fleet & Assigned Tech */}
          <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5">
                <Building2 size={13} className="text-indigo-600" />
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Corporate Fleet</span>
                <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                  {fleetCode}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">{fleetName}</h3>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                <span>Terms: <strong>{paymentTerms}</strong></span>
                {job.fleet?.phone && (
                  <a href={`tel:${job.fleet.phone}`} className="text-blue-600 hover:underline font-mono">
                    {job.fleet.phone}
                  </a>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Tech</span>
              <div className="flex items-center gap-1 mt-0.5 justify-end">
                <span className="text-xs font-bold text-slate-800">
                  {job.driver?.fullName || 'Unassigned'}
                </span>
                {isManagement && (
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(true)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                    title="Change technician assignment"
                  >
                    <Edit2 size={12} />
                  </button>
                )}
              </div>
              {job.driver?.phone && (
                <span className="text-[10px] font-mono text-slate-500 block">{job.driver.phone}</span>
              )}
            </div>
          </div>

          {/* On-Scene Driver Contact */}
          {(job.recipientName || job.recipientPhone) && (
            <div className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/60">
              <span className="text-[10px] uppercase font-bold text-slate-500">Unit Operator on Scene:</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{job.recipientName || 'Driver'}</span>
                {job.recipientPhone && (
                  <a href={`tel:${job.recipientPhone}`} className="text-blue-600 hover:underline font-mono font-semibold">
                    {job.recipientPhone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Service Address with GPS link */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between gap-2">
            <a
              href={navUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-1.5 text-xs text-slate-800 hover:text-blue-700 transition font-medium group flex-1"
              title="Open in Maps"
            >
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <span className="line-clamp-2 underline decoration-slate-300 underline-offset-2">
                {job.serviceAddress || 'No service address specified'}
              </span>
            </a>

            <button
              type="button"
              onClick={handleCopyAddress}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition shrink-0 cursor-pointer"
              title="Copy address"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Commercial Vehicle & Unit Number */}
          <div className="flex items-center justify-between text-xs text-slate-700 border-t border-slate-100 pt-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900 truncate">
                {job.vehicle ? `${job.vehicle.year || ''} ${job.vehicle.make} ${job.vehicle.model}`.trim() : 'Commercial Asset'}
              </span>
              <span className="font-mono text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                {job.vehicle?.unitNumber ? `Unit #${job.vehicle.unitNumber}` : (job.vehicle?.licensePlate || 'Fleet Unit')}
              </span>
            </div>
            <span className="font-mono text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 shrink-0 ml-2">
              {job.vehicle?.tireSize || '11R22.5'}
            </span>
          </div>

          {/* Commercial Line Items */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            <div className="bg-slate-100/70 px-3 py-1.5 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <Wrench size={11} className="text-slate-500" />
                <span>Commercial Services ({job.serviceItems?.length || 1})</span>
              </span>
              {isManagement && (
                <button
                  type="button"
                  onClick={() => setShowEditServicesModal(true)}
                  className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 size={10} />
                  <span>Edit Services</span>
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-100 p-1.5">
              {job.serviceItems && job.serviceItems.length > 0 ? (
                job.serviceItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-1.5 px-2 text-xs">
                    <span className="font-medium text-slate-800">{item.serviceName}</span>
                    <span className="font-mono font-bold text-slate-900">
                      Qty: {item.quantity || 1}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 py-1.5 px-2 text-center">Standard Commercial Roadside Service</div>
              )}
            </div>
          </div>

          {/* Work Order Notes with Management Inline Editing */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Work Order & Driver Notes</span>
              {isManagement && (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(!isEditingNotes)}
                  className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  {isEditingNotes ? 'Cancel' : 'Edit'}
                </button>
              )}
            </div>
            {isEditingNotes ? (
              <div className="space-y-2 pt-1">
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  rows={2}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  disabled={updating}
                  onClick={handleSaveNotes}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
                >
                  Save Notes
                </button>
              </div>
            ) : (
              <p className="text-slate-700 italic">
                {notesInput ? `"${notesInput}"` : 'No dispatch notes recorded.'}
              </p>
            )}
          </div>
        </div>

        {/* Commercial Billing Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Commercial Total</span>
              <span className="text-base font-black font-mono text-slate-900">
                {isTrial && centsToDollars(totalCents) === 0
                  ? 'COMPLIMENTARY'
                  : formatCurrency(centsToDollars(totalCents), currencySymbol)}
              </span>
            </div>

            {/* Editable Upfront Deposit / Advance */}
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <span className="text-[10px] uppercase font-bold text-slate-400">Advance Deposit</span>
                {isManagement && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isEditingUpfront && (job.upfrontAmountCents || 0) > 0) {
                        const confirmed = window.confirm(
                          `An advance deposit of ${formatCurrency(job.upfrontAmountCents / 100, currencySymbol)} is currently recorded. Do you want to unlock and edit the deposit?`
                        );
                        if (!confirmed) return;
                      }
                      setIsEditingUpfront(!isEditingUpfront);
                    }}
                    className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                  >
                    {isEditingUpfront ? 'Cancel' : (job.upfrontAmountCents || 0) > 0 ? 'Override' : 'Edit'}
                  </button>
                )}
              </div>
              {isEditingUpfront ? (
                <div className="space-y-1.5 mt-1">
                  <div className="flex items-center gap-1 justify-end">
                    <span className="font-mono text-xs text-slate-400">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={upfrontDollars}
                      onChange={(e) => setUpfrontDollars(e.target.value)}
                      className="w-20 px-2 py-0.5 border border-slate-300 rounded font-mono text-xs font-bold text-right"
                    />
                    <button
                      type="button"
                      disabled={updating}
                      onClick={handleSaveUpfront}
                      className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                      title="Save Deposit"
                    >
                      <Save size={12} />
                    </button>
                  </div>

                  {/* Optional Receipt Image Upload */}
                  <div className="flex items-center gap-1 justify-end">
                    <label className="text-[10px] text-slate-500 flex items-center gap-1 cursor-pointer hover:text-slate-800">
                      <Upload size={10} className="text-slate-400" />
                      <span>{upfrontReceiptFile ? upfrontReceiptFile.name.slice(0, 12) + '...' : 'Attach Receipt'}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setUpfrontReceiptFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    {upfrontReceiptFile && (
                      <button
                        type="button"
                        onClick={() => setUpfrontReceiptFile(null)}
                        className="text-[10px] text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                    {formatCurrency(parseFloat(upfrontDollars) || 0, currencySymbol)} Paid
                  </span>
                  {(job.upfrontReceiptUrl || job.receiptUrl) && (
                    <a
                      href={job.upfrontReceiptUrl || job.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                      title="View Upfront Receipt"
                    >
                      <ImageIcon size={12} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-700 uppercase">Balance Due On Account:</span>
            <span className="text-sm font-mono font-black text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {formatCurrency(centsToDollars(balanceDueCents), currencySymbol)}
            </span>
          </div>
        </div>

        {/* Invoice Generator / PDF Quick Actions */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-800">
              {job.invoice ? `Commercial Invoice #${job.invoice.invoiceNumber}` : 'Official Commercial Invoice'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {job.invoice?.id || job.invoiceId || selectedInvoiceId ? (
              <button
                type="button"
                onClick={() => setSelectedInvoiceId(job.invoice?.id || job.invoiceId || selectedInvoiceId)}
                className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1.5 text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-red-600" />
                <span>View / Print PDF</span>
              </button>
            ) : (status === 'COMPLETED' && canManageInvoices) ? (
              <button
                type="button"
                onClick={() => setShowGeneratePopover(true)}
                className="btn-primary py-1.5 px-3 text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Generate Invoice</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium italic">Available upon completion</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-xs font-bold cursor-pointer">
            Close
          </button>
        </div>
      </div>

      {showEditServicesModal && (
        <EditJobServicesModal
          isOpen={showEditServicesModal}
          onClose={() => setShowEditServicesModal(false)}
          currencySymbol={currencySymbol}
          initialServices={
            (job.serviceItems && job.serviceItems.length > 0)
              ? job.serviceItems.map((si: any) => ({
                  serviceId: si.id || si.serviceName,
                  serviceName: si.serviceName,
                  category: si.category || 'TIRE_SERVICE',
                  unitPriceCents: si.unitPriceCents || 0,
                  quantity: si.quantity || 1,
                }))
              : [
                  {
                    serviceId: 'TIRE_SWAP_OFF_RIM',
                    serviceName: 'Tire Swap (OFF RIM)',
                    category: 'TIRE_SERVICE',
                    unitPriceCents: 16000,
                    quantity: 1,
                  },
                ]
          }
          onSave={handleSaveServices}
          isSaving={updating}
        />
      )}

      {showAssignModal && (
        <AssignDriverModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          job={job}
        />
      )}

      {selectedInvoiceId && (
        <InvoicePdfModal
          isOpen={!!selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          invoiceId={selectedInvoiceId}
        />
      )}

      {showGeneratePopover && (
        <GenerateInvoicePopover
          isOpen={showGeneratePopover}
          onClose={() => setShowGeneratePopover(false)}
          job={job}
          onSuccess={(inv) => {
            setSelectedInvoiceId(inv.id);
          }}
        />
      )}
    </Modal>
  );
}
