export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string; // E.164 formatted: e.g. +14165550192 or +447911123456
  national: string;   // Clean national digits: e.g. 4165550192
  error?: string;
}

export const validateAndNormalizePhone = (
  rawPhone: string,
  country: string = 'CA'
): PhoneValidationResult => {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { isValid: false, normalized: '', national: '', error: 'Phone number is required' };
  }

  const trimmed = rawPhone.trim();
  const digits = trimmed.replace(/\D/g, '');
  const normCountry = (country || 'CA').toUpperCase();

  if (normCountry === 'CA' || normCountry === 'US') {
    // North American Numbering Plan (NANP)
    let nationalDigits: string;

    if (digits.length === 10) {
      nationalDigits = digits;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      nationalDigits = digits.slice(1);
    } else {
      return {
        isValid: false,
        normalized: '',
        national: '',
        error: `Invalid phone length (${digits.length} digits). North American numbers must be 10 digits (or 11 with country code 1).`,
      };
    }

    const areaCodeFirst = nationalDigits[0];
    const exchangeFirst = nationalDigits[3];

    if (areaCodeFirst === '0' || areaCodeFirst === '1') {
      return {
        isValid: false,
        normalized: '',
        national: '',
        error: 'Invalid area code: Area code cannot start with 0 or 1.',
      };
    }

    if (exchangeFirst === '0' || exchangeFirst === '1') {
      return {
        isValid: false,
        normalized: '',
        national: '',
        error: 'Invalid exchange code: Exchange cannot start with 0 or 1.',
      };
    }

    if (/^(\d)\1{9}$/.test(nationalDigits)) {
      return {
        isValid: false,
        normalized: '',
        national: '',
        error: 'Invalid phone number: Number cannot be all identical digits.',
      };
    }

    return {
      isValid: true,
      normalized: `+1${nationalDigits}`,
      national: nationalDigits,
    };
  } else if (normCountry === 'UK' || normCountry === 'GB') {
    let nationalDigits: string;

    if (digits.length === 11 && digits.startsWith('0')) {
      nationalDigits = digits.slice(1);
    } else if (digits.length === 12 && digits.startsWith('44')) {
      nationalDigits = digits.slice(2);
    } else if (digits.length === 10 || digits.length === 11) {
      nationalDigits = digits;
    } else {
      return {
        isValid: false,
        normalized: '',
        national: '',
        error: `Invalid UK phone number length (${digits.length} digits). Must be 10 or 11 digits.`,
      };
    }

    return {
      isValid: true,
      normalized: `+44${nationalDigits}`,
      national: nationalDigits,
    };
  }

  if (digits.length >= 7 && digits.length <= 15) {
    const normalized = trimmed.startsWith('+') ? `+${digits}` : `+1${digits}`;
    return { isValid: true, normalized, national: digits.slice(-10) };
  }

  return {
    isValid: false,
    normalized: '',
    national: '',
    error: 'Invalid phone number format.',
  };
};

export const normalizePhoneNumber = (rawPhone: string, country: string = 'CA'): string => {
  const result = validateAndNormalizePhone(rawPhone, country);
  return result.isValid ? result.normalized : rawPhone.trim();
};

export const isValidPhoneStrict = (rawPhone: string, country: string = 'CA'): boolean => {
  return validateAndNormalizePhone(rawPhone, country).isValid;
};

export const isValidPhone = (phone: string): boolean => {
  return isValidPhoneStrict(phone);
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
