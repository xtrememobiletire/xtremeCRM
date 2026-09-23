import { useNavigate } from 'react-router-dom';
import { PhoneCall, PhoneOff, UserCheck, MessageSquare, Wrench, Building2, Car } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { leadService } from '../../services/leadService';
import Modal from '../ui/Modal';
import { toast } from 'sonner';

export default function WarmTransferModal() {
  const navigate = useNavigate();
  const { incomingTransfer, acceptTransfer, declineTransfer } = useSocket();

  if (!incomingTransfer) return null;

  const isOutboundLead = incomingTransfer.transferType === 'OUTBOUND_LEAD';

  const handleAcceptLead = () => {
    acceptTransfer();
    if (incomingTransfer.leadId) {
      navigate(`/leads?selectedLeadId=${incomingTransfer.leadId}`);
    }
  };

  const handleAcceptAndAssignDriver = () => {
    acceptTransfer();
    navigate(`/jobs?intakePhone=${encodeURIComponent(incomingTransfer.callerPhone)}`);
    declineTransfer();
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = incomingTransfer.callerPhone.replace(/[^0-9]/g, '');
    const clientName = incomingTransfer.companyName || incomingTransfer.callerName || 'Fleet Partner';
    const message = encodeURIComponent(
      `Hello ${clientName}, this is Xtreme Mobile Tire dispatch management. Following up on your call with our fleet team regarding commercial tire service terms & agreement.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    toast.success('WhatsApp conversation launched');
  };

  const handleConvertToFleet = async () => {
    if (!incomingTransfer.leadId) {
      toast.info('No lead record ID attached to transfer');
      return;
    }
    try {
      await leadService.convertToFleet(incomingTransfer.leadId);
      toast.success('Successfully converted lead to Fleet Account with VA commission linked!');
      declineTransfer();
      navigate('/fleets');
    } catch {
      toast.error('Failed to convert to fleet');
    }
  };

  return (
    <Modal
      isOpen={!!incomingTransfer}
      onClose={declineTransfer}
      title="Incoming Attended Call Transfer"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Caller Header Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isOutboundLead
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {isOutboundLead ? 'Outbound B2B Fleet Prospect' : 'Inbound Roadside Motorist'}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              via {incomingTransfer.transferringAgent}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isOutboundLead
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-red-100 text-red-700 border-red-200'
              }`}
            >
              {isOutboundLead ? <Building2 size={20} /> : <Car size={20} />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 truncate">
                {incomingTransfer.companyName || incomingTransfer.callerName || 'Prospective Client'}
              </h3>
              <p className="text-xs font-mono font-bold text-slate-700 mt-0.5">
                {incomingTransfer.callerPhone}
              </p>
              {incomingTransfer.numberOfUnits ? (
                <p className="text-xs text-slate-600 mt-0.5">
                  Fleet Size: <span className="font-bold text-slate-900">{incomingTransfer.numberOfUnits} Units</span>
                </p>
              ) : null}
            </div>
          </div>

          {/* Transfer Briefing Notes */}
          {incomingTransfer.notes && (
            <div className="mt-3 pt-3 border-t border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Agent Briefing Notes
              </div>
              <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                {incomingTransfer.notes}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {isOutboundLead ? (
            <>
              <button
                type="button"
                onClick={handleAcceptLead}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <PhoneCall size={15} />
                <span>Accept Call & Close Deal</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <MessageSquare size={15} />
                  <span>Send via WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleConvertToFleet}
                  className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <UserCheck size={15} />
                  <span>Convert to Fleet</span>
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={handleAcceptAndAssignDriver}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Wrench size={15} />
              <span>Accept Call & Assign Driver</span>
            </button>
          )}

          <button
            type="button"
            onClick={declineTransfer}
            className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <PhoneOff size={14} />
            <span>Decline / Return to Queue</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
