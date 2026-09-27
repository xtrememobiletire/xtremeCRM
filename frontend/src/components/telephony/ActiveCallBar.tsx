import { useState, useEffect } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Building2,
  Phone,
  Send,
  X,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'sonner';

export default function ActiveCallBar() {
  const { activeCall, endCall, transferCallToDm } = useSocket();
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferNotes, setTransferNotes] = useState('');
  const [isSendingTransfer, setIsSendingTransfer] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (activeCall) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
      setIsMuted(false);
      setIsOnHold(false);
      setIsMinimized(false);
      setIsTransferring(false);
      setTransferNotes('');
    }
    return () => clearInterval(timer);
  }, [activeCall]);

  if (!activeCall) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExecuteTransfer = async () => {
    if (!activeCall) return;
    setIsSendingTransfer(true);
    try {
      await transferCallToDm({
        callerPhone: activeCall.from,
        callerName: activeCall.fromName,
        notes: transferNotes.trim() || 'Warm transfer from Agent active call dock',
        transferType: activeCall.fromName?.toLowerCase().includes('lead') ? 'OUTBOUND_LEAD' : 'INBOUND_MOTORIST',
      });
      toast.success('Call transferred to Dispatcher Manager');
      setIsTransferring(false);
      endCall();
    } catch {
      toast.error('Failed to transfer call');
    } finally {
      setIsSendingTransfer(false);
    }
  };

  // Minimized Pill Presentation
  if (isMinimized) {
    return (
      <aside aria-label="Minimized Active Call" className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 bg-slate-900/95 text-white px-3.5 py-2 rounded-full shadow-2xl backdrop-blur-md border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <span className="relative flex h-2.5 w-2.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isOnHold ? 'bg-amber-400' : 'bg-emerald-400'} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnHold ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        </span>

        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 text-left cursor-pointer hover:opacity-90 transition"
          title="Expand Call Dock"
        >
          <span className="text-xs font-semibold text-slate-100 max-w-[130px] truncate">
            {activeCall.fromName || activeCall.from}
          </span>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            {formatDuration(callDuration)}
          </span>
          <ChevronUp size={14} className="text-slate-400" />
        </button>

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        <button
          type="button"
          onClick={endCall}
          className="p-1 rounded-full bg-red-600 hover:bg-red-700 text-white transition cursor-pointer shadow-xs"
          title="End Call"
        >
          <PhoneOff size={13} />
        </button>
      </aside>
    );
  }

  // Floating Active Call Dock (Non-blocking, bottom-right)
  return (
    <aside aria-label="Active Call Dock" className="fixed bottom-5 right-5 z-40 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-900/5 animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* Top Header Strip */}
      <div className="bg-slate-50 px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isOnHold ? 'bg-amber-400' : 'bg-emerald-400'} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnHold ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isOnHold ? 'text-amber-700' : 'text-emerald-700'}`}>
            {isOnHold ? 'Call On Hold' : 'Call Connected'}
          </span>
          <span className="text-xs font-mono font-bold text-slate-900 ml-1">
            {formatDuration(callDuration)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
            title="Minimize call bar"
          >
            <ChevronDown size={15} />
          </button>
        </div>
      </div>

      {/* Main Body: Caller / Prospect Details */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
              <Building2 size={14} className="text-slate-400 shrink-0" />
              <span>{activeCall.fromName || 'Active Caller'}</span>
            </h4>
            <p className="text-xs font-mono text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Phone size={12} className="text-slate-400 shrink-0" />
              <span>{activeCall.from}</span>
            </p>
          </div>
        </div>

        {/* Transfer to Dispatcher Manager Drawer / Form */}
        {isTransferring ? (
          <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                <ArrowRightLeft size={13} />
                Transfer to Dispatcher Manager
              </span>
              <button
                type="button"
                onClick={() => setIsTransferring(false)}
                className="text-amber-700 hover:text-amber-900 cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
            <textarea
              rows={2}
              placeholder="Handoff notes for DM (e.g. 5 units, urgent tire change)..."
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-amber-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
            />
            <div className="flex items-center justify-end gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setIsTransferring(false)}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-200/50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteTransfer}
                disabled={isSendingTransfer}
                className="px-3 py-1 rounded-md text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Send size={11} />
                <span>{isSendingTransfer ? 'Transferring...' : 'Send Transfer'}</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Controls Grid */}
        <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100">
          {/* Mute */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`py-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer border ${
              isMuted
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
            <span className="text-[10px]">{isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          {/* Hold */}
          <button
            type="button"
            onClick={() => setIsOnHold(!isOnHold)}
            className={`py-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer border ${
              isOnHold
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title={isOnHold ? 'Resume call' : 'Put call on hold'}
          >
            {isOnHold ? <Play size={15} /> : <Pause size={15} />}
            <span className="text-[10px]">{isOnHold ? 'Resume' : 'Hold'}</span>
          </button>

          {/* Warm Transfer to DM */}
          <button
            type="button"
            onClick={() => setIsTransferring(!isTransferring)}
            className={`py-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer border ${
              isTransferring
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Warm transfer call to Dispatcher Manager"
          >
            <ArrowRightLeft size={15} />
            <span className="text-[10px]">Transfer</span>
          </button>

          {/* End Call */}
          <button
            type="button"
            onClick={endCall}
            className="py-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white transition cursor-pointer shadow-sm shadow-red-600/20"
            title="End Call"
          >
            <PhoneOff size={15} />
            <span className="text-[10px]">End Call</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
