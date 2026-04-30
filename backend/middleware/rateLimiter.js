const rateLimit = require('express-rate-limit');

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
  },
});

// Generous limiter for everything else
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
  },
});

// Very strict for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5, // 5 password reset requests per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many password reset requests, try again in an hour' },
  },
});

module.exports = { authLimiter, generalLimiter, passwordResetLimiter };
