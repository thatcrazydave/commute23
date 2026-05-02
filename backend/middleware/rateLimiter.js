const rateLimit = require('express-rate-limit');
// ipKeyGenerator is the library's built-in helper that correctly normalises
// IPv6 addresses (e.g. ::ffff:127.0.0.1 → 127.0.0.1).  Using it satisfies
// the ERR_ERL_KEY_GEN_IPV6 validation introduced in express-rate-limit v7.
const { ipKeyGenerator } = require('express-rate-limit');
const Logger = require('../utils/logger');

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Key generator — prefers the first IP in X-Forwarded-For when the server
 * is behind a trusted reverse proxy (app.set('trust proxy', 1)), then falls
 * back to the built-in ipKeyGenerator which handles IPv4-mapped IPv6 correctly.
 */
const keyGenerator = (req) => {
  // When behind a proxy, prefer the first entry of X-Forwarded-For
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  // Delegate to the library helper for correct IPv6 normalisation
  return ipKeyGenerator(req);
};

/**
 * Generic 429 response handler — logs the event and returns a structured error.
 */
const onLimitReached = (req, res, options) => {
  Logger.warn('Rate limit reached', {
    ip: req.ip,
    path: req.path,
    method: req.method,
    env: process.env.NODE_ENV || 'development',
  });
  res.status(options.statusCode).json({
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: options.message?.error?.message || 'Too many requests, please try again later',
      retryAfter: Math.ceil(options.windowMs / 1000),
    },
  });
};

/**
 * Auth endpoints — strict in prod, permissive in dev.
 * Prod:  20 attempts / 15 min  per IP
 * Dev:  200 attempts / 15 min  per IP (enough for rapid test cycles)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 20,
  standardHeaders: true,   // Return RateLimit-* headers (draft-6)
  legacyHeaders: false,
  keyGenerator,
  handler: onLimitReached,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many auth requests, please try again later' },
  },
});

/**
 * General app routes — high ceiling in prod, very high in dev.
 * Prod:  300 requests / 15 min  per IP  (100 req/5min — plenty for real users)
 * Dev:  5000 requests / 15 min  per IP  (no accidental blocks during development)
 *
 * NOTE: The old limit of 1000/15min still caused 429s because the Dashboard
 * page fires 5+ API calls on every mount, and a hard refresh loop or React
 * StrictMode double-invoke can exhaust that budget quickly in development.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 5000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: onLimitReached,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
  },
});

/**
 * Password-reset — very strict in prod, relaxed in dev.
 * Prod:   5 requests / 60 min  per IP
 * Dev:   50 requests / 60 min  per IP
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 50 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: onLimitReached,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many password reset requests, try again in an hour' },
  },
});

module.exports = { authLimiter, generalLimiter, passwordResetLimiter };
