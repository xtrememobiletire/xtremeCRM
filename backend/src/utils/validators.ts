export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
};

export const isValidVIN = (vin: string): boolean => {
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;
  return vinRegex.test(vin);
};

export const isValidPostalCode = (code: string, country: string = 'CA'): boolean => {
  if (country === 'CA') {
    return /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(code);
  }
  if (country === 'US') {
    return /^\d{5}(-\d{4})?$/.test(code);
  }
  if (country === 'UK') {
    return /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(code);
  }
  return true;
};
