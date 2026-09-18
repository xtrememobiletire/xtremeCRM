export const pricingService = {
  calculateTaxes(subtotalCents: number, countryCode: string = 'CA') {
    const taxRates: Record<string, number> = {
      CA: 0.13,
      US: 0.08,
      UK: 0.20,
    };
    const rate = taxRates[countryCode] ?? 0.13;
    const taxCents = Math.round(subtotalCents * rate);
    const totalCents = subtotalCents + taxCents;
    return { subtotalCents, taxCents, totalCents, rate };
  },
};

export default pricingService;
