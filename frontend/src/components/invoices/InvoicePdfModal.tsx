import { useState, useEffect, useRef } from 'react';
import {
  Printer,
  CheckCircle2,
  X,
  Phone,
  Mail,
  MapPin,
  Edit3,
  RotateCcw,
  Send,
  RefreshCw,
} from 'lucide-react';
import { accountingService } from '../../services/accountingService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

interface InvoicePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  initialSendMode?: boolean;
  onStatusUpdated?: () => void;
}

const REGIONAL_HUBS = {
  CA: {
    country: 'Canada',
    address: '857 Winterton Way, Mississauga, ON L5V 1Z5',
    phone: '+1 (416) 555-0192',
    taxLabel: 'HST (13%)',
    paymentEmail: 'payments@xtrememobiletire.com',
    bankInfo: 'Interac E-Transfer to payments@xtrememobiletire.com\nDirect Deposit: TD Canada Trust (Transit: 01922, Inst: 004)',
  },
  US: {
    country: 'United States',
    address: '11815 Medway Church Loop, Manassas, VA 20109',
    phone: '+1 (703) 555-0144',
    taxLabel: 'Sales Tax (8%)',
    paymentEmail: 'payments.us@xtrememobiletire.com',
    bankInfo: 'ACH / Wire Remittance: Wells Fargo Bank, N.A.\nZelle Transfer: payments.us@xtrememobiletire.com',
  },
  UK: {
    country: 'United Kingdom',
    address: 'Independent UK Hub, 24-28 Holborn, London EC1N 2HT',
    phone: '+44 20 7946 0912',
    taxLabel: 'VAT (20%)',
    paymentEmail: 'payments.uk@xtrememobiletire.com',
    bankInfo: 'Faster Payments / BACS: Barclays Bank PLC\nSort Code: 20-00-00, Account No: 83921048',
  },
};

/**
 * Load and render a printable invoice when open, with local address overrides
 * and a Mark Paid action. Address edits affect the preview/printout without saving.
 */
export default function InvoicePdfModal({
  isOpen,
  onClose,
  invoiceId,
  initialSendMode = false,
  onStatusUpdated,
}: InvoicePdfModalProps) {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const { user } = useAuth();
  const isPortalClient = user?.role === 'FLEET_MANAGER' || user?.role === 'CUSTOMER_MEMBER';

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // Editable Regional Company Address & Client Address
  const [selectedCountryCode, setSelectedCountryCode] = useState<'CA' | 'US' | 'UK'>('CA');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && invoiceId) {
      setLoading(true);
      accountingService
        .getInvoicePdfData(invoiceId)
        .then((res) => {
          setData(res);
          const cCode = (res.countryCode || 'CA') as 'CA' | 'US' | 'UK';
          setSelectedCountryCode(cCode);
          setCompanyAddress(res.company?.hub?.address || REGIONAL_HUBS[cCode]?.address || '');
          setCompanyPhone(res.company?.hub?.phone || REGIONAL_HUBS[cCode]?.phone || '');
          setClientName(res.billTo?.name || '');
          setClientAddress(res.billTo?.address || '');
          setClientPhone(res.billTo?.phone || '');
          setClientEmail(res.billTo?.email || '');
          setEmailSubject(`Xtreme Mobile Tire - Invoice #${res.invoiceNumber || ''}`);
          if (initialSendMode) setIsEditingAddress(true);
        })
        .catch(() => {
          toast.error('Failed to load invoice details');
          onClose();
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, invoiceId]);

  /** Select a regional hub and replace the preview's company address and phone. */
  const handleCountryHubChange = (cc: 'CA' | 'US' | 'UK') => {
    setSelectedCountryCode(cc);
    const hub = REGIONAL_HUBS[cc];
    setCompanyAddress(hub.address);
    setCompanyPhone(hub.phone);
  };

  /** Restore preview contacts and hub selection from the loaded invoice, if available. */
  const handleResetAddresses = () => {
    if (!data) return;
    const cCode = (data.countryCode || 'CA') as 'CA' | 'US' | 'UK';
    setSelectedCountryCode(cCode);
    setCompanyAddress(data.company?.hub?.address || REGIONAL_HUBS[cCode]?.address || '');
    setCompanyPhone(data.company?.hub?.phone || REGIONAL_HUBS[cCode]?.phone || '');
    setClientName(data.billTo?.name || '');
    setClientAddress(data.billTo?.address || '');
    setClientPhone(data.billTo?.phone || '');
    setClientEmail(data.billTo?.email || '');
    setEmailSubject(`Xtreme Mobile Tire - Invoice #${data.invoiceNumber || ''}`);
    toast.success('Addresses reset to default record');
  };

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  /**
   * Mark the invoice PAID, update the local preview, and notify onStatusUpdated;
   * request failures are shown as an error toast.
   */
  const handleMarkPaid = async () => {
    try {
      setUpdating(true);
      await accountingService.updateInvoiceStatus(invoiceId, 'PAID');
      toast.success('Invoice marked as PAID');
      if (data) {
        setData({
          ...data,
          status: 'PAID',
          summary: { ...data.summary, isPaid: true, balanceDue: '$0.00' },
        });
      }
      onStatusUpdated?.();
    } catch {
      toast.error('Failed to update invoice status');
    } finally {
      setUpdating(false);
    }
  };


  const handleSendEmail = async () => {
    if (!clientEmail || !clientEmail.trim()) {
      toast.error('Please enter a valid Client Email before sending');
      setIsEditingAddress(true);
      return;
    }
    try {
      setIsSendingEmail(true);
      await accountingService.sendInvoiceEmail(invoiceId, {
        recipientEmail: clientEmail.trim(),
        clientName,
        clientAddress,
        clientPhone,
        subject: emailSubject.trim() || undefined,
      });
      toast.success(`Invoice #${data?.invoiceNumber || ''} emailed successfully to ${clientEmail.trim()}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send invoice email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const activeHub = REGIONAL_HUBS[selectedCountryCode] || REGIONAL_HUBS.CA;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      {/* Print-specific style sheet override */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #invoice-printable-document, #invoice-printable-document * {
            visibility: visible;
          }
          #invoice-printable-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 100% !important;
            margin: 0 !important;
            padding: 12mm 15mm !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            z-index: 999999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto flex flex-col max-h-[96vh]">
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0 gap-3 no-print">
          <div className="flex items-center gap-3">
            <img
              src="https://res.cloudinary.com/ebjikx52/image/upload/v1792426897/xtreme/frontend/favicon_png.png"
              alt="Xtreme"
              className="w-8 h-8 rounded-lg object-contain bg-slate-800 p-0.5 border border-slate-700 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-white">
                  {data?.invoiceNumber || 'Official Invoice'}
                </span>
                {data && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      data.status === 'PAID'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : data.status === 'PARTIAL'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-red-500/20 text-red-400 border border-red-500/40'
                    }`}
                  >
                    {data.status}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                A4 Graphic Template • Regional Hub Remittance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isPortalClient && (
              <button
                type="button"
                onClick={() => setIsEditingAddress(!isEditingAddress)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  isEditingAddress
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Edit3 size={13} />
                <span>{isEditingAddress ? 'Done Editing' : 'Alter Addresses'}</span>
              </button>
            )}

            {!isPortalClient && data && data.status !== 'PAID' && (
              <button
                type="button"
                disabled={updating}
                onClick={handleMarkPaid}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
              >
                <CheckCircle2 size={13} />
                <span>Mark Paid</span>
              </button>
            )}

            {!isPortalClient && (
              <button
                type="button"
                disabled={isSendingEmail}
                onClick={handleSendEmail}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm cursor-pointer disabled:opacity-50"
                title="Send invoice via email to client"
              >
                {isSendingEmail ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                <span>{isSendingEmail ? 'Sending...' : 'Send to Client'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white transition shadow-sm cursor-pointer"
            >
              <Printer size={13} />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Address Customization Drawer (Hidden on print) */}
        {isEditingAddress && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs space-y-3 shrink-0 no-print animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Regional Address Alteration Controls
              </span>
              <button
                type="button"
                onClick={handleResetAddresses}
                className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[11px]"
              >
                <RotateCcw size={11} />
                <span>Reset to defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company Hub Settings */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Our Regional Hub:</span>
                  <div className="flex gap-1">
                    {(['CA', 'US', 'UK'] as const).map((cc) => (
                      <button
                        key={cc}
                        type="button"
                        onClick={() => handleCountryHubChange(cc)}
                        className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] transition ${
                          selectedCountryCode === cc
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cc}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block">Company Address</label>
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block">Company Phone</label>
                  <input
                    type="text"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs mt-0.5"
                  />
                </div>
              </div>

              {/* Client Billing Settings */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block">Customer / Fleet Address:</span>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block">Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block">Billing / Service Address</label>
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="e.g. 120 Fleet Depot Rd, Unit 4, Brampton ON"
                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs mt-0.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block">Client Phone</label>
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block">Client Email</label>
                    <input
                      type="text"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs mt-0.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block font-semibold">Email Subject / Title</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="e.g. Xtreme Mobile Tire - Invoice #..."
                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs mt-0.5 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Document Container */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-8 bg-slate-100 flex justify-center">
          {loading ? (
            <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
              <span>Formatting invoice document...</span>
            </div>
          ) : !data ? (
            <div className="p-12 text-center text-slate-500 text-xs">Failed to load invoice</div>
          ) : (
            /* Printable Invoice Document conforming to Graphic Template */
            <div
              id="invoice-printable-document"
              ref={printRef}
              className="bg-white shadow-lg w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 relative flex flex-col justify-between text-slate-800 font-sans border border-slate-200"
            >
              {/* TOP GEOMETRIC ACCENTS (Red & Slate Polygons matching template) */}
              <div className="absolute top-0 right-0 w-64 h-24 overflow-hidden pointer-events-none z-0">
                <svg
                  viewBox="0 0 250 100"
                  className="w-full h-full"
                  preserveAspectRatio="none"
                >
                  {/* Dark slate backdrop polygon */}
                  <polygon points="60,0 250,0 250,100 140,40" fill="#1e293b" />
                  {/* Striking bright red polygon */}
                  <polygon points="120,0 250,0 250,80 170,0" fill="#dc2626" />
                  {/* Red diamond accent */}
                  <rect x="135" y="12" width="16" height="16" transform="rotate(45 143 20)" fill="#ef4444" />
                  {/* White thin outline diamond */}
                  <rect x="110" y="24" width="14" height="14" transform="rotate(45 117 31)" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
                </svg>
              </div>

              {/* Main Content Area */}
              <div className="space-y-6 relative z-10 pt-4 sm:pt-6">
                {/* 1. Header: Brand + Invoice Title */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Company Brand */}
                  <div>
                    <div className="flex items-center gap-3">
                      <img
                        src="https://res.cloudinary.com/ebjikx52/image/upload/v1792426897/xtreme/frontend/favicon_png.png"
                        alt="Xtreme Mobile Tire"
                        className="w-11 h-11 object-contain shrink-0"
                      />
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none">
                          XTREME <span className="text-red-600">MOBILE TIRE</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                          24/7 Mobile Tire Service & Roadside Dispatch
                        </p>
                      </div>
                    </div>

                    {/* Regional Hub Address Details */}
                    <div className="text-[11px] text-slate-600 mt-3 space-y-0.5">
                      <p className="flex items-center gap-1.5 font-medium">
                        <MapPin size={12} className="text-red-600 shrink-0" />
                        <span>{companyAddress}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Phone size={12} className="text-red-600 shrink-0" />
                        <span>{companyPhone}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Mail size={12} className="text-red-600 shrink-0" />
                        <span>{data?.company?.paymentEmail || activeHub.paymentEmail}</span>
                      </p>
                    </div>
                  </div>

                  {/* Invoice Header Badge - placed below the geometric corner without collision */}
                  <div className="sm:text-right mt-2 sm:mt-0">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                      INVOICE
                    </h2>
                    <div className="font-mono font-black text-sm text-red-600 mt-0.5">
                      #{data.invoiceNumber}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-2 space-y-0.5">
                      <p>
                        <span className="font-semibold text-slate-700">Date:</span> {data.issueDate}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-700">Due Date:</span> {data.dueDate}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-700">Currency:</span>{' '}
                        <span className="font-mono font-bold text-slate-900">{data.currency}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Invoice To / Bill To Box */}
                <div className="pt-2 pb-1 border-t-2 border-red-600">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="font-black text-red-600 text-xs tracking-wider uppercase block mb-1">
                        INVOICE TO:
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {clientName || 'Valued Customer'}
                      </h3>
                      {data.billTo?.contactPerson && (
                        <p className="text-xs text-slate-600">Attn: {data.billTo.contactPerson}</p>
                      )}
                      {clientAddress ? (
                        <p className="text-xs text-slate-600 mt-0.5">{clientAddress}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">Commercial Service Address on Record</p>
                      )}
                      {clientPhone && (
                        <p className="text-xs text-slate-600 font-mono mt-0.5">{clientPhone}</p>
                      )}
                      {clientEmail && (
                        <p className="text-xs text-slate-600 mt-0.5">{clientEmail}</p>
                      )}
                    </div>

                    <div className="sm:text-right text-xs space-y-1">
                      {data.billTo?.fleetCode && (
                        <p className="text-slate-600">
                          <span className="font-semibold text-slate-700">Corporate Account:</span>{' '}
                          <span className="font-mono font-bold text-slate-900">{data.billTo.fleetCode}</span>
                        </p>
                      )}
                      <p className="text-slate-600">
                        <span className="font-semibold text-slate-700">Tax Category:</span>{' '}
                        <span>{data.summary?.taxRateFormatted}</span>
                      </p>
                      <p className="text-slate-600">
                        <span className="font-semibold text-slate-700">Status:</span>{' '}
                        <span className="font-bold text-red-600 uppercase">{data.status}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Line Items Table */}
                <div className="overflow-hidden border border-slate-300 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-12 border-r border-slate-700">SL.</th>
                        <th className="py-2.5 px-4 border-r border-slate-700">Item Descriptions</th>
                        <th className="py-2.5 px-3 text-right w-24 border-r border-slate-700">Price</th>
                        <th className="py-2.5 px-3 text-center w-16 border-r border-slate-700">Qty</th>
                        <th className="py-2.5 px-4 text-right w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {data.items?.map((item: any, i: number) => (
                        <tr
                          key={i}
                          className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                        >
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500 border-r border-slate-200">
                            {String(i + 1).padStart(2, '0')}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800 border-r border-slate-200">
                            {item.details}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 border-r border-slate-200">
                            {item.unitPriceFormatted}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-800 border-r border-slate-200">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                            {item.totalFormatted}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 4. Subtotals & Total Due (Right Aligned with Dark Slate Total Pill) */}
                <div className="flex justify-end pt-1">
                  <div className="w-72 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600 py-0.5">
                      <span className="font-semibold">Sub Total:</span>
                      <span className="font-mono font-bold text-slate-800">{data.summary?.subtotal}</span>
                    </div>

                    {data.summary?.discount && (
                      <div className="flex justify-between text-emerald-600 py-0.5">
                        <span className="font-semibold">Discount:</span>
                        <span className="font-mono font-bold">-{data.summary.discount}</span>
                      </div>
                    )}

                    {data.summary?.depositCredited && (
                      <div className="flex justify-between text-emerald-600 py-0.5">
                        <span className="font-semibold">Deposit Credited:</span>
                        <span className="font-mono font-bold">-{data.summary.depositCredited}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-600 py-0.5">
                      <span className="font-semibold">
                        Tax ({data.summary?.taxRateFormatted}):
                      </span>
                      <span className="font-mono font-bold text-slate-800">{data.summary?.tax}</span>
                    </div>

                    {/* Dark Slate Pill Total Box from Template */}
                    <div className="bg-slate-900 text-white rounded-lg p-2.5 px-3.5 flex items-center justify-between shadow-xs mt-2">
                      <span className="font-black uppercase tracking-wider text-xs">TOTAL:</span>
                      <span className="font-mono font-black text-base text-red-400">
                        {data.summary?.grandTotal}
                      </span>
                    </div>

                    {data.summary?.amountPaid && data.summary.amountPaid !== '$0.00' && (
                      <div className="flex justify-between text-slate-600 pt-1 text-[11px]">
                        <span>Amount Paid:</span>
                        <span className="font-mono font-semibold text-emerald-600">
                          {data.summary.amountPaid}
                        </span>
                      </div>
                    )}

                    {data.summary?.balanceDue && data.summary.balanceDue !== data.summary.grandTotal && (
                      <div className="flex justify-between text-red-600 font-bold pt-0.5 text-xs">
                        <span>Balance Due:</span>
                        <span className="font-mono font-black">{data.summary.balanceDue}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Payment Info, Terms, and Signature Section */}
                <div className="pt-4 border-t-2 border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                  {/* Payment Info */}
                  <div className="space-y-1">
                    <span className="font-black text-red-600 uppercase tracking-wider text-[11px] block">
                      PAYMENT INFO:
                    </span>
                    <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                      {data?.company?.bankInfo || activeHub.bankInfo}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Reference: <strong className="font-mono text-slate-800">#{data.invoiceNumber}</strong>
                    </p>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="space-y-1">
                    <span className="font-black text-slate-800 uppercase tracking-wider text-[11px] block">
                      TERMS & CONDITIONS:
                    </span>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Payment is due upon receipt or according to pre-approved corporate billing terms. All tire service warranties are subject to initial torque specification verification after 100km.
                    </p>
                  </div>

                  {/* Authorized Signature */}
                  <div className="flex flex-col justify-end items-center sm:items-end text-center sm:text-right pt-6 sm:pt-0">
                    <div className="w-44 border-b-2 border-slate-900 pb-1 mb-1" />
                    <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                      AUTHORIZED SIGNATURE
                    </span>
                    <span className="text-[9px] text-slate-500">Xtreme Mobile Tire Group</span>
                  </div>
                </div>
              </div>

              {/* BOTTOM-LEFT GEOMETRIC ACCENT */}
              <div className="absolute bottom-0 left-0 w-48 h-20 overflow-hidden pointer-events-none z-0">
                <svg viewBox="0 0 200 80" className="w-full h-full" preserveAspectRatio="none">
                  <polygon points="0,0 0,80 160,80 70,30" fill="#1e293b" />
                  <polygon points="0,20 0,80 120,80 50,20" fill="#dc2626" />
                  <rect x="65" y="45" width="14" height="14" transform="rotate(45 72 52)" fill="#ffffff" />
                </svg>
              </div>

              {/* 6. BOTTOM GEOMETRIC ACCENT & THANK YOU BAR */}
              <div className="mt-8 pt-4 border-t border-slate-200 relative z-10">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-red-600 transform rotate-45" />
                    <span className="font-black text-slate-900 tracking-wider uppercase text-[11px]">
                      THANK YOU FOR YOUR BUSINESS!
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    xtrememobiletire.com • 24/7 Rapid Mobile Response
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
