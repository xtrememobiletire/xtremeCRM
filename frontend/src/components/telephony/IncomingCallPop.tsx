import { PhoneCall, PhoneOff, Wrench, ArrowRightLeft } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

interface IncomingCallPopProps {
  onIntakeJob?: (callerPhone: string) => void;
}

export default function IncomingCallPop({ onIntakeJob }: IncomingCallPopProps) {
  const { incomingCall, answerCall, endCall, transferCallToDm } = useSocket();

  if (!incomingCall) return null;

  const handleAnswerAndIntake = () => {
    answerCall();
    if (onIntakeJob) {
      onIntakeJob(incomingCall.from);
    }
  };

  const handleTransferToDm = async () => {
    await transferCallToDm({
      callerPhone: incomingCall.from,
      callerName: incomingCall.fromName,
      transferType: 'INBOUND_MOTORIST',
      notes: 'Direct transfer from incoming caller to Dispatcher Manager',
    });
    endCall();
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-bounce duration-1000 max-w-sm w-full">
      <div className="bg-white border-2 border-red-500 text-slate-800 rounded-2xl shadow-2xl p-4 sm:p-5 ring-1 ring-slate-900/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
              <PhoneCall className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  Incoming Hotline Call
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-900 mt-1">
                {incomingCall.fromName || 'Roadside Motorist'}
              </h4>
              <p className="text-xs font-mono font-semibold text-slate-600">{incomingCall.from}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={endCall}
            className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition"
            title="Decline Call"
          >
            <PhoneOff size={14} />
            <span>Decline</span>
          </button>

          <button
            type="button"
            onClick={handleTransferToDm}
            className="py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold text-xs flex items-center justify-center gap-1 transition"
            title="Transfer to Dispatcher Manager"
          >
            <ArrowRightLeft size={14} />
            <span>Transfer DM</span>
          </button>

          <button
            type="button"
            onClick={handleAnswerAndIntake}
            className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-red-600/20 transition"
          >
            <Wrench size={14} />
            <span>Intake</span>
          </button>
        </div>
      </div>
    </div>
  );
}
