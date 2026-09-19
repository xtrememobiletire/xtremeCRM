import { PhoneCall, PhoneOff, Wrench } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

interface IncomingCallPopProps {
  onIntakeJob?: (callerPhone: string) => void;
}

export default function IncomingCallPop({ onIntakeJob }: IncomingCallPopProps) {
  const { incomingCall, answerCall, endCall } = useSocket();

  if (!incomingCall) return null;

  const handleAnswerAndIntake = () => {
    answerCall();
    if (onIntakeJob) {
      onIntakeJob(incomingCall.from);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-bounce duration-1000 max-w-sm w-full">
      <div className="bg-slate-900 border-2 border-red-500 text-white rounded-2xl shadow-2xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center shrink-0">
              <PhoneCall className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-950 px-2 py-0.5 rounded-full border border-red-800">
                  Incoming Dispatch Call
                </span>
              </div>
              <h4 className="text-base font-bold text-white mt-1">
                {incomingCall.fromName || 'Unknown Caller'}
              </h4>
              <p className="text-xs font-mono text-slate-400">{incomingCall.from}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={endCall}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <PhoneOff size={15} />
            <span>Decline</span>
          </button>
          <button
            type="button"
            onClick={handleAnswerAndIntake}
            className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/30 transition"
          >
            <Wrench size={15} />
            <span>Answer & Intake</span>
          </button>
        </div>
      </div>
    </div>
  );
}
