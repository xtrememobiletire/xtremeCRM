import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { SocketProvider } from './context/SocketContext';
import MainLayout from './components/layout/MainLayout';
import { RouteErrorBoundary } from './components/common/RouteErrorBoundary';
import { useSSE } from './hooks/useSSE';

import { lazyWithRetry } from './utils/lazyWithRetry';

// Lazy Loaded Pages with Auto-Retry
const Landing = lazyWithRetry(() => import('./pages/Landing'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Jobs = lazyWithRetry(() => import('./pages/Jobs'));
const Dispatch = lazyWithRetry(() => import('./pages/Dispatch'));
const Customers = lazyWithRetry(() => import('./pages/Customers'));
const Fleets = lazyWithRetry(() => import('./pages/Fleets'));
const Vehicles = lazyWithRetry(() => import('./pages/Vehicles'));
const Accounting = lazyWithRetry(() => import('./pages/Accounting'));
const FleetDashboard = lazyWithRetry(() => import('./pages/FleetDashboard'));
const MemberDashboard = lazyWithRetry(() => import('./pages/MemberDashboard'));
const TechnicianPortal = lazyWithRetry(() => import('./pages/TechnicianPortal'));
const History = lazyWithRetry(() => import('./pages/History'));
const Leads = lazyWithRetry(() => import('./pages/Leads'));
const Inbound = lazyWithRetry(() => import('./pages/Inbound'));
const CustomerMapView = lazyWithRetry(() => import('./pages/customers/CustomerMapView'));
const JobMapView = lazyWithRetry(() => import('./pages/jobs/JobMapView'));
const FleetJobs = lazyWithRetry(() => import('./pages/FleetJobs'));
const Bookings = lazyWithRetry(() => import('./pages/Bookings'));
const FleetInbound = lazyWithRetry(() => import('./pages/FleetInbound'));

function getRoleHome(role?: string) {
  switch (role) {
    case 'DRIVER':
      return '/technician';
    case 'CALL_AGENT':
      return '/leads';
    case 'VIRTUAL_ASSISTANT':
      return '/leads';
    case 'FLEET_MANAGER':
      return '/fleet-dashboard';
    case 'CUSTOMER_MEMBER':
      return '/member-dashboard';
    case 'ACCOUNTANT':
      return '/accounting';
    case 'DISPATCHER':
      return '/jobs';
    default:
      return '/dashboard';
  }
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-3 border-slate-200 border-t-red-600 rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleRoute({ allowedRoles, children }: { allowedRoles: string[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN' || user.role === 'GENERAL_MANAGER') return <>{children}</>;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to={getRoleHome(user.role)} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  useSSE();
  if (loading) return <PageLoader />;

  return (
    <RouteErrorBoundary>
      <Routes>
        {/* Unauthenticated Landing Page */}
        <Route
          path="/landing"
          element={
            <Suspense fallback={<PageLoader />}>
              <Landing />
            </Suspense>
          }
        />

        {/* Public Login Route */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Suspense fallback={<PageLoader />}>
                <Login />
              </Suspense>
            </PublicRoute>
          }
        />

        {/* Root Route: If authenticated -> Dashboard in MainLayout, else Landing */}
        <Route
          path="/"
          element={
            user ? (
              <ProtectedRoute>
                {user.role === 'FLEET_MANAGER' ? (
                  <Navigate to="/fleet-dashboard" replace />
                ) : (
                  <MainLayout />
                )}
              </ProtectedRoute>
            ) : (
              <Suspense fallback={<PageLoader />}>
                <Landing />
              </Suspense>
            )
          }
        >
          {user && <Route index element={<Navigate to={getRoleHome(user.role)} replace />} />}
        </Route>

        {/* Dedicated Standalone Fleet Manager Portal */}
        <Route
          path="/fleet-dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['FLEET_MANAGER']}>
                <Suspense fallback={<PageLoader />}>
                  <FleetDashboard />
                </Suspense>
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Protected App Routes */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<RoleRoute allowedRoles={['DISPATCHER', 'ACCOUNTANT']}><Dashboard /></RoleRoute>} />
          <Route path="/leads" element={<RoleRoute allowedRoles={['VIRTUAL_ASSISTANT', 'CALL_AGENT', 'DISPATCHER']}><Leads /></RoleRoute>} />
          <Route path="/outbound" element={<Navigate to="/leads" replace />} />
          <Route path="/jobs" element={<RoleRoute allowedRoles={['DISPATCHER']}><Jobs /></RoleRoute>} />
          <Route path="/fleet-jobs" element={<RoleRoute allowedRoles={['DISPATCHER']}><FleetJobs /></RoleRoute>} />
          <Route path="/bookings" element={<RoleRoute allowedRoles={['DISPATCHER']}><Bookings /></RoleRoute>} />
          <Route path="/jobs/map" element={<RoleRoute allowedRoles={['DISPATCHER']}><JobMapView /></RoleRoute>} />
          <Route path="/dispatch" element={<RoleRoute allowedRoles={['DISPATCHER']}><Dispatch /></RoleRoute>} />
          <Route path="/customers" element={<RoleRoute allowedRoles={['DISPATCHER']}><Customers /></RoleRoute>} />
          <Route path="/customers/map" element={<RoleRoute allowedRoles={['DISPATCHER']}><CustomerMapView /></RoleRoute>} />
          <Route path="/fleets" element={<RoleRoute allowedRoles={['DISPATCHER']}><Fleets /></RoleRoute>} />
          <Route path="/vehicles" element={<RoleRoute allowedRoles={['DISPATCHER']}><Vehicles /></RoleRoute>} />
          <Route path="/accounting" element={<RoleRoute allowedRoles={['ACCOUNTANT']}><Accounting /></RoleRoute>} />
          <Route path="/inbound" element={<RoleRoute allowedRoles={['CALL_AGENT', 'DISPATCHER']}><Inbound /></RoleRoute>} />
          <Route path="/inbound-fleet" element={<RoleRoute allowedRoles={['CALL_AGENT', 'DISPATCHER']}><FleetInbound /></RoleRoute>} />
          <Route path="/technician" element={<RoleRoute allowedRoles={['DRIVER']}><TechnicianPortal /></RoleRoute>} />
          <Route path="/history" element={<RoleRoute allowedRoles={['DRIVER']}><History /></RoleRoute>} />
          <Route path="/member-dashboard" element={<RoleRoute allowedRoles={['CUSTOMER_MEMBER']}><MemberDashboard /></RoleRoute>} />
        </Route>

        <Route path="*" element={<Navigate to={user ? getRoleHome(user.role) : "/"} replace />} />
      </Routes>
    </RouteErrorBoundary>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <SocketProvider>
            <BrowserRouter>
              <Toaster position="top-right" richColors />
              <AppRoutes />
            </BrowserRouter>
          </SocketProvider>
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
