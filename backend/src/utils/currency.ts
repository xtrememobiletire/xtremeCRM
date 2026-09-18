export const centsToDollars = (cents: number): number => {
  return Number((cents / 100).toFixed(2));
};

export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

export const formatCurrency = (
  cents: number,
  currency: 'CAD' | 'USD' | 'GBP' = 'CAD'
): string => {
  const symbols: Record<string, string> = {
    CAD: 'CA$',
    USD: '$',
    GBP: '£',
  };
  const amount = centsToDollars(cents);
  return ${symbols[currency] || '$'};
};
