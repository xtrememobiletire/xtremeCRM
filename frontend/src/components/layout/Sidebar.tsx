import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { jobService } from '../../services/jobService';
import { fleetService } from '../../services/fleetService';
import { customerService } from '../../services/customerService';
import { 
  BarChart3, 
  Wrench, 
  Navigation, 
  Users, 
  Truck, 
  Car, 
  DollarSign, 
  X, 
  LogOut,
  History,
  PhoneIncoming,
  PhoneOutgoing,
  Globe,
  FileText,
  UserCheck,
  Cpu,
} from 'lucide-react';

const routeChunkLoaders: Record<string, () => Promise<any>> = {
  '/dashboard': () => import('../../pages/Dashboard'),
  '/jobs': () => import('../../pages/Jobs'),
  '/fleet-jobs': () => import('../../pages/FleetJobs'),
  '/bookings': () => import('../../pages/Bookings'),
  '/inbound': () => import('../../pages/Inbound'),
  '/inbound-fleet': () => import('../../pages/FleetInbound'),
  '/dispatch': () => import('../../pages/Dispatch'),
  '/fleets': () => import('../../pages/Fleets'),
  '/customers': () => import('../../pages/Customers'),
  '/invoices': () => import('../../pages/Invoices'),
  '/drivers': () => import('../../pages/Drivers'),
  '/accounting': () => import('../../pages/Accounting'),
  '/developer-profit': () => import('../../pages/DeveloperProfitPage'),
  '/leads': () => import('../../pages/Leads'),
  '/fleet-dashboard': () => import('../../pages/FleetDashboard'),
  '/member-dashboard': () => import('../../pages/MemberDashboard'),
  '/member/dashboard': () => import('../../pages/MemberDashboard'),
  '/member/garage': () => import('../../pages/MemberDashboard'),
  '/member/request': () => import('../../pages/MemberDashboard'),
  '/member/history': () => import('../../pages/MemberDashboard'),
  '/member/invoices': () => import('../../pages/MemberDashboard'),
  '/technician': () => import('../../pages/TechnicianPortal'),
  '/history': () => import('../../pages/History'),
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
}

const adminNavItems = [
  { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
  { icon: Wrench, label: 'Jobs', path: '/jobs' },
  { icon: Truck, label: 'Fleet Jobs', path: '/fleet-jobs' },
  { icon: Globe, label: 'Bookings', path: '/bookings' },
  { icon: DollarSign, label: 'Accounting', path: '/accounting' },
  { icon: Navigation, label: 'Dispatch', path: '/dispatch' },
  { icon: PhoneOutgoing, label: 'Leads', path: '/leads' },
  { icon: Truck, label: 'Fleets', path: '/fleets' },
  { icon: FileText, label: 'Invoices', path: '/invoices' },
  { icon: UserCheck, label: 'Drivers', path: '/drivers' },
  { icon: Users, label: 'Customer', path: '/customers' },
  { icon: Cpu, label: 'Developer', path: '/developer-profit' },
  { icon: PhoneIncoming, label: 'Roadside Intake', path: '/inbound' },
  { icon: Truck, label: 'Fleet Intake', path: '/inbound-fleet' },
];

const baseNavItems = [
  { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
  { icon: Wrench, label: 'Jobs', path: '/jobs' },
  { icon: Truck, label: 'Fleet Jobs', path: '/fleet-jobs' },
  { icon: Globe, label: 'Bookings', path: '/bookings' },
  { icon: DollarSign, label: 'Accounting', path: '/accounting' },
  { icon: Navigation, label: 'Dispatch', path: '/dispatch' },
  { icon: PhoneOutgoing, label: 'Leads', path: '/leads' },
  { icon: Truck, label: 'Fleets', path: '/fleets' },
  { icon: FileText, label: 'Invoices', path: '/invoices' },
  { icon: UserCheck, label: 'Drivers', path: '/drivers' },
  { icon: Users, label: 'Customer', path: '/customers' },
  { icon: PhoneIncoming, label: 'Roadside Intake', path: '/inbound' },
  { icon: Truck, label: 'Fleet Intake', path: '/inbound-fleet' },
];

/**
 * Render role-specific navigation with a pending-job badge and sign-out control.
 * Preload route chunks on idle, focus, or hover; support mobile and collapsed views.
 */
export default function Sidebar({ isOpen, onClose, isCollapsed = false }: SidebarProps) {
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { country, currencySymbol } = useTenant();
  const isFleetManager = user?.role === 'FLEET_MANAGER';
  const isMember = user?.role === 'CUSTOMER_MEMBER';
  const isDriver = user?.role === 'DRIVER';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const isDispatcher = user?.role === 'DISPATCHER';
  const isAgent = user?.role === 'CALL_AGENT';
  const isVa = user?.role === 'VIRTUAL_ASSISTANT';

  // Live nav badge telemetry for /jobs, /fleet-jobs, /bookings, /invoices
  const { data: navCounts } = useQuery({
    queryKey: ['nav-counts', country],
    queryFn: () => jobService.getNavCounts(country),
    refetchInterval: 15000,
    enabled: !isFleetManager && !isMember && !isDriver && !isVa,
  });

  const getNavBadge = (path: string) => {
    if (!navCounts) return 0;
    if (path === '/jobs') return navCounts.jobs || 0;
    if (path === '/fleet-jobs') return navCounts.fleetJobs || 0;
    if (path === '/bookings') return navCounts.bookings || 0;
    if (path === '/invoices') return navCounts.invoices || 0;
    return 0;
  };

  const navItems = isFleetManager
    ? [{ icon: Truck, label: 'Fleet Portal', path: '/fleet-dashboard' }]
    : isMember
    ? [
        { icon: BarChart3, label: 'Overview', path: '/member/dashboard' },
        { icon: Car, label: 'My Garage', path: '/member/garage' },
        { icon: Wrench, label: 'Request Service', path: '/member/request' },
        { icon: History, label: 'Service History', path: '/member/history' },
        { icon: FileText, label: 'Invoices & Receipts', path: '/member/invoices' },
      ]
    : isDriver
    ? [
        { icon: Wrench, label: 'Orders', path: '/technician' },
        { icon: History, label: 'Earnings & History', path: '/history' },
      ]
    : isAccountant
    ? [
        { icon: DollarSign, label: 'Accounting', path: '/accounting' },
        { icon: FileText, label: 'Invoices', path: '/invoices' },
      ]
    : isDispatcher
    ? [
        { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
        { icon: Wrench, label: 'Jobs', path: '/jobs' },
        { icon: Truck, label: 'Fleet Jobs', path: '/fleet-jobs' },
        { icon: Globe, label: 'Bookings', path: '/bookings' },
        { icon: Navigation, label: 'Dispatch', path: '/dispatch' },
        { icon: PhoneOutgoing, label: 'Leads', path: '/leads' },
        { icon: Truck, label: 'Fleets', path: '/fleets' },
        { icon: FileText, label: 'Invoices', path: '/invoices' },
        { icon: UserCheck, label: 'Drivers', path: '/drivers' },
        { icon: Users, label: 'Customer', path: '/customers' },
        { icon: PhoneIncoming, label: 'Roadside Intake', path: '/inbound' },
        { icon: Truck, label: 'Fleet Intake', path: '/inbound-fleet' },
      ]
    : isVa
    ? [
        { icon: PhoneOutgoing, label: 'Leads Queue', path: '/leads' },
      ]
    : isAgent
    ? [
        { icon: PhoneOutgoing, label: 'Leads Queue', path: '/leads' },
        { icon: PhoneIncoming, label: 'Roadside Intake', path: '/inbound' },
        { icon: Truck, label: 'Fleet Intake', path: '/inbound-fleet' },
      ]
    : user?.role === 'DEVELOPER' || user?.role === 'ADMIN' || user?.role === 'GENERAL_MANAGER'
    ? adminNavItems
    : baseNavItems;

  const prefetchRoute = (path: string) => {
    routeChunkLoaders[path]?.();
    if (path === '/jobs') {
      queryClient.prefetchQuery({
        queryKey: ['jobs', 'ALL', { page: 1, limit: 20, isFleetJob: 'false', countryCode: 'ALL' }],
        queryFn: () => jobService.getJobs({ page: 1, limit: 20, isFleetJob: 'false', countryCode: 'ALL' }),
        staleTime: 60000,
      });
    } else if (path === '/fleet-jobs') {
      queryClient.prefetchQuery({
        queryKey: ['fleet-jobs', country || 'CA', '', 'ACTIVE', '', 1],
        queryFn: () =>
          jobService.getJobs({
            page: 1,
            limit: 25,
            countryCode: country || 'CA',
            status: 'ACTIVE',
            isFleetJob: 'true' as any,
          }),
        staleTime: 60000,
      });
    } else if (path === '/fleets') {
      queryClient.prefetchQuery({
        queryKey: ['fleets', country || 'CA', 1, '', 'ALL'],
        queryFn: () => fleetService.getFleets({ countryCode: country || 'CA' }),
        staleTime: 60000,
      });
    } else if (path === '/customers') {
      queryClient.prefetchQuery({
        queryKey: ['customers', country || 'CA', 1, ''],
        queryFn: () => customerService.getCustomers({ page: 1, limit: 25, countryCode: country || 'CA' }),
        staleTime: 60000,
      });
    } else if (path === '/bookings') {
      queryClient.prefetchQuery({
        queryKey: ['bookings-queue', country, '', 1],
        queryFn: () =>
          jobService.getJobs({
            page: 1,
            limit: 25,
            countryCode: country,
            status: 'UNVERIFIED_PUBLIC',
          }),
        staleTime: 60000,
      });
    }
  };

  // Pre-warm all role routes in background when browser is idle
  useEffect(() => {
    const idleCallback =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (window as any).requestIdleCallback
        : (cb: any) => setTimeout(cb, 1200);

    const handle = idleCallback(() => {
      navItems.forEach((item) => {
        routeChunkLoaders[item.path]?.();
      });
    });

    return () => {
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(handle);
      } else {
        clearTimeout(handle);
      }
    };
  }, [navItems]);

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 transition-opacity" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 md:relative h-[100dvh] max-h-[100dvh] bg-white border-r border-slate-200 flex flex-col z-50 transition-all duration-200 shrink-0 select-none shadow-2xl md:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-72 max-w-[85vw]`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 bg-white shrink-0">
          <div className={`flex items-center gap-2 ${isCollapsed ? 'md:justify-center md:w-full' : ''}`}>
            <img 
              src="https://res.cloudinary.com/ebjikx52/image/upload/v1792426903/xtreme/frontend/logo-signin_png.png" 
              alt="Xtreme Mobile Tire" 
              className={isCollapsed ? "h-8 w-8 object-contain shrink-0" : "h-10 sm:h-11 w-auto max-w-[145px] object-contain shrink-0 drop-shadow-xs"} 
            />
            {(!isCollapsed || isOpen) && (
              <div className="min-w-0">
                <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-700 border border-slate-200 font-mono">
                  {country} ({currencySymbol})
                </span>
              </div>
            )}
          </div>
          <button 
            type="button"
            className="md:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer" 
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-3 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => { if (isOpen) onClose(); }}
                onMouseEnter={() => prefetchRoute(item.path)}
                onFocus={() => prefetchRoute(item.path)}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 rounded-xl text-xs sm:text-sm transition-all duration-150 ${
                    isCollapsed 
                      ? 'md:justify-center md:px-0 md:py-2.5 px-3.5 py-2.5' 
                      : 'px-3.5 py-2.5'
                  } ${
                    isActive 
                      ? 'bg-red-50 text-red-700 font-bold shadow-2xs' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
                  }`
                }
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                {(() => {
                  const badgeCount = getNavBadge(item.path);
                  if (!isCollapsed || isOpen) {
                    return (
                      <>
                        <span className="truncate tracking-tight flex-1">{item.label}</span>
                        {badgeCount > 0 && (
                          <span
                            className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs border ${
                              item.path === '/invoices'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : item.path === '/bookings'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : item.path === '/fleet-jobs'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            {badgeCount}
                          </span>
                        )}
                      </>
                    );
                  }

                  if (badgeCount > 0) {
                    return (
                      <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                    );
                  }

                  return null;
                })()}
              </NavLink>
            );
          })}
        </nav>

        {/* User Info / Sign Out Footer (Pinned to bottom, never pushed offscreen) */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-slate-200 bg-slate-50/95 backdrop-blur-xs">
          {(!isCollapsed || isOpen) && (
            <div className="flex items-center gap-2.5 mb-2.5 px-1">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.firstName?.[0] || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {user?.firstName || 'User'} {user?.lastName || ''}
                </p>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">
                  {user?.role || 'OPERATOR'}
                </p>
              </div>
            </div>
          )}
          <button 
            type="button"
            onClick={logout}
            title={isCollapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 shadow-2xs transition-colors cursor-pointer`}
          >
            <LogOut size={16} className="shrink-0 text-rose-600" />
            {(!isCollapsed || isOpen) && (
              <span>Sign Out</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
