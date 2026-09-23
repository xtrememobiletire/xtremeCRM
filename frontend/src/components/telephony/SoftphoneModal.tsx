import { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Pause, Play, UserPlus, ArrowRightLeft } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import Modal from '../ui/Modal';
import { toast } from 'sonner';

export default function SoftphoneModal() {
  const { isSoftphoneOpen, closeSoftphone, activeCall, endCall, simulateIncomingCall, transferCallToDm } = useSocket();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferNotes, setTransferNotes] = useState('');

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
      setIsTransferring(false);
    }
    return () => clearInterval(timer);
  }, [activeCall]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDigit = (digit: string) => {
    setPhoneNumber((prev) => (prev.length < 15 ? prev + digit : prev));
  };

  const handleDelete = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const handleDial = () => {
    if (!phoneNumber) return;
    simulateIncomingCall(phoneNumber, 'Outbound Call');
  };

  const handleExecuteTransfer = async () => {
    if (!activeCall) return;
    await transferCallToDm({
      callerPhone: activeCall.from,
      callerName: activeCall.fromName,
      notes: transferNotes || 'Warm transfer from Agent softphone',
    });
    toast.success('Warm transfer handed over to Dispatcher Manager');
    setIsTransferring(false);
    endCall();
  };

  const dialPadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#'],
  ];

  return (
    <Modal
      isOpen={isSoftphoneOpen}
      onClose={closeSoftphone}
      title="Telnyx WebRTC Softphone"
      maxWidth="max-w-xs"
    >
      <div className="flex flex-col items-center">
        {/* Light Display Screen - Compliant with enterprise theme */}
        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-center mb-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            {activeCall ? (isOnHold ? 'CALL ON HOLD' : 'CALL CONNECTED') : 'READY TO DIAL'}
          </div>
          <div className="text-xl font-mono font-bold tracking-tight text-red-600 min-h-[32px] flex items-center justify-center">
            {activeCall ? activeCall.from : phoneNumber || 'Enter Number'}
          </div>
          {activeCall && activeCall.fromName && (
            <div className="text-xs font-semibold text-slate-700 truncate mt-0.5">
              {activeCall.fromName}
            </div>
          )}
          {activeCall && (
            <div className="text-xs font-mono text-emerald-700 mt-1 font-bold">
              {formatDuration(callDuration)}
            </div>
          )}
        </div>

        {activeCall ? (
          <div className="w-full space-y-3">
            {isTransferring ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <ArrowRightLeft size={14} />
                  <span>Transfer to Dispatcher Manager</span>
                </div>
                <input
                  type="text"
                  placeholder="Notes for DM (e.g. stranded on Hwy 401)"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsTransferring(false)}
                    className="py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteTransfer}
                    className="py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                  >
                    Confirm Handover
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1 text-xs font-medium border transition ${
                    isMuted
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOnHold(!isOnHold)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1 text-xs font-medium border transition ${
                    isOnHold
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isOnHold ? <Play size={18} /> : <Pause size={18} />}
                  <span>{isOnHold ? 'Resume' : 'Hold'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTransferring(true)}
                  className="p-3 rounded-xl flex flex-col items-center gap-1 text-xs font-medium border bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 transition"
                  title="Warm transfer to Dispatcher Manager"
                >
                  <UserPlus size={18} />
                  <span>Transfer DM</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={endCall}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-2 shadow-sm transition"
            >
              <PhoneOff size={18} />
              <span>End Call</span>
            </button>
          </div>
        ) : (
          <div className="w-full space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {dialPadButtons.flat().map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDigit(d)}
                  className="h-11 rounded-lg border border-slate-200 bg-white font-mono font-bold text-lg text-slate-800 hover:bg-slate-50 active:bg-slate-100 transition shadow-2xs cursor-pointer"
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                Backspace
              </button>
              <button
                type="button"
                onClick={handleDial}
                disabled={!phoneNumber}
                className="flex-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Phone size={14} />
                <span>Dial</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => simulateIncomingCall('+14165550199', 'Roadside Emergency Driver')}
                className="w-full py-1.5 rounded-lg border border-dashed border-red-300 text-red-600 bg-red-50 hover:bg-red-100 text-[11px] font-semibold transition cursor-pointer"
              >
                ⚡ Simulate Incoming Driver Call
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
