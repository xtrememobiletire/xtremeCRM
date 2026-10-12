import { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { RouteErrorBoundary } from '../common/RouteErrorBoundary';
import JobChatModal from '../dispatch/JobChatModal';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';

function PageLoader() {
  return (
    <div className="w-full py-8 space-y-4 animate-pulse">
      <div className="h-6 bg-slate-200 rounded-lg w-1/4 mb-4" />
      <div className="h-10 bg-slate-200 rounded-xl w-full mb-4" />
      <div className="space-y-3">
        <div className="h-16 bg-slate-100 rounded-xl w-full" />
        <div className="h-16 bg-slate-100 rounded-xl w-full" />
        <div className="h-16 bg-slate-100 rounded-xl w-full" />
      </div>
    </div>
  );
}

export default function MainLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const { activeChatJob, closeChatJob, socket } = useSocket();
  const { isAgentActive, setAgentMode, country, agentMode } = useTenant();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('xtreme_sidebar_collapsed') === 'true' : false;
  });

  // Automatic Presence & Mode Synchronization:
  // When active: navigating to /outbound automatically sets OUTBOUND; navigating to /inbound automatically sets INBOUND.
  // When inactive: stays INACTIVE.
  // Guarded against redundant updates to avoid cascading root context re-renders.
  useEffect(() => {
    if (user?.role === 'CALL_AGENT' || user?.role === 'ADMIN' || user?.role === 'GENERAL_MANAGER') {
      if (!isAgentActive) {
        if (agentMode !== 'INACTIVE') {
          setAgentMode('INACTIVE');
          if (socket && user?.id) {
            socket.emit('agent:presence', { userId: user.id, mode: 'INACTIVE', countryCode: country });
          }
        }
        return;
      }

      if (location.pathname.startsWith('/outbound') || location.pathname.startsWith('/leads')) {
        if (agentMode !== 'OUTBOUND') {
          setAgentMode('OUTBOUND');
          if (socket && user?.id) {
            socket.emit('agent:presence', { userId: user.id, mode: 'OUTBOUND', countryCode: country });
          }
        }
      } else if (location.pathname.startsWith('/inbound')) {
        if (agentMode !== 'INBOUND') {
          setAgentMode('INBOUND');
          if (socket && user?.id) {
            socket.emit('agent:presence', { userId: user.id, mode: 'INBOUND', countryCode: country });
          }
        }
      }
    }
  }, [location.pathname, isAgentActive, agentMode, user?.id, user?.role, country, socket, setAgentMode]);

  // Strict role containment: CALL_AGENT allowed on /inbound, /inbound-fleet, and /leads
  if (user?.role === 'CALL_AGENT') {
    const agentAllowed = ['/inbound', '/inbound-fleet', '/leads'];
    if (!agentAllowed.includes(location.pathname)) {
      return <Navigate to="/leads" replace />;
    }
  }

  // Strict role containment: VIRTUAL_ASSISTANT allowed on /leads and /inbound-fleet
  if (user?.role === 'VIRTUAL_ASSISTANT') {
    const vaAllowed = ['/leads', '/inbound-fleet'];
    if (!vaAllowed.includes(location.pathname)) {
      return <Navigate to="/leads" replace />;
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
