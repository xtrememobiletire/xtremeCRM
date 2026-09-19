export type RegionCode = 'CA' | 'US' | 'UK';
export type CountryCode = RegionCode;

export interface RegionConfig {
  code: RegionCode;
  name: string;
  currency: 'CAD' | 'USD' | 'GBP';
  symbol: string;
  flag: string;
  taxRate: number;
  taxName: string;
  phonePrefix: string;
  hubAddress: string;
}

export const REGIONS: Record<RegionCode, RegionConfig> = {
  CA: {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    symbol: 'CA$',
    flag: '🇨🇦',
    taxRate: 0.13,
    taxName: 'HST (13%)',
    phonePrefix: '+1',
    hubAddress: '857 Winterton Way, Mississauga, ON L5V 1Z5',
  },
  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    symbol: '$',
    flag: '🇺🇸',
    taxRate: 0.08,
    taxName: 'State Tax (8%)',
    phonePrefix: '+1',
    hubAddress: '11815 Medway Church Loop, Manassas, VA 20109',
  },
  UK: {
    code: 'UK',
    name: 'United Kingdom',
    currency: 'GBP',
    symbol: '£',
    flag: '🇬🇧',
    taxRate: 0.20,
    taxName: 'VAT (20%)',
    phonePrefix: '+44',
    hubAddress: 'London Regional Operations Center, UK',
  },
};

export const COUNTRY_REGIONS = REGIONS;
