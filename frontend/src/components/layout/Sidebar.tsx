import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
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
  CheckCircle,
  History
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
}

const baseNavItems = [
  { icon: BarChart3, label: 'Dashboard', path: '/' },
  { icon: Wrench, label: 'Jobs & Orders', path: '/jobs' },
  { icon: Navigation, label: 'Live Dispatch', path: '/dispatch' },
  { icon: Users, label: 'Customers', path: '/customers' },
  { icon: Truck, label: 'Fleet Accounts', path: '/fleets' },
  { icon: Car, label: 'Vehicles', path: '/vehicles' },
  { icon: DollarSign, label: 'Job Costing & Ledger', path: '/accounting' },
];

export default function Sidebar({ isOpen, onClose, isCollapsed = false }: SidebarProps) {
  const { user, logout } = useAuth();
  const { country, currencySymbol } = useTenant();
  const isFleetManager = user?.role === 'FLEET_MANAGER';
  const isMember = user?.role === 'CUSTOMER_MEMBER';
  const isDriver = user?.role === 'DRIVER';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const isDispatcher = user?.role === 'DISPATCHER';
  const isAdmin = user?.role === 'ADMIN';

  const navItems = isFleetManager
    ? [{ icon: Truck, label: 'Fleet Portal', path: '/fleet-dashboard' }]
    : isMember
    ? [{ icon: Car, label: 'Member Portal', path: '/member-dashboard' }]
    : isDriver
    ? [
        { icon: BarChart3, label: 'Dashboard', path: '/technician' },
        { icon: CheckCircle, label: 'Orders', path: '/jobs' },
        { icon: History, label: 'History', path: '/history' },
      ]
    : isAccountant
    ? [
        { icon: DollarSign, label: 'Job Costing & Ledger', path: '/accounting' },
        { icon: Wrench, label: 'Completed Orders', path: '/jobs' },
        { icon: BarChart3, label: 'Regional Dashboard', path: '/' },
      ]
    : isDispatcher
    ? [
        { icon: Navigation, label: 'Live Dispatch', path: '/dispatch' },
        { icon: Wrench, label: 'Jobs & Orders', path: '/jobs' },
        { icon: Truck, label: 'Fleet Accounts', path: '/fleets' },
        { icon: Users, label: 'Customers', path: '/customers' },
        { icon: BarChart3, label: 'Dashboard', path: '/' },
      ]
    : [
        ...baseNavItems,
        ...(isAdmin
          ? [
              { icon: BarChart3, label: 'Technician Dashboard Preview', path: '/technician' },
              { icon: History, label: 'Driver History Preview', path: '/history' },
              { icon: Truck, label: 'Fleet Portal Preview', path: '/fleet-dashboard' },
              { icon: Car, label: 'Member Portal Preview', path: '/member-dashboard' },
            ]
          : []),
      ];

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
              src="/logo-signin.png" 
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
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl text-xs sm:text-sm transition-all duration-150 ${
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
                {(!isCollapsed || isOpen) && (
                  <span className="truncate tracking-tight">{item.label}</span>
                )}
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
