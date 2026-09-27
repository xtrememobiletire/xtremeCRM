import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useTenant } from './TenantContext';
import { useAuth } from './AuthContext';
import { queryClient } from '../lib/queryClient';
import { toast } from 'sonner';
import { telephonyService } from '../services/telephonyService';

export interface CallEvent {
  callId: string;
  from: string;
  fromName?: string;
  region: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  type: 'JOB_ASSIGNED' | 'JOB_COMPLETED' | 'CHAT_MESSAGE' | 'PAYOUT_VERIFIED' | 'STATUS_UPDATED' | 'GENERAL';
  title: string;
  message: string;
  timestamp: string;
  jobId?: string;
  jobCode?: string;
  driverName?: string;
  read?: boolean;
}

export interface ActiveChatJob {
  id: string;
  jobCode?: string;
  driverName?: string;
}

export interface WarmTransferEvent {
  transferType: 'INBOUND_MOTORIST' | 'OUTBOUND_LEAD';
  callId: string;
  callerPhone: string;
  callerName?: string;
  companyName?: string;
  numberOfUnits?: number;
  notes?: string;
  vehicleInfo?: string;
  leadId?: string;
  transferringAgent: string;
  countryCode: string;
  timestamp: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  incomingCall: CallEvent | null;
  activeCall: CallEvent | null;
  incomingTransfer: WarmTransferEvent | null;
  isSoftphoneOpen: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  activeChatJob: ActiveChatJob | null;
  openSoftphone: () => void;
  closeSoftphone: () => void;
  answerCall: () => void;
  endCall: () => void;
  acceptTransfer: () => void;
  declineTransfer: () => void;
  transferCallToDm: (params: {
    leadId?: string;
    callerPhone?: string;
    callerName?: string;
    companyName?: string;
    notes?: string;
    vehicleInfo?: string;
    transferType?: 'INBOUND_MOTORIST' | 'OUTBOUND_LEAD';
  }) => Promise<void>;
  dialOutbound: (phoneNumber: string, contactName?: string, leadId?: string) => void;
  simulateIncomingCall: (from?: string, fromName?: string) => void;
  markNotificationsAsRead: () => void;
  openChatJob: (job: ActiveChatJob) => void;
  closeChatJob: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { country, isAgentActive, agentMode } = useTenant();
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState<CallEvent | null>(null);
  const [activeCall, setActiveCall] = useState<CallEvent | null>(null);
  const [incomingTransfer, setIncomingTransfer] = useState<WarmTransferEvent | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeChatJob, setActiveChatJob] = useState<ActiveChatJob | null>(null);

  const agentModeRef = useRef(agentMode);
  const isAgentActiveRef = useRef(isAgentActive);
  const userRef = useRef(user);

  useEffect(() => {
    agentModeRef.current = agentMode;
    isAgentActiveRef.current = isAgentActive;
    userRef.current = user;
  }, [agentMode, isAgentActive, user]);

  const playChime = () => {
    try {
      const audio = new Audio('/chime.mp3');
      audio.play().catch(() => {});
    } catch {}
  };

  const addNotification = (item: Omit<AppNotification, 'id' | 'read'>) => {
    const newNotification: AppNotification = {
      ...item,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev.slice(0, 49)]); // keep last 50
    playChime();
    toast.info(newNotification.title, {
      description: newNotification.message,
      action: newNotification.jobId
        ? {
            label: 'Open Ticket',
            onClick: () => {
              if (newNotification.type === 'CHAT_MESSAGE') {
                setActiveChatJob({
                  id: newNotification.jobId!,
                  jobCode: newNotification.jobCode,
                  driverName: newNotification.driverName,
                });
              }
            },
          }
        : undefined,
    });
  };

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
      if (userRef.current) {
        s.emit('auth:register', {
          userId: userRef.current.id,
          role: userRef.current.role,
          countryCode: country,
        });
        s.emit('agent:presence', {
          userId: userRef.current.id,
          mode: isAgentActiveRef.current ? agentModeRef.current : 'INACTIVE',
          countryCode: country,
        });
      }
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // Inbound phone screen pop (PRD FR-1.1: Only active when agentMode === 'INBOUND')
    s.on('call:incoming', (data: any) => {
      if (agentModeRef.current === 'INBOUND' && isAgentActiveRef.current) {
        setIncomingCall({
          callId: data.callId || `call-${Date.now()}`,
          from: data.callerNumber || data.from || '+1 (416) 555-0192',
          fromName: data.callerName || data.fromName || 'Inbound Roadside Caller',
          region: country,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Attended / Warm Transfer to Dispatcher Manager (FR-1.2, FR-9.6)
    s.on('call:transfer', (data: any) => {
      if (['DISPATCHER', 'ADMIN'].includes(userRef.current?.role || '')) {
        setIncomingTransfer({
          transferType: data.transferType || 'INBOUND_MOTORIST',
          callId: data.callId || `call-${Date.now()}`,
          callerPhone: data.callerPhone || '+1 (416) 555-0192',
          callerName: data.callerName || data.companyName || 'Stranded Motorist / Lead',
          companyName: data.companyName,
          numberOfUnits: data.numberOfUnits,
          notes: data.notes,
          vehicleInfo: data.vehicleInfo,
          leadId: data.leadId,
          transferringAgent: data.transferringAgent || 'Call Center Agent',
          countryCode: data.countryCode || country,
          timestamp: data.timestamp || new Date().toISOString(),
        });
        playChime();
        toast.info(`Warm Transfer: ${data.companyName || data.callerName || 'Caller'}`, {
          description: `Transferred by ${data.transferringAgent || 'Agent'}. Click to accept.`,
        });
      }
    });

    // Outbound Lead Queue invalidation
    s.on('lead:created', () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    });
    s.on('lead:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    });

    // Real-Time Driver Assignment Notice
    s.on('notification:job_assigned', (data: any) => {
      addNotification({
        type: 'JOB_ASSIGNED',
        title: data.title || 'New Dispatch Assigned',
        message: data.message || `Job #${data.jobCode} assigned to you`,
        timestamp: data.timestamp || new Date().toISOString(),
        jobId: data.jobId,
        jobCode: data.jobCode,
      });
      queryClient.invalidateQueries({ queryKey: ['driver-assigned-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['technician-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    });

    // Real-Time Job Status Updates
    s.on('job:status_updated', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['urgent-dispatch-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['standard-dispatch-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['driver-assigned-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['technician-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['accounting'] });

      if (data?.jobCode && data?.status) {
        addNotification({
          type: 'STATUS_UPDATED',
          title: `Status: #${data.jobCode}`,
          message: `${data.driverName ? data.driverName + ' updated' : 'Job updated'} to ${data.status.replace('_', ' ')}`,
          timestamp: data.updatedAt || new Date().toISOString(),
          jobId: data.jobId,
          jobCode: data.jobCode,
          driverName: data.driverName,
        });
      }
    });

    // Real-Time Accounting Notice (Job Completed in field by Driver)
    s.on('accounting:job_completed', (data: any) => {
      addNotification({
        type: 'JOB_COMPLETED',
        title: data.title || 'Job Completed — Audit Ready',
        message: data.message || `Job #${data.jobCode} completed. Ready for expense audit.`,
        timestamp: data.timestamp || new Date().toISOString(),
        jobId: data.jobId,
        jobCode: data.jobCode,
        driverName: data.driverName,
      });
      queryClient.invalidateQueries({ queryKey: ['accounting-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-summary'] });
    });

    // Real-Time Direct Chat Messages
    s.on('notification:chat', (data: any) => {
      addNotification({
        type: 'CHAT_MESSAGE',
        title: data.title || 'New Job Chat Message',
        message: data.message || `${data.sender}: ${data.text}`,
        timestamp: data.timestamp || new Date().toISOString(),
        jobId: data.jobId,
        jobCode: data.jobCode,
        driverName: data.sender,
      });
    });

    // General Toasts
    s.on('notification:toast', (data: any) => {
      addNotification({
        type: data.type || 'GENERAL',
        title: data.title || 'Operational Alert',
        message: data.message || 'New system update',
        timestamp: data.timestamp || new Date().toISOString(),
        jobId: data.jobId,
        jobCode: data.jobCode,
      });
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [country, user?.id]);

  // Instantly synchronize presence mode changes without reconnecting
  useEffect(() => {
    if (socket?.connected && user?.id) {
      socket.emit('agent:presence', {
        userId: user.id,
        mode: isAgentActive ? agentMode : 'INACTIVE',
        countryCode: country,
      });
    }
  }, [socket, agentMode, isAgentActive, country, user?.id]);

  const openSoftphone = () => {};
  const closeSoftphone = () => {};

  const answerCall = () => {
    if (incomingCall) {
      setActiveCall(incomingCall);
      setIncomingCall(null);
    }
  };

  const endCall = () => {
    setActiveCall(null);
    setIncomingCall(null);
  };

  const markNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const openChatJob = (job: ActiveChatJob) => {
    setActiveChatJob(job);
  };

  const closeChatJob = () => {
    setActiveChatJob(null);
  };

  const simulateIncomingCall = (
    from = '+1 (416) 555-0199',
    fromName = 'Roadside Driver Marcus'
  ) => {
    if (agentMode !== 'INBOUND') {
      toast.warning('Agent is not in Inbound mode. Switch presence to "Inbound" in top navigation to receive hotline calls.');
      return;
    }
    setIncomingCall({
      callId: `call-${Date.now()}`,
      from,
      fromName,
      region: country,
      timestamp: new Date().toISOString(),
    });
  };

  const acceptTransfer = () => {
    if (incomingTransfer) {
      setActiveCall({
        callId: incomingTransfer.callId,
        from: incomingTransfer.callerPhone,
        fromName: incomingTransfer.companyName || incomingTransfer.callerName || 'Transferred Call',
        region: incomingTransfer.countryCode,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const declineTransfer = () => {
    setIncomingTransfer(null);
  };

  const transferCallToDm = async (params: {
    leadId?: string;
    callerPhone?: string;
    callerName?: string;
    companyName?: string;
    notes?: string;
    vehicleInfo?: string;
    transferType?: 'INBOUND_MOTORIST' | 'OUTBOUND_LEAD';
  }) => {
    try {
      await telephonyService.transferCall({
        callId: activeCall?.callId,
        callerPhone: params.callerPhone || activeCall?.from,
        callerName: params.callerName || activeCall?.fromName,
        companyName: params.companyName,
        notes: params.notes,
        vehicleInfo: params.vehicleInfo,
        leadId: params.leadId,
        transferType: params.transferType || (params.leadId ? 'OUTBOUND_LEAD' : 'INBOUND_MOTORIST'),
      });
      toast.success('Warm transfer initiated to Dispatcher Manager!');
    } catch (err: any) {
      toast.error('Failed to initiate transfer');
    }
  };

  const dialOutbound = (phoneNumber: string, contactName?: string, _leadId?: string) => {
    setActiveCall({
      callId: `call-${Date.now()}`,
      from: phoneNumber,
      fromName: contactName || 'Outbound Call',
      region: country,
      timestamp: new Date().toISOString(),
    });
    toast.success(`Dialing ${contactName ? contactName + ' (' + phoneNumber + ')' : phoneNumber}...`);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        incomingCall,
        activeCall,
        incomingTransfer,
        isSoftphoneOpen: false,
        notifications,
        unreadCount,
        activeChatJob,
        openSoftphone,
        closeSoftphone,
        answerCall,
        endCall,
        acceptTransfer,
        declineTransfer,
        transferCallToDm,
        dialOutbound,
        simulateIncomingCall,
        markNotificationsAsRead,
        openChatJob,
        closeChatJob,
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
