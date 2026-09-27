import type { RegionCode } from './regions';

export const IT_ROYALTY_CENTS: Record<RegionCode, number> = {
  CA: 150, // CA$1.50 per completed dispatch
  US: 100, // $1.00 per completed dispatch
  UK: 100, // £1.00 per completed dispatch
};

export const DEFAULT_COGS_ESTIMATES = {
  tirePatchCents: 1500,
  newTireBaseCents: 8500,
  technicianPayoutBaseCents: 4500,
} as const;

export default {
  IT_ROYALTY_CENTS,
  DEFAULT_COGS_ESTIMATES,
};
