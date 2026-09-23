import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useTenant } from './TenantContext';

export interface CallEvent {
  callId: string;
  from: string;
  fromName?: string;
  region: string;
  timestamp: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  incomingCall: CallEvent | null;
  activeCall: CallEvent | null;
  isSoftphoneOpen: boolean;
  openSoftphone: () => void;
  closeSoftphone: () => void;
  answerCall: () => void;
  endCall: () => void;
  simulateIncomingCall: (from?: string, fromName?: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { country, isAgentActive } = useTenant();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState<CallEvent | null>(null);
  const [activeCall, setActiveCall] = useState<CallEvent | null>(null);
  const [isSoftphoneOpen, setIsSoftphoneOpen] = useState(false);

  useEffect(() => {
    const defaultApiUrl = import.meta.env.PROD ? 'https://xtremecrm.onrender.com/api' : 'http://localhost:3000/api';
    const rawApiUrl = import.meta.env.VITE_API_BASE_URL || defaultApiUrl;
    const socketUrl = import.meta.env.VITE_WS_URL || rawApiUrl.replace(/\/api\/?$/, '');

    const s = io(socketUrl, {
      withCredentials: true,
      autoConnect: true,
      reconnectionAttempts: 5,
    });

    s.on('connect', () => {
      setIsConnected(true);
      s.emit('dispatch:join', country);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('call:incoming', (data: any) => {
      if (isAgentActive) {
        setIncomingCall({
          callId: data.callId || `call-${Date.now()}`,
          from: data.callerNumber || data.from || '+1 (416) 555-0192',
          fromName: data.callerName || data.fromName || 'Inbound Roadside Caller',
          region: country,
          timestamp: new Date().toISOString(),
        });
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [country, isAgentActive]);

  const openSoftphone = () => setIsSoftphoneOpen(true);
  const closeSoftphone = () => setIsSoftphoneOpen(false);

  const answerCall = () => {
    if (incomingCall) {
      setActiveCall(incomingCall);
      setIncomingCall(null);
      setIsSoftphoneOpen(true);
    }
  };

  const endCall = () => {
    setActiveCall(null);
    setIncomingCall(null);
  };

  const simulateIncomingCall = (
    from = '+1 (416) 555-0199',
    fromName = 'Roadside Driver Marcus'
  ) => {
    if (!isAgentActive) return;
    setIncomingCall({
      callId: `call-${Date.now()}`,
      from,
      fromName,
      region: country,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        incomingCall,
        activeCall,
        isSoftphoneOpen,
        openSoftphone,
        closeSoftphone,
        answerCall,
        endCall,
        simulateIncomingCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
}
