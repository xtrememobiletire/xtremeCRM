import { useState, useEffect, useRef } from 'react';
import { Printer, CheckCircle2, Clock, X, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { accountingService } from '../../services/accountingService';
import { toast } from 'sonner';

interface InvoicePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  onStatusUpdated?: () => void;
}

export default function InvoicePdfModal({
  isOpen,
  onClose,
  invoiceId,
  onStatusUpdated,
}: InvoicePdfModalProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && invoiceId) {
      setLoading(true);
      accountingService
        .getInvoicePdfData(invoiceId)
        .then((res) => setData(res))
        .catch(() => {
          toast.error('Failed to load invoice details');
          onClose();
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, invoiceId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleMarkPaid = async () => {
    try {
      setUpdating(true);
      await accountingService.updateInvoiceStatus(invoiceId, 'PAID');
      toast.success('Invoice marked as PAID');
      if (data) {
        setData({
          ...data,
          status: 'PAID',
          summary: { ...data.summary, isPaid: true },
        });
      }
      onStatusUpdated?.();
    } catch {
      toast.error('Failed to update invoice status');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Top Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-slate-800">
              {data?.invoiceNumber || 'Commercial Invoice'}
            </span>
            {data && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  data.status === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {data.status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {data && data.status !== 'PAID' && (
              <button
                type="button"
                disabled={updating}
                onClick={handleMarkPaid}
                className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5 text-emerald-700 hover:bg-emerald-50 border-emerald-300"
              >
                <CheckCircle2 size={13} />
                <span>Mark Paid</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
            >
              <Printer size={13} />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading invoice document...</span>
          </div>
        ) : !data ? (
          <div className="p-8 text-center text-slate-500 text-xs">Failed to load invoice</div>
        ) : (
          <div ref={printRef} className="p-6 sm:p-10 space-y-6 text-slate-800 font-sans print:p-0">
            {/* Header: Brand & Provider */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-600 text-white font-black text-sm flex items-center justify-center">
                    XT
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                    XTREME <span className="text-red-600">MOBILE TIRE</span>
                  </h1>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  24/7 Mobile Tire Service & Roadside Fleet Dispatch
                </p>
                <div className="text-[11px] text-slate-600 mt-2 space-y-0.5">
                  <p className="flex items-center gap-1.5">
                    <MapPin size={11} className="text-slate-400" />
                    <span>{data.company?.hub?.address}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone size={11} className="text-slate-400" />
                    <span>{data.company?.hub?.phone}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Mail size={11} className="text-slate-400" />
                    <span>{data.company?.paymentEmail}</span>
                  </p>
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="text-left sm:text-right space-y-1">
                <div className="inline-block bg-slate-900 text-white font-mono font-black text-sm px-3 py-1 rounded">
                  INVOICE: {data.invoiceNumber}
                </div>
                <div className="text-xs text-slate-600 pt-1">
                  <span className="font-semibold">Issue Date:</span> {data.issueDate}
                </div>
                <div className="text-xs text-slate-600">
                  <span className="font-semibold">Due Date:</span> {data.dueDate}
                </div>
                <div className="pt-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold ${
                      data.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {data.status === 'PAID' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                    <span>{data.status}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Bill To Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                  Bill To Client
                </h3>
                <div className="font-bold text-slate-900 text-sm">{data.billTo?.name}</div>
                {data.billTo?.contactPerson && (
                  <div className="text-slate-600">Attn: {data.billTo.contactPerson}</div>
                )}
                {data.billTo?.address && <div className="text-slate-500 mt-0.5">{data.billTo.address}</div>}
                {data.billTo?.phone && <div className="text-slate-600 font-mono mt-0.5">{data.billTo.phone}</div>}
                {data.billTo?.email && <div className="text-slate-500">{data.billTo.email}</div>}
              </div>

              <div className="sm:text-right">
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                  Account Details
                </h3>
                {data.billTo?.fleetCode && (
                  <div className="text-slate-700">
                    Fleet Code: <span className="font-mono font-bold text-slate-900">{data.billTo.fleetCode}</span>
                  </div>
                )}
                <div className="text-slate-600 mt-1">
                  Payment Currency: <span className="font-bold font-mono text-slate-900">{data.currency}</span>
                </div>
                <div className="text-slate-500 text-[11px] mt-1">
                  Tax Reg: {data.company?.hub?.taxLabel}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Service Details / Parts</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items?.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-medium text-slate-900">{item.details}</td>
                      <td className="py-3 px-3 text-center font-mono">{item.quantity}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {item.unitPriceFormatted}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {item.totalFormatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Summary Block */}
            <div className="flex justify-end">
              <div className="w-full sm:w-72 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold text-slate-800">{data.summary?.subtotal}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                  <span>{data.company?.hub?.taxLabel || 'Sales Tax'}:</span>
                  <span className="font-mono font-semibold text-slate-800">{data.summary?.tax}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-bold text-slate-900">
                  <span>Total Due:</span>
                  <span className="font-mono text-base font-black text-red-600">
                    {data.summary?.grandTotal}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Remittance Instructions */}
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-1.5 text-xs">
              <div className="font-bold text-[11px] uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <Building2 size={13} />
                <span>Payment Remittance Instructions</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Please submit electronic payment via E-Transfer or Corporate Direct Deposit to:{' '}
                <strong className="text-white font-mono">{data.company?.paymentEmail}</strong>.
                Always include invoice reference <strong className="text-red-300 font-mono">#{data.invoiceNumber}</strong> in the transfer description.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
