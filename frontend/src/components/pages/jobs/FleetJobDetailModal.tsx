import { useState } from 'react';
import { 
  Building2, 
  Truck, 
  MapPin, 
  Phone, 
  Mail, 
  MessageSquare, 
  FileText, 
  User, 
  Printer, 
  Sparkles,
  CreditCard
} from 'lucide-react';
import Modal from '../../ui/Modal';
import StatusBadge from '../../ui/StatusBadge';
import { formatCurrency, centsToDollars } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';
import { useTenant } from '../../../context/TenantContext';
import { useSocket } from '../../../context/SocketContext';
import { useAuth } from '../../../context/AuthContext';
import { useUpdateJobStatus } from '../../../hooks/useJobs';
import { JOB_STATUSES } from '../../../constants/statuses';
import { accountingService } from '../../../services/accountingService';
import InvoicePdfModal from '../../invoices/InvoicePdfModal';
import { toast } from 'sonner';

interface FleetJobDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}

export default function FleetJobDetailModal({ isOpen, onClose, job }: FleetJobDetailModalProps) {
  const { user } = useAuth();
  const isAdminOrAccountant = user?.role === 'ADMIN' || user?.role === 'GENERAL_MANAGER' || user?.role === 'ACCOUNTANT';
  const { country, currencySymbol } = useTenant();
  const { openChatJob } = useSocket();
  const updateStatusMutation = useUpdateJobStatus();
  const [updating, setUpdating] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(job?.invoice?.id || null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [status, setStatus] = useState<string>(job?.status || 'PENDING');

  if (!job) return null;

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

  const handleGenerateInvoice = async () => {
    try {
      setIsGeneratingInvoice(true);
      const inv = await accountingService.generateInvoice(job.id);
      toast.success(`Fleet invoice #${inv.invoiceNumber} generated`);
      setSelectedInvoiceId(inv.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate fleet invoice');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const isTrial = Boolean(job.isTestService);
  const fleetName = job.fleet?.companyName || job.lead?.companyName || job.recipientName || 'Commercial Fleet';
  const fleetCode = job.fleet?.fleetCode || (isTrial ? 'TRIAL-RUN' : 'FLT-CORP');
  const paymentTerms = job.fleet?.paymentTerms || (isTrial ? 'COMPLIMENTARY_TRIAL' : 'NET_30');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Fleet Work Order • #${job.jobCode || job.jobNumber}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Trial Service Banner */}
        {isTrial && (
          <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-300 space-y-2 text-xs shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-black uppercase tracking-wider text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full shadow-2xs flex items-center gap-1">
                  <Sparkles size={11} />
                  <span>PROSPECTIVE TRIAL RUN</span>
                </span>
                <span className="font-bold text-amber-950 text-sm">
                  {job.lead?.companyName || 'Prospective Fleet Account'}
                </span>
              </div>
              <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
                {centsToDollars(job.totalAmount || job.totalCents) === 0 ? '$0.00 Complimentary Trial' : `Trial Fee: ${formatCurrency(centsToDollars(job.totalAmount || job.totalCents), currencySymbol)}`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-amber-200/80 text-slate-700">
              <div>
                <span className="text-amber-800/70 block text-[10px] uppercase font-bold">Decision Maker</span>
                <span className="font-bold text-slate-900 text-xs">
                  {job.lead?.contactPerson || 'Fleet Manager'}
                </span>
              </div>
              <div>
                <span className="text-amber-800/70 block text-[10px] uppercase font-bold">Direct Phone</span>
                <span className="font-mono text-slate-800 text-xs">
                  {job.lead?.phone || job.recipientPhone || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-amber-800/70 block text-[10px] uppercase font-bold">Trial Outcome</span>
                <span className="font-bold text-amber-800 text-xs">
                  {status === 'COMPLETED' ? 'Ready for Formal Onboarding' : 'Field Feasibility in Progress'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50/80 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <StatusBadge status={status} />
            <StatusBadge status={job.urgency} />
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold border border-indigo-200">
              {job.countryCode || country}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                openChatJob({
                  id: job.id,
                  jobCode: job.jobCode || job.jobNumber,
                  driverName: job.driver?.fullName || 'Assigned Technician',
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition shadow-2xs cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-red-600" />
              <span>Two-Way Chat</span>
            </button>
            <div className="text-xs text-slate-400 font-mono">Created: {formatDate(job.createdAt)}</div>
          </div>
        </div>

        {/* Workflow Advancement */}
        <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Work Order Status Workflow
          </label>
          <div className="flex flex-wrap gap-1.5">
            {JOB_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                disabled={updating || status === st}
                onClick={() => handleStatusChange(st)}
                className={`px-3 py-1 text-xs rounded-xl font-bold border transition cursor-pointer ${
                  status === st
                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-50'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column: Fleet Corporate Profile & Commercial Unit Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Left: Corporate Account Profile */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={14} className="text-indigo-600" />
                <span>Corporate Fleet Account</span>
              </h4>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                {fleetCode}
              </span>
            </div>

            <div>
              <div className="text-sm font-black text-slate-900">{fleetName}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                <CreditCard size={12} className="text-slate-400" />
                <span>Payment Terms: <strong>{paymentTerms}</strong></span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 space-y-1 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-medium">
                <User size={13} className="text-slate-400 shrink-0" />
                <span>Manager: <strong>{job.fleet?.contactPerson || job.lead?.contactPerson || 'Fleet Dispatcher'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <Phone size={13} className="text-slate-400 shrink-0" />
                <span>{job.fleet?.phone || job.lead?.phone || job.recipientPhone || 'N/A'}</span>
              </div>
              {job.fleet?.email && (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Mail size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{job.fleet.email}</span>
                </div>
              )}
            </div>

            {/* On-Scene Unit Driver / Contact */}
            {(job.recipientName || job.recipientPhone) && (
              <div className="pt-2 border-t border-slate-200/80 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">On-Scene Driver / Operator:</span>
                <span className="font-semibold text-slate-900">{job.recipientName || 'Unit Driver'}</span>
                {job.recipientPhone && (
                  <span className="font-mono text-slate-600 ml-2">({job.recipientPhone})</span>
                )}
              </div>
            )}
          </div>

          {/* Right: Commercial Vehicle / Asset Details */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Truck size={14} className="text-red-600" />
                <span>Commercial Vehicle / Asset</span>
              </h4>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800">
                {job.vehicle?.unitNumber ? `Unit #${job.vehicle.unitNumber}` : 'Commercial Unit'}
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-slate-900">
                {job.vehicle ? `${job.vehicle.year || ''} ${job.vehicle.make} ${job.vehicle.model}`.trim() : 'Commercial Asset'}
              </div>
              <div className="text-xs font-mono text-slate-600 mt-0.5">
                Plate: <strong>{job.vehicle?.licensePlate || 'Fleet Plate'}</strong> • VIN: {job.vehicle?.vin || 'On File'}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Commercial Tire Spec:</span>
                <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  {job.vehicle?.tireSize || '11R22.5'}
                </span>
              </div>
              {job.serviceAddress && (
                <div className="flex items-start gap-1.5 pt-1 text-slate-600">
                  <MapPin size={13} className="text-red-500 shrink-0 mt-0.5" />
                  <span className="font-medium">{job.serviceAddress}</span>
                </div>
              )}
            </div>

            {/* Problem / Roadside Notes */}
            {job.problemNotes && (
              <div className="pt-2 border-t border-slate-200/80 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Work Order Notes:</span>
                <p className="text-slate-700 italic mt-0.5">"{job.problemNotes}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Assigned Technician & Roadside Dispatch Card */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
              <Truck size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Assigned Technician</span>
              <div className="text-xs font-bold text-slate-900">
                {job.driver?.fullName || 'No technician assigned yet'}
              </div>
              {job.driver?.phone && (
                <div className="text-[11px] font-mono text-slate-500">{job.driver.phone}</div>
              )}
            </div>
          </div>

          {job.estimatedArrivalAt && (
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Estimated On-Scene</span>
              <span className="font-mono font-bold text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                {formatDate(job.estimatedArrivalAt)}
              </span>
            </div>
          )}
        </div>

        {/* Commercial Line Items Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
          <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Work Order Commercial Services</span>
            <span className="font-mono text-slate-500 text-[11px]">
              {job.serviceItems?.length || 0} Items
            </span>
          </div>
          <div className="divide-y divide-slate-100 p-2">
            {job.serviceItems && job.serviceItems.length > 0 ? (
              job.serviceItems.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center py-2 px-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{item.serviceName || item.itemDetails || 'Fleet Service'}</div>
                    <div className="text-[10px] text-slate-500">Qty: {item.quantity || 1}</div>
                  </div>
                  <div className="font-mono font-bold text-slate-900">
                    {formatCurrency(centsToDollars(item.unitPriceCents || item.priceCents || 0), currencySymbol)}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">
                Standard Commercial Roadside Service Call (Includes Mounting & Inflation)
              </div>
            )}
          </div>
        </div>

        {/* Corporate Billing & Invoicing Summary */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Commercial Ledger</span>
            <div className="text-lg font-black font-mono mt-0.5">
              {centsToDollars(job.totalAmount || job.totalCents) === 0 && isTrial
                ? 'COMPLIMENTARY TRIAL'
                : formatCurrency(centsToDollars(job.totalAmount || job.totalCents), currencySymbol)}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              Billed to {fleetName} • Account Terms: {paymentTerms}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {job.invoice?.id || selectedInvoiceId ? (
              <button
                type="button"
                onClick={() => setSelectedInvoiceId(job.invoice?.id || selectedInvoiceId)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <Printer size={13} />
                <span>View Invoice</span>
              </button>
            ) : isAdminOrAccountant ? (
              <button
                type="button"
                disabled={isGeneratingInvoice}
                onClick={handleGenerateInvoice}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                <FileText size={13} />
                <span>{isGeneratingInvoice ? 'Generating...' : 'Generate Corporate Invoice'}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Invoice PDF Modal */}
      {selectedInvoiceId && (
        <InvoicePdfModal
          invoiceId={selectedInvoiceId}
          isOpen={Boolean(selectedInvoiceId)}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </Modal>
  );
}
