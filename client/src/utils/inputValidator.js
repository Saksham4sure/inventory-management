/**
 * Client Input Validation and Sanitization Module
 * Mirrors production backend validation rules for:
 * - Full Name
 * - Email Address
 * - Password Complexity
 * - Age and Date of Birth
 */

export const validateFullName = (name) => {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'Full name is required';
  }
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (trimmed.length < 3) {
    return 'Full name must be at least 3 characters long';
  }
  if (trimmed.length > 70) {
    return 'Full name must not exceed 70 characters';
  }
  if (parts.length < 2) {
    return 'Please enter your full name (both first and last name)';
  }

  // Letters (including Unicode alphabets), spaces, hyphens, periods, apostrophes
  const regex = /^[\p{L}\s.'-]+$/u;
  if (!regex.test(trimmed)) {
    return 'Name may only contain letters, spaces, hyphens, apostrophes, and periods';
  }

  if (/([.'-])\1/.test(trimmed)) {
    return 'Name cannot contain consecutive punctuation characters';
  }

  return '';
};

export const validateEmail = (email) => {
  if (!email || typeof email !== 'string' || !email.trim()) {
    return 'Email address is required';
  }

  if (/[\r\n\t]/.test(email)) {
    return 'Email contains invalid control characters';
  }

  const trimmed = email.toLowerCase().trim();

  if (trimmed.length < 5 || trimmed.length > 254) {
    return 'Email address must be between 5 and 254 characters long';
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return 'Please enter a valid email address with a single "@"';
  }

  const [localPart, domainPart] = parts;
  if (!localPart || localPart.length > 64) {
    return 'Email username cannot exceed 64 characters';
  }

  if (!domainPart || domainPart.length > 253) {
    return 'Email domain cannot exceed 253 characters';
  }

  if (localPart.includes('..') || domainPart.includes('..')) {
    return 'Email address cannot contain consecutive dots';
  }

  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return 'Email address username cannot start or end with a dot';
  }

  const domainSegments = domainPart.split('.');
  if (domainSegments.length < 2) {
    return 'Email domain must contain a valid extension (e.g. .com, .np)';
  }

  const tld = domainSegments[domainSegments.length - 1];
  if (!/^[a-zA-Z]{2,24}$/.test(tld)) {
    return 'Email extension must be valid letters (e.g. .com, .net, .np)';
  }

  const rfcEmailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!rfcEmailRegex.test(trimmed)) {
    return 'Please enter a valid email address (e.g. name@company.com)';
  }

  return '';
};

export const getPasswordCriteria = (pass) => {
  const str = String(pass || '');
  return {
    minLength: str.length >= 8 && str.length <= 128,
    hasLower: /[a-z]/.test(str),
    hasUpper: /[A-Z]/.test(str),
    hasNumber: /\d/.test(str),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(str),
    noWhitespaceEnds: !/^\s|\s$/.test(str),
  };
};

export const validatePassword = (pass) => {
  if (!pass) return 'Password is required';
  if (typeof pass !== 'string') return 'Password must be text';

  const criteria = getPasswordCriteria(pass);
  const errors = [];

  if (pass.length < 8) errors.push('at least 8 characters');
  if (pass.length > 128) errors.push('under 128 characters');
  if (!criteria.hasLower) errors.push('one lowercase letter');
  if (!criteria.hasUpper) errors.push('one uppercase letter');
  if (!criteria.hasNumber) errors.push('one number');
  if (!criteria.hasSpecial) errors.push('one special character');
  if (!criteria.noWhitespaceEnds) errors.push('no leading or trailing spaces');

  if (errors.length > 0) {
    return `Password must contain: ${errors.join(', ')}.`;
  }

  return '';
};

export const validateConfirmPassword = (pass, confirm) => {
  if (!confirm) return 'Please re-enter your password';
  if (pass !== confirm) return 'Passwords do not match';
  return '';
};

export const validateAge = (age) => {
  if (age === undefined || age === null || String(age).trim() === '') {
    return 'Age is required';
  }

  const num = Number(String(age).trim());
  if (!Number.isInteger(num)) {
    return 'Age must be a valid whole number (integer)';
  }

  if (num < 16) {
    return 'You must be at least 16 years old to create an account';
  }

  if (num > 120) {
    return 'Please enter a valid age (maximum 120 years)';
  }

  return '';
};

export const validateDob = (val) => {
  if (!val) return 'Date of birth is required';
  const birthDate = new Date(val);
  if (isNaN(birthDate.getTime())) {
    return 'Please enter a valid date of birth';
  }
  const today = new Date();
  if (birthDate >= today) {
    return 'Date of birth cannot be in the future or today';
  }
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 16) {
    return 'You must be at least 16 years old to create an account';
  }
  if (age > 120) {
    return 'Please enter a valid date of birth (maximum 120 years)';
  }
  return '';
};
