const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

// In development, skip all rate limiting so local testing is never blocked.
// In production, limits are enforced per IP.
const skipInDev = () => isDev;

// Strict limiter for auth endpoints
// Production: 20 attempts per IP per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
  },
});

// General limiter for app routes
// Production: 1000 requests per IP per 15 min (realistic for active users)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
  },
});

// Very strict for password reset
// Production: 5 requests per IP per hour
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many password reset requests, try again in an hour' },
  },
});

module.exports = { authLimiter, generalLimiter, passwordResetLimiter };
