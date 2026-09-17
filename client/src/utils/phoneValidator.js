/**
 * Client Nepali Phone Validation and Normalization Utilities
 */

export const extractNepaliLocalDigits = (input) => {
  if (!input) return '';
  let str = String(input).trim();
  // Strip leading +977 or 977 with optional separator
  if (/^\+?\s*977[- ]?/.test(str) && (str.startsWith('+') || str.length > 10 || /^977[- ]/.test(str))) {
    str = str.replace(/^\+?\s*977[- ]?/, '');
  }
  return str.replace(/\D/g, '');
};

export const validateNepaliPhone = (phone, required = true) => {
  if (!phone || !String(phone).trim()) {
    if (!required) {
      return { isValid: true, error: null, normalized: '', localDigits: '' };
    }
    return {
      isValid: false,
      error: 'Contact phone number is required.',
      normalized: '',
      localDigits: '',
    };
  }

  const localDigits = extractNepaliLocalDigits(phone);

  // Mobile: 10 digits starting with 98, 97, or 96
  const isMobile = /^9[678]\d{8}$/.test(localDigits);

  // Landline: 8 digits (or 9 digits if leading 0 like 01xxxxxxx)
  const isLandline = /^(0[1-9]\d{7}|[1-9]\d{7})$/.test(localDigits);

  if (!isMobile && !isLandline) {
    let specificMsg = 'Must be a valid 10-digit Nepali mobile number (e.g. 98XXXXXXXX)';
    if (localDigits.length > 0 && !/^9[678]/.test(localDigits) && !/^(01|[1-9])/.test(localDigits)) {
      specificMsg = 'Nepali mobile numbers must start with 98, 97, or 96.';
    } else if (localDigits.length > 0 && localDigits.length < 10 && /^9/.test(localDigits)) {
      specificMsg = `10 digits required (${localDigits.length}/10 entered)`;
    }

    return {
      isValid: false,
      error: specificMsg,
      normalized: `+977 ${localDigits}`,
      localDigits,
    };
  }

  return {
    isValid: true,
    error: null,
    normalized: `+977 ${localDigits}`,
    localDigits,
    type: isMobile ? 'MOBILE' : 'LANDLINE',
  };
};

export const formatNepaliPhone = (phone) => {
  const result = validateNepaliPhone(phone, false);
  return result.normalized || phone;
};
