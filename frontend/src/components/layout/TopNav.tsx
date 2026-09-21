import { Menu, PanelLeftClose, PanelLeft, Phone, PhoneCall, Globe } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { COUNTRY_REGIONS, type CountryCode } from '../../constants/regions';
import { toast } from 'sonner';
import { userService } from '../../services/userService';

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
  const { user } = useAuth();
  const { country, setCountry, isAgentActive, setIsAgentActive } = useTenant();
  const { isConnected, openSoftphone, activeCall } = useSocket();

  return (
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

      {/* Right side controls: Softphone trigger, Country Silo, Agent Presence, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Softphone Dialer Quick Button */}
        <button
          type="button"
          onClick={openSoftphone}
          className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs ${
            activeCall 
              ? 'bg-emerald-600 text-white animate-bounce' 
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
          title="Open Telnyx WebRTC Softphone"
        >
          {activeCall ? <PhoneCall className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{activeCall ? 'Call in Progress' : 'Dialer'}</span>
          {activeCall && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          )}
        </button>

        {/* Multi-Tenant Country Silo Selector */}
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

        {/* Agent Presence Toggle */}
        <button
          type="button"
          onClick={async () => {
            const newState = !isAgentActive;
            setIsAgentActive(newState);
            try {
              await userService.toggleMyPresence(newState);
            } catch {
              setIsAgentActive(!newState);
              toast.error('Failed to sync agent status');
            }
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
            isAgentActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
          }`}
          title={isAgentActive ? 'Click to go Inactive / Break' : 'Click to go Active'}
        >
          <span className={`w-2 h-2 rounded-full ${isAgentActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          <span className="hidden sm:inline">{isAgentActive ? 'Ready' : 'Inactive'}</span>
        </button>

        {/* User Mini Profile */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
            {user?.firstName?.[0] || 'U'}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[100px]">
              {user?.firstName || 'Operator'}
            </p>
            <p className="text-[10px] text-slate-400 uppercase font-semibold leading-tight">
              {user?.role || 'DISPATCHER'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
