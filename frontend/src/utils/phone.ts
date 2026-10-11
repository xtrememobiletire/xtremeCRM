export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string; // E.164 formatted: e.g. +14165550192 or +447911123456
  national: string;   // Clean national digits without country prefix: e.g. 4165550192
  error?: string;
}

export const cleanPhoneDigits = (value: string): string => {
  return (value || '').replace(/\D/g, '');
};

export const formatAsYouType = (value: string, country: string = 'CA'): string => {
  if (!value) return '';
  const digits = cleanPhoneDigits(value);
  const normCountry = (country || 'CA').toUpperCase();

  if (normCountry === 'CA' || normCountry === 'US') {
    // If user pastes/types 11 digits starting with 1, strip country code for national display
    let national = digits;
    if (national.length === 11 && national.startsWith('1')) {
      national = national.slice(1);
    }
    // Limit to 10 digits
    national = national.slice(0, 10);

    if (national.length === 0) return '';
    if (national.length <= 3) return `(${national}`;
    if (national.length <= 6) return `(${national.slice(0, 3)}) ${national.slice(3)}`;
    return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
  }

  if (normCountry === 'UK' || normCountry === 'GB') {
    let national = digits;
    if (national.length === 12 && national.startsWith('44')) {
      national = national.slice(2);
    }
    national = national.slice(0, 11);

    if (national.length <= 5) return national;
    return `${national.slice(0, 5)} ${national.slice(5)}`;
  }

  return digits.slice(0, 15);
};

export const validateAndNormalizePhone = (
  rawPhone: string,
  country: string = 'CA'
): PhoneValidationResult => {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { isValid: false, normalized: '', national: '', error: 'Phone number is required' };
  }

  const trimmed = rawPhone.trim();
  const digits = cleanPhoneDigits(trimmed);
  const normCountry = (country || 'CA').toUpperCase();

  if (normCountry === 'CA' || normCountry === 'US') {
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
        error: `Must be exactly 10 digits (currently ${digits.length}). Example: (416) 555-0199.`,
      };
    }

    const areaCodeFirst = nationalDigits[0];
    const exchangeFirst = nationalDigits[3];

    if (areaCodeFirst === '0' || areaCodeFirst === '1') {
      return {
        isValid: false,
        normalized: '',
        national: '',
        error: 'Invalid area code: Cannot start with 0 or 1.',
      };
    }

    if (exchangeFirst === '0' || exchangeFirst === '1') {
      return {
        isValid: false,
        normalized: '',
        national: '',
        error: 'Invalid exchange code: Central office cannot start with 0 or 1.',
      };
    }

    if (/^(\d)\1{9}$/.test(nationalDigits)) {
      return {
        isValid: false,
        normalized: '',
        national: '',
        error: 'Invalid phone number: Cannot be all identical digits.',
      };
    }

    return {
      isValid: true,
      normalized: `+1${nationalDigits}`,
      national: nationalDigits,
    };
  }

  if (normCountry === 'UK' || normCountry === 'GB') {
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
        error: `Must be 10 or 11 digits (currently ${digits.length}). Example: 7123 456789.`,
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

export const isValidPhone = (rawPhone: string, country: string = 'CA'): boolean => {
  return validateAndNormalizePhone(rawPhone, country).isValid;
};
