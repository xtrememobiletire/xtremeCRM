import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { SocketProvider } from './context/SocketContext';
import MainLayout from './components/layout/MainLayout';
import { RouteErrorBoundary } from './components/common/RouteErrorBoundary';

// Lazy Loaded Pages
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Jobs = lazy(() => import('./pages/Jobs'));
const Dispatch = lazy(() => import('./pages/Dispatch'));
const Customers = lazy(() => import('./pages/Customers'));
const Fleets = lazy(() => import('./pages/Fleets'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const Accounting = lazy(() => import('./pages/Accounting'));
const FleetDashboard = lazy(() => import('./pages/FleetDashboard'));
const MemberDashboard = lazy(() => import('./pages/MemberDashboard'));
const TechnicianPortal = lazy(() => import('./pages/TechnicianPortal'));
const History = lazy(() => import('./pages/History'));
const Leads = lazy(() => import('./pages/Leads'));

function getRoleHome(role?: string) {
  switch (role) {
    case 'DRIVER':
      return '/technician';
    case 'FLEET_MANAGER':
      return '/fleet-dashboard';
    case 'CUSTOMER_MEMBER':
      return '/member-dashboard';
    case 'ACCOUNTANT':
      return '/accounting';
    case 'DISPATCHER':
      return '/dispatch';
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

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to={getRoleHome(user.role)} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
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
                <MainLayout />
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

        {/* Protected App Routes */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/dispatch" element={<Dispatch />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/fleets" element={<Fleets />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/fleet-dashboard" element={<FleetDashboard />} />
          <Route path="/member-dashboard" element={<MemberDashboard />} />
          <Route path="/technician" element={<TechnicianPortal />} />
          <Route path="/history" element={<History />} />
          <Route path="/leads" element={<Leads />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? getRoleHome(user.role) : "/"} replace />} />
      </Routes>
    </RouteErrorBoundary>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <AuthProvider>
          <SocketProvider>
            <BrowserRouter>
              <Toaster position="top-right" richColors />
              <AppRoutes />
            </BrowserRouter>
          </SocketProvider>
        </AuthProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}
