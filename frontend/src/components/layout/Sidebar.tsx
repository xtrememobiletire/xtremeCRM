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
  Radio
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
}

const navItems = [
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

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`fixed md:relative top-0 left-0 h-screen bg-white border-r border-slate-200 flex flex-col z-50 transition-all duration-200 shrink-0 select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100 bg-white">
          <div className={`flex items-center gap-2.5 ${isCollapsed ? 'md:justify-center md:w-full' : ''}`}>
            <div className="grid place-items-center rounded-xl p-2 bg-red-50 text-red-600 shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            {(!isCollapsed || isOpen) && (
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-black tracking-tight text-slate-900 truncate">
                  Xtreme<span className="text-red-600">CRM</span>
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {country} Region ({currencySymbol})
                </p>
              </div>
            )}
          </div>
          <button 
            type="button"
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition" 
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
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

        {/* User Info / Sign Out */}
        <div className="p-3 border-t border-slate-100 bg-white">
          <button 
            type="button"
            onClick={logout}
            title={isCollapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors ${
              isCollapsed ? 'md:px-0 px-3' : 'px-3'
            }`}
          >
            <LogOut size={15} className="shrink-0" />
            {(!isCollapsed || isOpen) && (
              <span className="truncate">Sign Out ({user?.firstName || 'User'})</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
