import { useState, Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { RouteErrorBoundary } from '../common/RouteErrorBoundary';
import SoftphoneModal from '../telephony/SoftphoneModal';
import IncomingCallPop from '../telephony/IncomingCallPop';
import JobChatModal from '../dispatch/JobChatModal';
import { useSocket } from '../../context/SocketContext';

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-3 border-slate-200 border-t-red-600 rounded-full animate-spin" />
    </div>
  );
}

export default function MainLayout() {
  const navigate = useNavigate();
  const { activeChatJob, closeChatJob } = useSocket();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('xtreme_sidebar_collapsed') === 'true' : false;
  });

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
    navigate(`/jobs?intakePhone=${encodeURIComponent(phone)}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isCollapsed}
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
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

      {/* Global Softphone Modal & Screen Pop */}
      <SoftphoneModal />
      <IncomingCallPop onIntakeJob={handleIntakeJob} />

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
