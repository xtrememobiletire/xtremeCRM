import { X, Bell, MessageSquare, CheckCircle, Truck, DollarSign, Clock, CheckCheck } from 'lucide-react';
import { useSocket, type AppNotification } from '../../context/SocketContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const { notifications, unreadCount, markNotificationsAsRead, openChatJob } = useSocket();

  if (!isOpen) return null;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'CHAT_MESSAGE':
        return <MessageSquare className="w-4 h-4 text-red-600" />;
      case 'JOB_ASSIGNED':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'JOB_COMPLETED':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'PAYOUT_VERIFIED':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const handleClickItem = (item: AppNotification) => {
    if (item.jobId) {
      openChatJob({
        id: item.jobId,
        jobCode: item.jobCode,
        driverName: item.driverName,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm sm:max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Operations Feed</h3>
                <p className="text-[11px] text-slate-500 font-medium">Real-time inter-role dispatch notices</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markNotificationsAsRead}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark Read</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Feed List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <div className="p-3 bg-slate-50 rounded-full mb-2 text-slate-400">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-700">No Notifications Yet</p>
                <p className="text-[11px] text-slate-400 max-w-[200px] mt-1">
                  New job dispatches, driver status updates, and chat messages will appear here live.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleClickItem(item)}
                  className={`p-3.5 flex gap-3 hover:bg-slate-50 transition cursor-pointer ${
                    !item.read ? 'bg-red-50/20' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0 p-2 rounded-xl bg-slate-50 border border-slate-100 shadow-2xs h-fit">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    {item.jobCode && (
                      <span className="inline-block mt-1 font-mono text-[10px] font-bold text-red-700 bg-red-50 border border-red-100 px-1.5 py-0.2 rounded">
                        #{item.jobCode}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
