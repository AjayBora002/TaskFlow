const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// Brute-force protection for login / register endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Max 30 login/register requests per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Max 300 requests per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    message: 'Too many requests sent from this IP. Please slow down.',
  },
});

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: false, // Allowed for REST API
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// Mongo Query Sanitization middleware (prevents NoSQL injection)
const sanitizeNoSql = mongoSanitize({
  replaceWith: '_',
});

module.exports = {
  authLimiter,
  apiLimiter,
  securityHeaders,
  sanitizeNoSql,
};
