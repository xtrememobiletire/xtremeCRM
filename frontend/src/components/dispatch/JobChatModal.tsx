import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, User, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { messageService, type JobMessageItem } from '../../services/messageService';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

interface JobChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobCode?: string;
  driverName?: string;
}

export default function JobChatModal({
  isOpen,
  onClose,
  jobId,
  jobCode = 'Job Chat',
  driverName = 'Assigned Driver',
}: JobChatModalProps) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState<JobMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && jobId) {
      setLoading(true);
      messageService
        .getJobMessages(jobId)
        .then((data) => {
          setMessages(data);
          setTimeout(scrollToBottom, 100);
        })
        .catch(() => {
          toast.error('Failed to load chat history');
        })
        .finally(() => setLoading(false));

      if (socket) {
        socket.emit('chat:join', jobId);

        const handleIncoming = (incoming: any) => {
          if (incoming.jobId === jobId) {
            setMessages((prev) => {
              // Avoid duplicates if sender already has this message
              if (prev.some((m) => m.content === incoming.text && Math.abs(new Date(m.createdAt).getTime() - new Date(incoming.timestamp).getTime()) < 3000)) {
                return prev;
              }
              return [
                ...prev,
                {
                  id: `sock-${Date.now()}-${Math.random()}`,
                  jobId,
                  senderId: incoming.senderId,
                  content: incoming.text,
                  createdAt: incoming.timestamp || new Date().toISOString(),
                  sender: {
                    id: incoming.senderId,
                    fullName: incoming.sender,
                    role: incoming.senderRole || 'STAFF',
                  },
                },
              ];
            });
            setTimeout(scrollToBottom, 100);
          }
        };

        socket.on('chat:message', handleIncoming);

        return () => {
          socket.emit('chat:leave', jobId);
          socket.off('chat:message', handleIncoming);
        };
      }
    }
  }, [isOpen, jobId, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    try {
      setSending(true);
      setInputText('');
      const sent = await messageService.sendJobMessage(jobId, text);
      setMessages((prev) => [...prev, sent]);
      setTimeout(scrollToBottom, 50);
    } catch {
      toast.error('Failed to send message');
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Live Dispatch Chat: #${jobCode}`}
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col h-[460px]">
        {/* Header driver info badge */}
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-800">Direct Comms Channel:</span>
            <span className="font-bold text-red-600">{driverName}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Two-Way Radio</span>
        </div>

        {/* Message history */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2.5 bg-slate-50/70 rounded-xl border border-slate-200/80">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-red-600" />
              <span>Loading radio transmission...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs text-center p-6">
              <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No transmissions yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Send ETA updates, location coordinates, or customer instructions directly to the technician.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId 
                ? m.senderId === user?.id 
                : (user?.role === 'DRIVER' ? m.sender?.role === 'DRIVER' : m.sender?.role !== 'DRIVER');
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5 px-1">
                    <User className="w-2.5 h-2.5" />
                    <span>{m.sender?.fullName || (isMe ? 'Dispatcher' : driverName)}</span>
                    <span>•</span>
                    <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div
                    className={`max-w-[82%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-slate-900 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-slate-200/90 shadow-2xs rounded-bl-xs'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Transmission Input Form */}
        <form onSubmit={handleSend} className="pt-3 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type message to roadside driver..."
            className="input-base text-xs flex-1"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending || loading}
            className="btn-primary px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5"
          >
            {sending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Send</span>
          </button>
        </form>
      </div>
    </Modal>
  );
}
