import { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Pause, Play, UserPlus } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import Modal from '../ui/Modal';

export default function SoftphoneModal() {
  const { isSoftphoneOpen, closeSoftphone, activeCall, endCall, simulateIncomingCall } = useSocket();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

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
        <div className="w-full bg-slate-900 text-white rounded-xl p-4 text-center mb-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {activeCall ? (isOnHold ? 'CALL ON HOLD' : 'CALL CONNECTED') : 'READY TO DIAL'}
          </div>
          <div className="text-xl font-mono font-bold tracking-tight text-red-400 min-h-[32px] flex items-center justify-center">
            {activeCall ? activeCall.from : phoneNumber || 'Enter Number'}
          </div>
          {activeCall && (
            <div className="text-xs font-mono text-emerald-400 mt-1 font-semibold">
              {formatDuration(callDuration)}
            </div>
          )}
        </div>

        {activeCall ? (
          <div className="w-full space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded-xl flex flex-col items-center gap-1 text-xs font-medium border transition ${
                  isMuted
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isOnHold ? <Play size={18} /> : <Pause size={18} />}
                <span>{isOnHold ? 'Resume' : 'Hold'}</span>
              </button>

              <button
                type="button"
                className="p-3 rounded-xl flex flex-col items-center gap-1 text-xs font-medium border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 transition"
              >
                <UserPlus size={18} />
                <span>Transfer</span>
              </button>
            </div>

            <button
              type="button"
              onClick={endCall}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-2 shadow-xs transition"
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
                  className="h-11 rounded-lg border border-slate-200 bg-white font-mono font-bold text-lg text-slate-800 hover:bg-slate-50 active:bg-slate-100 transition shadow-2xs"
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition"
              >
                Backspace
              </button>
              <button
                type="button"
                onClick={handleDial}
                disabled={!phoneNumber}
                className="flex-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Phone size={14} />
                <span>Dial</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => simulateIncomingCall('+14165550199', 'Roadside Emergency Driver')}
                className="w-full py-1.5 rounded-lg border border-dashed border-red-300 text-red-600 bg-red-50 hover:bg-red-100 text-[11px] font-semibold transition"
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
