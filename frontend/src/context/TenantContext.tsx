import { createContext, useContext, useState, type ReactNode } from 'react';
import { REGIONS, type RegionCode, type RegionConfig } from '../constants/regions';

interface TenantContextType {
  country: RegionCode;
  region: RegionConfig;
  currencySymbol: string;
  taxRate: number;
  setCountry: (code: RegionCode) => void;
  isAgentActive: boolean;
  setIsAgentActive: (active: boolean) => void;
  toggleAgentActive: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<RegionCode>(() => {
    return (localStorage.getItem('xtreme_country') as RegionCode) || 'CA';
  });

  const [isAgentActive, setIsAgentActiveState] = useState<boolean>(() => {
    return localStorage.getItem('xtreme_agent_active') !== 'false';
  });

  const setCountry = (code: RegionCode) => {
    setCountryState(code);
    localStorage.setItem('xtreme_country', code);
  };

  const setIsAgentActive = (active: boolean) => {
    setIsAgentActiveState(active);
    localStorage.setItem('xtreme_agent_active', String(active));
  };

  const toggleAgentActive = () => {
    setIsAgentActiveState((prev) => {
      const next = !prev;
      localStorage.setItem('xtreme_agent_active', String(next));
      return next;
    });
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
