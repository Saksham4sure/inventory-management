/**
 * Production Input Validation and Sanitization Module
 *
 * Provides strict validation and security sanitization for critical user inputs:
 * - Full Name (First & Last name, length, Unicode letters, special character defense)
 * - Email (RFC 5321/5322 compliance, length, CRLF injection defense)
 * - Password (Production security complexity: length 8-128, upper, lower, digit, special symbol)
 * - Age & Date of Birth (Integer constraints, 16-120 age bounds, future date protection)
 * - HTML Escaping & XSS Sanitization
 */

// Escape HTML special characters to prevent template injection and XSS
export const escapeHtml = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Remove control characters, null bytes, and excess whitespace
 */
export const sanitizeString = (input, maxLength = 255) => {
  if (typeof input !== 'string') return '';
  // Strip null bytes and control chars (except standard newlines/tabs if applicable)
  const clean = input.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '').trim();
  return clean.slice(0, maxLength);
};

/**
 * Full Name Validation:
 * - Must be a string between 3 and 70 characters
 * - Must contain at least two parts (First Name and Last Name)
 * - Only letters (including Unicode alphabets), spaces, hyphens, periods, and apostrophes
 * - Protects against script tags, HTML tags, numbers, and SQL/NoSQL injection payloads
 */
export const validateName = (name) => {
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      error: 'Full name is required and must be text.',
      value: '',
    };
  }

  const sanitized = sanitizeString(name, 70);
  const words = sanitized.split(/\s+/).filter(Boolean);

  if (sanitized.length < 3) {
    return {
      isValid: false,
      error: 'Full name must be at least 3 characters long.',
      value: sanitized,
    };
  }

  if (sanitized.length > 70) {
    return {
      isValid: false,
      error: 'Full name must not exceed 70 characters.',
      value: sanitized,
    };
  }

  if (words.length < 2) {
    return {
      isValid: false,
      error: 'Please enter both your first and last name.',
      value: sanitized,
    };
  }

  for (const part of words) {
    if (part.length < 1) {
      return {
        isValid: false,
        error: 'Each name segment must be at least 1 character.',
        value: sanitized,
      };
    }
  }

  // Letters (Unicode supported), spaces, periods, apostrophes, hyphens
  const nameRegex = /^[\p{L}\s.'-]+$/u;
  if (!nameRegex.test(sanitized)) {
    return {
      isValid: false,
      error: 'Name may only contain letters, spaces, hyphens, apostrophes, and periods.',
      value: sanitized,
    };
  }

  // Disallow consecutive special characters like "--", "..", "''"
  if (/([.'-])\1/.test(sanitized)) {
    return {
      isValid: false,
      error: 'Name cannot contain consecutive punctuation characters.',
      value: sanitized,
    };
  }

  return {
    isValid: true,
    error: null,
    value: words.join(' '),
  };
};

/**
 * Email Address Validation:
 * - RFC 5321/5322 compliant syntax
 * - Length: 5 - 254 characters total; local part <= 64, domain <= 253
 * - Defense against CRLF injection (\r, \n) to prevent SMTP header injection
 * - Disallows consecutive dots and invalid TLDs
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email address is required.',
      value: '',
    };
  }

  // Detect and reject CRLF / newline injection attempts
  if (/[\r\n\t]/.test(email)) {
    return {
      isValid: false,
      error: 'Email address contains invalid control or newline characters.',
      value: '',
    };
  }

  const trimmed = email.toLowerCase().trim();

  if (trimmed.length < 5 || trimmed.length > 254) {
    return {
      isValid: false,
      error: 'Email address must be between 5 and 254 characters long.',
      value: trimmed,
    };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return {
      isValid: false,
      error: 'Please enter a valid email address with a single "@" sign.',
      value: trimmed,
    };
  }

  const [localPart, domainPart] = parts;

  if (!localPart || localPart.length > 64) {
    return {
      isValid: false,
      error: 'The email username part cannot be empty or exceed 64 characters.',
      value: trimmed,
    };
  }

  if (!domainPart || domainPart.length > 253) {
    return {
      isValid: false,
      error: 'The email domain part cannot exceed 253 characters.',
      value: trimmed,
    };
  }

  // Check for consecutive dots
  if (localPart.includes('..') || domainPart.includes('..')) {
    return {
      isValid: false,
      error: 'Email address cannot contain consecutive dots.',
      value: trimmed,
    };
  }

  // Local part cannot start or end with a dot
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return {
      isValid: false,
      error: 'Email address username cannot start or end with a dot.',
      value: trimmed,
    };
  }

  // Domain part must contain at least one dot and a valid TLD (at least 2 letters)
  const domainSegments = domainPart.split('.');
  if (domainSegments.length < 2) {
    return {
      isValid: false,
      error: 'Email domain must contain a valid top-level domain (e.g., .com, .org, .np).',
      value: trimmed,
    };
  }

  const tld = domainSegments[domainSegments.length - 1];
  if (!/^[a-zA-Z]{2,24}$/.test(tld)) {
    return {
      isValid: false,
      error: 'Email top-level domain must be valid letters (e.g. .com, .net, .np).',
      value: trimmed,
    };
  }

  // Strict RFC-compliant regex check
  const rfcEmailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!rfcEmailRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address format (e.g., user@example.com).',
      value: trimmed,
    };
  }

  return {
    isValid: true,
    error: null,
    value: trimmed,
  };
};

/**
 * Production Password Complexity Validation:
 * - Length: min 8, max 128 characters (guards against bcrypt 72-byte DoS attacks)
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one numeric digit (0-9)
 * - At least one special character (!@#$%^&*()_+-=[]{};':"|,.<>/?~` )
 * - Disallows leading or trailing spaces
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      error: 'Password is required and must be a string.',
      errors: ['Password is required.'],
    };
  }

  const errors = [];

  if (password.length < 8) {
    errors.push('Must be at least 8 characters long.');
  }

  if (password.length > 128) {
    errors.push('Must not exceed 128 characters.');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter (a-z).');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter (A-Z).');
  }

  if (!/\d/.test(password)) {
    errors.push('Must contain at least one number (0-9).');
  }

  // Special characters
  const specialCharRegex = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;
  if (!specialCharRegex.test(password)) {
    errors.push('Must contain at least one special character (e.g. !@#$%^&*).');
  }

  if (/^\s|\s$/.test(password)) {
    errors.push('Password must not begin or end with whitespace.');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      error: `Password requirements not met: ${errors.join(' ')}`,
      errors,
    };
  }

  return {
    isValid: true,
    error: null,
    errors: [],
  };
};

/**
 * Age Validation:
 * - Must be an integer between 16 and 120 (inclusive)
 * - Rejects decimals, non-numeric strings, negative numbers, or unrealistically high ages
 */
export const validateAge = (age) => {
  if (age === undefined || age === null || age === '') {
    return {
      isValid: false,
      error: 'Age is required.',
      value: null,
    };
  }

  const num = typeof age === 'number' ? age : Number(String(age).trim());

  if (!Number.isInteger(num)) {
    return {
      isValid: false,
      error: 'Age must be a whole number (integer).',
      value: null,
    };
  }

  if (num < 16) {
    return {
      isValid: false,
      error: 'You must be at least 16 years old to create an account.',
      value: num,
    };
  }

  if (num > 120) {
    return {
      isValid: false,
      error: 'Please enter a realistic age (maximum 120 years).',
      value: num,
    };
  }

  return {
    isValid: true,
    error: null,
    value: num,
  };
};

/**
 * Date of Birth Validation:
 * - Must be a valid date
 * - Cannot be in the future or today
 * - Calculated age must be between 16 and 120
 */
export const validateDob = (dob) => {
  if (!dob) {
    return {
      isValid: false,
      error: 'Date of birth is required.',
      value: null,
      age: null,
    };
  }

  const parsedDate = new Date(dob);
  if (isNaN(parsedDate.getTime())) {
    return {
      isValid: false,
      error: 'Please provide a valid date of birth (YYYY-MM-DD).',
      value: null,
      age: null,
    };
  }

  const today = new Date();
  if (parsedDate >= today) {
    return {
      isValid: false,
      error: 'Date of birth cannot be in the future or today.',
      value: null,
      age: null,
    };
  }

  let age = today.getFullYear() - parsedDate.getFullYear();
  const m = today.getMonth() - parsedDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < parsedDate.getDate())) {
    age--;
  }

  if (age < 16) {
    return {
      isValid: false,
      error: 'You must be at least 16 years old to create an account.',
      value: parsedDate,
      age,
    };
  }

  if (age > 120) {
    return {
      isValid: false,
      error: 'Date of birth indicates an age over 120 years. Please provide a valid date.',
      value: parsedDate,
      age,
    };
  }

  return {
    isValid: true,
    error: null,
    value: parsedDate,
    age,
  };
};

/**
 * Unified Age and/or Date of Birth Validator:
 * - Handles either `age` or `dob` or both
 * - If both are supplied, verifies consistency
 * - Computes missing parameter from the other
 */
export const validateAgeOrDob = ({ age, dob, required = false } = {}) => {
  const hasAge = age !== undefined && age !== null && age !== '';
  const hasDob = Boolean(dob);

  if (!hasAge && !hasDob) {
    if (required) {
      return {
        isValid: false,
        error: 'Age or Date of Birth is required.',
        age: null,
        dob: null,
      };
    }
    return {
      isValid: true,
      error: null,
      age: null,
      dob: null,
    };
  }

  if (hasDob) {
    const dobResult = validateDob(dob);
    if (!dobResult.isValid) {
      return {
        isValid: false,
        error: dobResult.error,
        age: null,
        dob: null,
      };
    }

    if (hasAge) {
      const ageResult = validateAge(age);
      if (!ageResult.isValid) {
        return {
          isValid: false,
          error: ageResult.error,
          age: null,
          dob: null,
        };
      }

      // Check consistency (allow 1 year difference due to birthday timing)
      if (Math.abs(dobResult.age - ageResult.value) > 1) {
        return {
          isValid: false,
          error: `Provided age (${ageResult.value}) does not match the date of birth (indicates ${dobResult.age} years old).`,
          age: null,
          dob: null,
        };
      }

      return {
        isValid: true,
        error: null,
        age: ageResult.value,
        dob: dobResult.value,
      };
    }

    return {
      isValid: true,
      error: null,
      age: dobResult.age,
      dob: dobResult.value,
    };
  }

  // Only age provided
  const ageResult = validateAge(age);
  if (!ageResult.isValid) {
    return {
      isValid: false,
      error: ageResult.error,
      age: null,
      dob: null,
    };
  }

  // Synthesize an approximate DOB (Jan 1 of birth year)
  const currentYear = new Date().getFullYear();
  const calculatedBirthYear = currentYear - ageResult.value;
  const calculatedDob = new Date(Date.UTC(calculatedBirthYear, 0, 1));

  return {
    isValid: true,
    error: null,
    age: ageResult.value,
    dob: calculatedDob,
  };
};
