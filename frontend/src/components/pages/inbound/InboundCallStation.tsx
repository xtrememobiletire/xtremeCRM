import { 
  PhoneCall, 
  PhoneOff, 
  ArrowRightLeft, 
  Clock, 
  UserCheck 
} from 'lucide-react';

export interface CallLogEntry {
  id: string;
  phone: string;
  callerName: string;
  time: string;
  service: string;
  disposition: string;
  transferredToDm: boolean;
}

interface InboundCallStationProps {
  incomingCall: any;
  activeCall: any;
  callDuration: number;
  callerPhone: string;
  callerName: string;
  leadSource: string;
  isTransferring: boolean;
  callLogs: CallLogEntry[];
  onAnswerCall: () => void;
  onEndCall: () => void;
  onWarmTransferToDm: () => void;
  onQuickDisposition: (disposition: string) => void;
}

export default function InboundCallStation({
  incomingCall,
  activeCall,
  callDuration,
  callerPhone,
  callerName,
  leadSource,
  isTransferring,
  callLogs,
  onAnswerCall,
  onEndCall,
  onWarmTransferToDm,
  onQuickDisposition,
}: InboundCallStationProps) {
  const hasLiveCall = !!incomingCall || !!activeCall;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const activeNumber = incomingCall?.from || activeCall?.from || callerPhone || 'No Active Caller';
  const activeName = incomingCall?.fromName || activeCall?.fromName || callerName || 'Stranded Motorist';

  return (
    <div className="space-y-4">
      {/* 1. Live Telephony & Call Control Station */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        {/* Status Header */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between transition-colors ${
            activeCall
              ? 'bg-emerald-50/70 border-emerald-200'
              : incomingCall
              ? 'bg-red-50/80 border-red-200'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                activeCall
                  ? 'bg-emerald-500 animate-pulse'
                  : incomingCall
                  ? 'bg-red-600 animate-ping'
                  : 'bg-slate-400'
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {activeCall
                ? 'Call in Progress'
                : incomingCall
                ? 'Incoming Call'
                : 'Hotline Ready'}
            </span>
          </div>

          {activeCall && (
            <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
              <Clock className="w-3 h-3" />
              <span>{formatTimer(callDuration)}</span>
            </div>
          )}
        </div>

        {/* Caller ID Card */}
        <div className="p-4 space-y-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
              Caller Number
            </div>
            <div className="text-base font-mono font-bold text-slate-900 truncate">
              {activeNumber}
            </div>
            {hasLiveCall && (
              <div className="text-xs font-semibold text-slate-600 mt-0.5 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>{activeName}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 uppercase text-[10px]">{leadSource.replace('_', ' ')}</span>
              </div>
            )}
          </div>

          {/* Primary Call Controls */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            {incomingCall && !activeCall && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onAnswerCall}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition active:scale-95"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Answer Call</span>
                </button>
                <button
                  type="button"
                  onClick={onEndCall}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 border border-rose-200 cursor-pointer transition"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Decline</span>
                </button>
              </div>
            )}

            {activeCall && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={onEndCall}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition active:scale-95"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>End Call / Disconnect</span>
                </button>

                <button
                  type="button"
                  onClick={onWarmTransferToDm}
                  disabled={isTransferring}
                  className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-200 cursor-pointer transition"
                  title="Warm handoff to Dispatcher Manager"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>{isTransferring ? 'Transferring...' : 'Warm Transfer to DM'}</span>
                </button>
              </div>
            )}

            {!hasLiveCall && (
              <div className="py-2 px-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  Hotline connected. Incoming motorist calls will ring here.
                </p>
              </div>
            )}
          </div>

          {/* Quick Dispositions (For Non-Booking Calls) */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quick Call Outcome (Non-Booking)
            </div>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => onQuickDisposition('Wrong Number')}
                className="py-1 px-1.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 text-center transition cursor-pointer"
              >
                Wrong No.
              </button>
              <button
                type="button"
                onClick={() => onQuickDisposition('Price Shopper / RNC')}
                className="py-1 px-1.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 text-center transition cursor-pointer"
              >
                Price Shop
              </button>
              <button
                type="button"
                onClick={() => onQuickDisposition('Spam / Irrelevant')}
                className="py-1 px-1.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 text-center transition cursor-pointer"
              >
                Spam
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Shift Call History */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Shift Call Log
            </h4>
          </div>
          <span className="text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
            {callLogs.length} Calls
          </span>
        </div>

        {callLogs.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No calls logged during this shift
          </div>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto overscroll-contain pr-1">
            {callLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/80 hover:bg-slate-100 transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 truncate">{log.callerName || 'Motorist'}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{log.time}</span>
                </div>
                <div className="text-[11px] font-mono font-medium text-slate-600">{log.phone}</div>
                <div className="flex items-center justify-between text-[10px] pt-0.5">
                  <span className="text-slate-500 truncate max-w-[130px]">{log.service}</span>
                  <span
                    className={`font-bold px-1.5 py-0.2 rounded ${
                      log.transferredToDm
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {log.disposition}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
