import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { REGIONS, type RegionCode, type RegionConfig } from '../constants/regions';
import { queryClient } from '../lib/queryClient';
import { useAuth } from './AuthContext';

export type AgentPresenceMode = 'INACTIVE' | 'INBOUND' | 'OUTBOUND';

interface TenantContextType {
  country: RegionCode;
  region: RegionConfig;
  currencySymbol: string;
  taxRate: number;
  setCountry: (code: RegionCode) => void;
  isAgentActive: boolean;
  setIsAgentActive: (active: boolean) => void;
  toggleAgentActive: () => void;
  agentMode: AgentPresenceMode;
  setAgentMode: (mode: AgentPresenceMode) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const NON_SWITCHING_ROLES = ['DRIVER', 'FLEET_MANAGER', 'CUSTOMER_MEMBER'];

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [country, setCountryState] = useState<RegionCode>(() => {
    // 1. If stored user has a role-locked country, prioritize it
    const savedUserStr = localStorage.getItem('xtreme_user');
    if (savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser?.countryCode && NON_SWITCHING_ROLES.includes(savedUser.role)) {
          return savedUser.countryCode as RegionCode;
        }
      } catch {}
    }
    return (localStorage.getItem('xtreme_country') as RegionCode) || 'CA';
  });

  // Automatically enforce regional silo when user logs in or loads
  useEffect(() => {
    if (!user) return;
    if (user.countryCode) {
      if (NON_SWITCHING_ROLES.includes(user.role)) {
        if (country !== user.countryCode) {
          setCountryState(user.countryCode as RegionCode);
          localStorage.setItem('xtreme_country', user.countryCode);
          queryClient.invalidateQueries();
        }
      } else {
        const currentSaved = localStorage.getItem('xtreme_country');
        if (!currentSaved) {
          setCountryState(user.countryCode as RegionCode);
          localStorage.setItem('xtreme_country', user.countryCode);
        }
      }
    }
  }, [user, country]);

  const [agentMode, setAgentModeState] = useState<AgentPresenceMode>(() => {
    const saved = localStorage.getItem('xtreme_agent_mode') as AgentPresenceMode;
    if (saved && ['INACTIVE', 'INBOUND', 'OUTBOUND'].includes(saved)) {
      return saved;
    }
    return 'INBOUND';
  });

  const [isAgentActive, setIsAgentActiveState] = useState<boolean>(() => {
    return agentMode !== 'INACTIVE';
  });

  const setCountry = (code: RegionCode) => {
    setCountryState(code);
    localStorage.setItem('xtreme_country', code);
    // ponytail: invalidate all queries on tenant switch to instantly reflect regional silo data
    queryClient.invalidateQueries();
  };

  const setAgentMode = (mode: AgentPresenceMode) => {
    setAgentModeState(mode);
    localStorage.setItem('xtreme_agent_mode', mode);
    const active = mode !== 'INACTIVE';
    setIsAgentActiveState(active);
    localStorage.setItem('xtreme_agent_active', String(active));
  };

  const setIsAgentActive = (active: boolean) => {
    setIsAgentActiveState(active);
    localStorage.setItem('xtreme_agent_active', String(active));
    const newMode: AgentPresenceMode = active ? 'INBOUND' : 'INACTIVE';
    setAgentModeState(newMode);
    localStorage.setItem('xtreme_agent_mode', newMode);
  };

  const toggleAgentActive = () => {
    const next = !isAgentActive;
    setIsAgentActive(next);
  };

  const region = REGIONS[country] || REGIONS.CA;

  return (
    <TenantContext.Provider
      value={{
        country,
        region,
        currencySymbol: region.symbol,
        taxRate: region.taxRate,
        setCountry,
        isAgentActive,
        setIsAgentActive,
        toggleAgentActive,
        agentMode,
        setAgentMode,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within a TenantProvider');
  return ctx;
}
