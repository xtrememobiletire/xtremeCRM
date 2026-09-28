export type RegionCode = 'CA' | 'US' | 'UK';
export type CountryCode = RegionCode;

export interface RegionConfig {
  code: RegionCode;
  name: string;
  currency: 'CAD' | 'USD' | 'GBP';
  symbol: string;
  flag: string;
  /** Decimal tax rate — multiply by price to get tax amount. Single source of truth. */
  taxRate: number;
  /** Tax rate in basis points (taxRate * 10000), used for DB storage */
  taxRateBps: number;
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
    taxRateBps: 1300,
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
    taxRate: 0.13,
    taxRateBps: 1300,
    taxName: 'Tax (13%)',
    phonePrefix: '+1',
    hubAddress: '11815 Medway Church Loop, Manassas, VA 20109',
  },
  UK: {
    code: 'UK',
    name: 'United Kingdom',
    currency: 'GBP',
    symbol: '£',
    flag: '🇬🇧',
    taxRate: 0.16,
    taxRateBps: 1600,
    taxName: 'VAT (16%)',
    phonePrefix: '+44',
    hubAddress: 'London Regional Operations Center, UK',
  },
};

export const COUNTRY_REGIONS = REGIONS;

/** Convenience lookup: get tax rate for a region code */
export const getTaxRate = (code: RegionCode): number => REGIONS[code]?.taxRate ?? 0.13;
export const getTaxRateBps = (code: RegionCode): number => REGIONS[code]?.taxRateBps ?? 1300;
export const getTaxName = (code: RegionCode): string => REGIONS[code]?.taxName ?? 'Tax';
