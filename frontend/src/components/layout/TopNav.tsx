import { useState } from 'react';
import { Menu, PanelLeftClose, PanelLeft, Globe, Bell, LogOut } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { COUNTRY_REGIONS, type CountryCode } from '../../constants/regions';
import { toast } from 'sonner';
import { userService } from '../../services/userService';
import NotificationDrawer from '../common/NotificationDrawer';

interface TopNavProps {
  onMobileMenuClick: () => void;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
}

export default function TopNav({
  onMobileMenuClick,
  onToggleCollapse,
  isCollapsed,
}: TopNavProps) {
  const { user, logout } = useAuth();
  const { country, setCountry, setAgentMode, isAgentActive, setIsAgentActive } = useTenant();
  const { socket, isConnected, unreadCount } = useSocket();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isAgentOrAdmin = user?.role === 'CALL_AGENT' || user?.role === 'ADMIN';
  const canSwitchCountry = user?.role === 'ADMIN' || user?.role === 'DISPATCHER' || user?.role === 'ACCOUNTANT';

  return (
    <>
      <header className="h-14 bg-white border-b border-slate-200 px-3.5 sm:px-5 flex items-center justify-between gap-2 sm:gap-4 shrink-0 z-30">
        {/* Left side: Mobile burger + desktop collapse button + Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onMobileMenuClick}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          {/* Socket live indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-50 border border-slate-200">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-slate-600">{isConnected ? 'Live Dispatch' : 'Connecting...'}</span>
          </div>
        </div>

        {/* Right side controls: Notifications, Country Silo, Agent Presence, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Operations Notification Bell */}
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            title="Operations Feed & Inter-Role Messages"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-white text-[9px] font-black animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Multi-Tenant Country Silo Selector (Interactive for Admin/Staff, Static Badge for External/Drivers) */}
          {canSwitchCountry ? (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
              <Globe className="w-3.5 h-3.5 text-slate-400 ml-1 hidden sm:block" />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value as CountryCode)}
                className="bg-transparent text-xs font-bold text-slate-800 pr-1 pl-1 outline-none cursor-pointer"
                aria-label="Select Country Tenant"
              >
                {Object.entries(COUNTRY_REGIONS).map(([code, region]) => (
                  <option key={code} value={code}>
                    {code} ({region.currency})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>{country} ({COUNTRY_REGIONS[country]?.currency || 'CAD'})</span>
            </div>
          )}

          {/* Agent Presence Switch (Active / On Break) - Mode is auto-determined by current page */}
          {isAgentOrAdmin && (
            <button
              type="button"
              onClick={async () => {
                const nextActive = !isAgentActive;
                setIsAgentActive(nextActive);
                const isOutboundPath = window.location.pathname.includes('/outbound') || window.location.pathname.includes('/leads');
                const nextMode = nextActive ? (isOutboundPath ? 'OUTBOUND' : 'INBOUND') : 'INACTIVE';
                setAgentMode(nextMode);

                if (socket && user) {
                  socket.emit('agent:presence', { userId: user.id, mode: nextMode, countryCode: country });
                }
                try {
                  await userService.toggleMyPresence(nextActive);
                } catch {}

                if (nextActive) {
                  toast.success(`You are Active (${isOutboundPath ? 'Outbound' : 'Inbound'} Hotline)`);
                } else {
                  toast.info('Status set to On Break (Inactive)');
                }
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                isAgentActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
              title={isAgentActive ? 'Click to take a break' : 'Click to go on duty'}
            >
              <span className={`w-2 h-2 rounded-full ${isAgentActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{isAgentActive ? 'Active' : 'On Break'}</span>
            </button>
          )}

        {/* User Mini Profile & Dropdown */}
        <div className="relative flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-200">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition cursor-pointer select-none"
            aria-label="User profile options"
          >
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shadow-2xs ring-1 ring-red-200">
              {user?.firstName?.[0] || 'U'}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[100px]">
                {user?.firstName || 'Operator'}
              </p>
              <p className="text-[10px] text-slate-400 uppercase font-semibold leading-tight mt-0.5">
                {user?.role || 'DISPATCHER'}
              </p>
            </div>
          </button>

          {/* Quick 1-tap Logout for Mobile screens */}
          <button
            type="button"
            onClick={logout}
            className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer active:scale-95"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
          </button>

          {/* User Popover Menu */}
          {isUserMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200 p-3 z-50 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-100">
                <div className="border-b border-slate-100 pb-2">
                  <p className="font-bold text-slate-900 text-sm">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-slate-400 truncate text-[11px] font-mono mt-0.5">{user?.email}</p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    {user?.role} • {country}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition border border-rose-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
    <NotificationDrawer
      isOpen={isNotificationsOpen}
      onClose={() => setIsNotificationsOpen(false)}
    />
  </>
  );
}
