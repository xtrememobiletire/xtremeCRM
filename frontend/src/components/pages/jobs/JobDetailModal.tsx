import { useState } from 'react';
import { 
  Phone, 
  Car, 
  MapPin, 
  Calculator, 
  FileText, 
  Printer, 
  Zap, 
  Copy, 
  Check, 
  Edit2,
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
import { accountingService } from '../../../services/accountingService';
import { jobService } from '../../../services/jobService';
import { getNavigationUrl } from '../../../utils/navigation';
import { toast } from 'sonner';

interface JobDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}

export default function JobDetailModal({ isOpen, onClose, job }: JobDetailModalProps) {
  const { user } = useAuth();
  const isAdminOrAccountant = user?.role === 'ADMIN' || user?.role === 'GENERAL_MANAGER' || user?.role === 'ACCOUNTANT';
  const isManagement = user?.role === 'ADMIN' || user?.role === 'GENERAL_MANAGER' || user?.role === 'DISPATCHER';
  const canManageInvoices = isAdminOrAccountant || user?.role === 'DISPATCHER';
  const { country, currencySymbol } = useTenant();
  const updateStatusMutation = useUpdateJobStatus();
  const queryClient = useQueryClient();

  const [updating, setUpdating] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [showGeneratePopover, setShowGeneratePopover] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditServicesModal, setShowEditServicesModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Management Edit States
  const [status, setStatus] = useState<string>(job?.status || 'PENDING');
  const [isEditingUpfront, setIsEditingUpfront] = useState(false);
  const [upfrontDollars, setUpfrontDollars] = useState<string>(
    job?.upfrontAmountCents ? (job.upfrontAmountCents / 100).toFixed(2) : '0.00'
  );
  const [upfrontReceiptFile, setUpfrontReceiptFile] = useState<File | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState<string>(job?.problemNotes || job?.notes || '');

  // Accountant expense stating local state
  const itPlatformFeeCents = country === 'CA' ? 150 : 100;
  const [materialCost, setMaterialCost] = useState<string>(
    job?.materialCostCents ? (job.materialCostCents / 100).toFixed(2) : ''
  );
  const [repairerFee, setRepairerFee] = useState<string>(
    job?.repairerFeeCents ? (job.repairerFeeCents / 100).toFixed(2) : ''
  );
  const [otherExpense, setOtherExpense] = useState<string>(
    job?.otherExpenseCents ? (job.otherExpenseCents / 100).toFixed(2) : ''
  );
  const [expenseNotes, setExpenseNotes] = useState<string>(job?.expenseNotes || '');
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  // Derived financial metrics
  const matCents = Math.round((parseFloat(materialCost) || 0) * 100);
  const repCents = Math.round((parseFloat(repairerFee) || 0) * 100);
  const othCents = Math.round((parseFloat(otherExpense) || 0) * 100);
  const totalJobExpenseCents = matCents + repCents + othCents;
  const netProfitCents = (job?.totalAmount || job?.totalCents || 0) - totalJobExpenseCents;

  if (!job) return null;

  const totalCents = job.totalCents || job.totalAmount || 0;
  const currentUpfrontCents = Math.round((parseFloat(upfrontDollars) || 0) * 100);
  const balanceDueCents = Math.max(0, totalCents - currentUpfrontCents);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdating(true);
      await updateStatusMutation.mutateAsync({ id: job.id, status: newStatus });
      toast.success(`Job status updated to ${newStatus}`);
      setStatus(newStatus);
    } catch {
      toast.error('Failed to update status');
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

      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['job', job.id] });
      setIsEditingUpfront(false);
      setUpfrontReceiptFile(null);
      toast.success('Upfront deposit amount saved successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save upfront deposit');
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

      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['job', job.id] });
      setShowEditServicesModal(false);
      toast.success('Work order services updated successfully');
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
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['job', job.id] });
      setIsEditingNotes(false);
      toast.success('Internal dispatch notes saved successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save notes');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveExpenses = async () => {
    try {
      await accountingService.stateJobExpenses({
        jobId: job.id,
        materialCostCents: matCents,
        repairerFeeCents: repCents,
        otherExpenseCents: othCents,
        expenseNotes,
      });
      setShowExpenseForm(false);
      toast.success('Accountant expenses stated and ledger derived successfully');
    } catch {
      toast.error('Failed to state job expenses');
    }
  };

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    const addr = job.serviceAddress || job.locationAddress;
    if (!addr) return;
    navigator.clipboard.writeText(addr);
    setCopied(true);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const navUrl = getNavigationUrl({
    latitude: job.serviceLatitude,
    longitude: job.serviceLongitude,
    address: job.serviceAddress || job.locationAddress,
  });

  const isUrgent = job.urgency === 'URGENT' || job.urgency === 'EMERGENCY' || job.urgency === 'HIGH';
  const customerName = job.customer?.fullName || job.customer?.name || job.recipientName || 'Walk-in Customer';
  const customerPhone = job.customer?.phone || job.recipientPhone;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="max-w-xl"
    >
      {/* TechnicianJobCard Style Unified Minimal Card Container */}
      <div className="space-y-3.5 -mt-2">
        {/* Header Bar: Job Code, Status Tag, Urgency, ETA */}
        <div className="bg-slate-50/90 rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              #{job.jobCode || job.jobNumber}
            </span>
            {isUrgent ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full">
                <Zap className="w-2.5 h-2.5 text-amber-600" />
                Roadside
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-100/70 border border-blue-300 px-2 py-0.5 rounded-full">
                Scheduled
              </span>
            )}
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

        {/* Minimal Workflow Status Progression Bar */}
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

        {/* Unified Card Details: Customer, Address, Vehicle, Technician */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          {/* Customer & Phone */}
          <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Customer</span>
              <h3 className="text-sm font-bold text-slate-900">{customerName}</h3>
              {customerPhone ? (
                <a
                  href={`tel:${customerPhone}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 mt-0.5 transition"
                >
                  <Phone className="w-3 h-3 text-blue-500" />
                  <span>{customerPhone}</span>
                </a>
              ) : (
                <span className="text-xs text-slate-400 mt-0.5 block">Phone on file</span>
              )}
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

          {/* Address with 1-click Navigation & Clipboard */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start justify-between gap-2">
            <a
              href={navUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-1.5 text-xs text-slate-800 hover:text-blue-700 transition font-medium group flex-1"
              title="Open in Apple Maps / Google Maps"
            >
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <span className="line-clamp-2 underline decoration-slate-300 underline-offset-2">
                {job.serviceAddress || job.locationAddress || 'No address specified'}
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

          {/* Vehicle & Tires */}
          <div className="flex items-center justify-between text-xs text-slate-700 border-t border-slate-100 pt-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900 truncate">
                {job.vehicle ? `${job.vehicle.year || ''} ${job.vehicle.make} ${job.vehicle.model}`.trim() : 'Vehicle on file'}
              </span>
              {job.vehicle?.licensePlate && (
                <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  {job.vehicle.licensePlate}
                </span>
              )}
            </div>
            {job.vehicle?.tireSize && (
              <span className="font-mono text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 shrink-0 ml-2">
                {job.vehicle.tireSize}
              </span>
            )}
          </div>

          {/* Work Order Services Breakdown */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            <div className="bg-slate-100/70 px-3 py-1.5 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <Wrench size={11} className="text-slate-500" />
                <span>Required Services ({job.serviceItems?.length || job.lineItems?.length || 1})</span>
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
              ) : job.lineItems && job.lineItems.length > 0 ? (
                job.lineItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-1.5 px-2 text-xs">
                    <span className="font-medium text-slate-800">{item.serviceName || item.description}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(centsToDollars(item.price || 0), currencySymbol)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 py-1.5 px-2 text-center">Standard mobile roadside call service</div>
              )}
            </div>
          </div>

          {/* Internal Notes with Management Inline Editing */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Dispatch & Safety Notes</span>
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

        {/* Minimal Financial Ledger & Upfront Deposit Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Quoted</span>
              <span className="text-base font-black font-mono text-slate-900">
                {formatCurrency(centsToDollars(totalCents), currencySymbol)}
              </span>
            </div>

            {/* Editable Upfront Deposit */}
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <span className="text-[10px] uppercase font-bold text-slate-400">Advance Deposit</span>
                {isManagement && (
                  <button
                    type="button"
                    onClick={() => setIsEditingUpfront(!isEditingUpfront)}
                    className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                  >
                    {isEditingUpfront ? 'Cancel' : 'Edit'}
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
            <span className="text-xs font-bold text-slate-700 uppercase">Balance Due On Scene:</span>
            <span className="text-sm font-mono font-black text-amber-950 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
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

        {/* Accountant Expense Stating Section (Admins/Accountants only) */}
        {isAdminOrAccountant && (
          <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  COGS & Expense Stating
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseForm(!showExpenseForm)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
              >
                {showExpenseForm ? 'Close Editor' : 'State / Edit Expenses'}
              </button>
            </div>

            {showExpenseForm && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Wholesale Tire/Parts</label>
                  <input
                    type="number"
                    step="0.01"
                    value={materialCost}
                    onChange={(e) => setMaterialCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tech Labor Fee</label>
                  <input
                    type="number"
                    step="0.01"
                    value={repairerFee}
                    onChange={(e) => setRepairerFee(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Other Incidental</label>
                  <input
                    type="number"
                    step="0.01"
                    value={otherExpense}
                    onChange={(e) => setOtherExpense(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={expenseNotes}
                    onChange={(e) => setExpenseNotes(e.target.value)}
                    placeholder="Audit notes / supplier ref..."
                    className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleSaveExpenses}
                    className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Save Expenses
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-center">
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200/60">
                <div className="text-[9px] font-bold uppercase text-slate-400">Total Expenses</div>
                <div className="text-xs font-mono font-black text-rose-600">
                  {formatCurrency(centsToDollars(totalJobExpenseCents), currencySymbol)}
                </div>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200/60">
                <div className="text-[9px] font-bold uppercase text-slate-400">Net Profit</div>
                <div className={`text-xs font-mono font-black ${netProfitCents >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(centsToDollars(netProfitCents), currencySymbol)}
                </div>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200/60">
                <div className="text-[9px] font-bold uppercase text-slate-400">Platform Royalty</div>
                <div className="text-xs font-mono font-black text-slate-700">
                  {formatCurrency(centsToDollars(itPlatformFeeCents), currencySymbol)}
                </div>
              </div>
            </div>
          </div>
        )}

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
                    serviceId: 'TIRE_REPAIR',
                    serviceName: 'Tire Repair (Plug)',
                    category: 'TIRE_SERVICE',
                    unitPriceCents: 12000,
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
          onClose={() => setSelectedInvoiceId('')}
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
