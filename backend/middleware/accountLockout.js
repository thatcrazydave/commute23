const Logger = require('../utils/logger');

const LOCKOUT_CONFIG = {
  maxAttempts: 5,
  lockoutDurationMs: 15 * 60 * 1000,
  attemptWindowMs: 15 * 60 * 1000,
};

// In-memory stores. Swap to Redis for multi-instance deploys.
const attempts = new Map(); // key -> { count, expiresAt }
const blocks = new Map(); // key -> { unlockAt }

const getRealIP = (req) => {
  return (
    (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0].trim()) ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown'
  );
};

const lockoutKey = (ip, identifier) => `${ip}:${(identifier || '').toLowerCase()}`;

const isLocked = (ip, identifier) => {
  const key = lockoutKey(ip, identifier);
  const block = blocks.get(key);
  if (!block) return { locked: false };
  if (Date.now() < block.unlockAt) {
    return { locked: true, unlockAt: block.unlockAt, remainingMs: block.unlockAt - Date.now() };
  }
  blocks.delete(key);
  return { locked: false };
};

const incrementFailedAttempts = (ip, identifier) => {
  const key = lockoutKey(ip, identifier);
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.expiresAt) {
    attempts.set(key, { count: 1, expiresAt: now + LOCKOUT_CONFIG.attemptWindowMs });
    return 1;
  }
  entry.count += 1;
  return entry.count;
};

const clearFailedAttempts = (ip, identifier) => {
  const key = lockoutKey(ip, identifier);
  attempts.delete(key);
  blocks.delete(key);
};

const lockAccount = (ip, identifier, durationMs = LOCKOUT_CONFIG.lockoutDurationMs) => {
  const key = lockoutKey(ip, identifier);
  const unlockAt = Date.now() + durationMs;
  blocks.set(key, { unlockAt });
  Logger.warn('Account temporarily locked', { ip, identifier, durationMs });
  return unlockAt;
};

// Pre-login middleware
const checkAccountLockout = (req, res, next) => {
  const { emailOrUsername, username, email } = req.body || {};
  const identifier = emailOrUsername || username || email;

  if (!identifier) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_IDENTIFIER', message: 'Email or username is required' },
    });
  }

  const ip = getRealIP(req);
  const lock = isLocked(ip, identifier);

  if (lock.locked) {
    const remainingMinutes = Math.ceil(lock.remainingMs / 60000);
    return res.status(423).json({
      success: false,
      error: {
        code: 'ACCOUNT_LOCKED',
        message: `Too many failed attempts. Try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.`,
        unlockAt: new Date(lock.unlockAt).toISOString(),
        remainingMinutes,
      },
    });
  }

  req.loginIp = ip;
  req.loginIdentifier = identifier.toLowerCase();
  next();
};

const handleFailedLogin = (req, identifier) => {
  const ip = req.loginIp || getRealIP(req);
  const count = incrementFailedAttempts(ip, identifier);
  if (count >= LOCKOUT_CONFIG.maxAttempts) {
    lockAccount(ip, identifier);
  }
  return { attempts: count, remainingAttempts: Math.max(0, LOCKOUT_CONFIG.maxAttempts - count) };
};

const handleSuccessfulLogin = (req, identifier) => {
  const ip = req.loginIp || getRealIP(req);
  clearFailedAttempts(ip, identifier);
};

module.exports = {
  checkAccountLockout,
  handleFailedLogin,
  handleSuccessfulLogin,
  LOCKOUT_CONFIG,
};
