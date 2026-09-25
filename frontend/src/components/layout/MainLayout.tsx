import { useState, useEffect, Suspense } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { RouteErrorBoundary } from '../common/RouteErrorBoundary';
import ActiveCallBar from '../telephony/ActiveCallBar';
import IncomingCallPop from '../telephony/IncomingCallPop';
import WarmTransferModal from '../telephony/WarmTransferModal';
import JobChatModal from '../dispatch/JobChatModal';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-3 border-slate-200 border-t-red-600 rounded-full animate-spin" />
    </div>
  );
}

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { activeChatJob, closeChatJob, socket } = useSocket();
  const { isAgentActive, setAgentMode, country } = useTenant();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('xtreme_sidebar_collapsed') === 'true' : false;
  });

  // Automatic Presence & Mode Synchronization:
  // When active: navigating to /outbound automatically sets OUTBOUND; navigating to /inbound automatically sets INBOUND.
  // When inactive: stays INACTIVE.
  useEffect(() => {
    if (user?.role === 'CALL_AGENT' || user?.role === 'ADMIN') {
      if (!isAgentActive) {
        setAgentMode('INACTIVE');
        if (socket && user?.id) {
          socket.emit('agent:presence', { userId: user.id, mode: 'INACTIVE', countryCode: country });
        }
        return;
      }

      if (location.pathname.startsWith('/outbound') || location.pathname.startsWith('/leads')) {
        setAgentMode('OUTBOUND');
        if (socket && user?.id) {
          socket.emit('agent:presence', { userId: user.id, mode: 'OUTBOUND', countryCode: country });
        }
      } else if (location.pathname.startsWith('/inbound')) {
        setAgentMode('INBOUND');
        if (socket && user?.id) {
          socket.emit('agent:presence', { userId: user.id, mode: 'INBOUND', countryCode: country });
        }
      }
    }
  }, [location.pathname, isAgentActive, user?.id, user?.role, country, socket, setAgentMode]);

  // Strict role containment: CALL_AGENT only allowed on /inbound and /outbound
  if (user?.role === 'CALL_AGENT') {
    const agentAllowed = ['/inbound', '/outbound', '/leads'];
    if (!agentAllowed.includes(location.pathname)) {
      return <Navigate to="/inbound" replace />;
    }
  }

  // Strict role containment: VIRTUAL_ASSISTANT only allowed on /va-upload
  if (user?.role === 'VIRTUAL_ASSISTANT') {
    const vaAllowed = ['/va-upload'];
    if (!vaAllowed.includes(location.pathname)) {
      return <Navigate to="/va-upload" replace />;
    }
  }

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('xtreme_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const handleIntakeJob = (phone: string) => {
    if (user?.role === 'CALL_AGENT') {
      navigate('/inbound');
    } else {
      navigate(`/jobs?intakePhone=${encodeURIComponent(phone)}`);
    }
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isCollapsed}
      />
      <div className="flex-1 flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden min-w-0">
        <TopNav 
          onMobileMenuClick={() => setIsMobileMenuOpen(true)}
          onToggleCollapse={toggleCollapse}
          isCollapsed={isCollapsed}
        />
        <main className="flex-1 overflow-y-auto px-3.5 py-4 sm:px-6 sm:py-6">
          <div className="max-w-7xl mx-auto w-full">
            <RouteErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </RouteErrorBoundary>
          </div>
        </main>
      </div>

      {/* Global Active Call Bar Dock, Screen Pop & Warm Transfer Pop */}
      <ActiveCallBar />
      <IncomingCallPop onIntakeJob={handleIntakeJob} />
      <WarmTransferModal />

      {/* Global Two-Way Job Chat for Cross-Role Communication */}
      {activeChatJob && (
        <JobChatModal
          isOpen={!!activeChatJob}
          onClose={closeChatJob}
          jobId={activeChatJob.id}
          jobCode={activeChatJob.jobCode}
          driverName={activeChatJob.driverName || 'Technician / Dispatcher'}
        />
      )}
    </div>
  );
}
