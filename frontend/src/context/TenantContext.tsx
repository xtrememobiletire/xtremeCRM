import { createContext, useContext, useState, type ReactNode } from 'react';
import { REGIONS, type RegionCode, type RegionConfig } from '../constants/regions';
import { queryClient } from '../lib/queryClient';

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

export function TenantProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<RegionCode>(() => {
    return (localStorage.getItem('xtreme_country') as RegionCode) || 'CA';
  });

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
