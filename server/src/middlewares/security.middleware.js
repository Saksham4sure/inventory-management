import { ApiError } from '../utils/apiError.js';
import { ENV } from '../config/env.js';

/**
 * Security Middleware: HTTP Security Headers
 * Enforces secure connections and protects against clickjacking, MIME sniffing, and XSS.
 */
export const securityHeaders = (req, res, next) => {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // XSS protection filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Strict-Transport-Security for HTTPS / Production environments
  if (ENV.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

/**
 * Cleanse objects recursively against MongoDB NoSQL operator injection ($gt, $ne, $where, etc.)
 */
const hasDangerousKeys = (obj) => {
  if (!obj || typeof obj !== 'object') return false;

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      return true;
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasDangerousKeys(obj[key])) return true;
    }
  }
  return false;
};

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    // Strip forbidden operator keys
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    if (typeof val === 'string') {
      // Strip null bytes
      clean[key] = val.replace(/\0/g, '');
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = sanitizeObject(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
};

/**
 * Middleware to sanitize inputs and block NoSQL injection attacks
 */
export const sanitizeInputs = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      if (hasDangerousKeys(req.body)) {
        return next(new ApiError(400, 'Invalid characters or operator detected in request payload'));
      }
      req.body = sanitizeObject(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      if (hasDangerousKeys(req.query)) {
        return next(new ApiError(400, 'Invalid characters or operator detected in query parameters'));
      }
      req.query = sanitizeObject(req.query);
    }

    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * In-memory sliding rate limiter for sensitive authentication & email routes
 * Mitigates brute-force credential stuffing and email flooding
 */
const rateLimitMap = new Map();

export const createRateLimiter = ({
  windowMs = 60 * 1000, // 1 minute
  maxRequests = 20,
  message = 'Too many requests from this IP. Please wait a minute and try again.',
} = {}) => {
  // Cleanup old entries periodically (every 5 minutes)
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req, res, next) => {
    // Determine client IP
    const clientIp =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown-ip';

    const key = `${req.baseUrl || ''}${req.path}:${clientIp}`;
    const now = Date.now();

    const record = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }

    rateLimitMap.set(key, record);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > maxRequests) {
      return next(new ApiError(429, message));
    }

    next();
  };
};

export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 25,
  message: 'Too many authentication attempts. Please wait 60 seconds before trying again.',
});

export const emailRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many email requests. Please wait a minute before requesting another verification email.',
});
