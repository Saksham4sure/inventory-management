/**
 * Nepali Phone Validation and Normalization Utilities
 *
 * Supported formats:
 * - Mobile: 10 digits starting with 98, 97, or 96 (e.g. 9841234567, 9801234567, 9741234567)
 * - Landline: 8 digits (e.g. 014412345, 14412345)
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

export const validateNepaliPhone = (phone) => {
  if (!phone || !String(phone).trim()) {
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
    return {
      isValid: false,
      error:
        'Please provide a valid Nepali contact number (10-digit mobile starting with 98/97/96 or 8-digit landline).',
      normalized: '',
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
  const result = validateNepaliPhone(phone);
  return result.isValid ? result.normalized : phone;
};
