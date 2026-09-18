export function centsToDollars(cents: number): number {
  return Number(((cents || 0) / 100).toFixed(2));
}

export function dollarsToCents(dollars: number): number {
  return Math.round((dollars || 0) * 100);
}

export function formatCurrency(
  dollarsOrCents: number,
  symbol: string = '$'
): string {
  const val = typeof dollarsOrCents === 'number' ? dollarsOrCents : 0;
  return `${symbol}${val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
