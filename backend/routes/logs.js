const express = require('express');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const optionalAuth = require('../middleware/optionalAuth');
const Logger = require('../utils/logger');

const router = express.Router();

const logsRateLimit = rateLimit({
  windowMs: 60_000,
  max: process.env.NODE_ENV !== 'production' ? 500 : 30,
  keyGenerator: (req) => req.ip || ipKeyGenerator(req),
  handler: (req, res) =>
    res.status(429).json({ success: false, error: { code: 'RATE_LIMITED' } }),
});

// POST /api/logs/client — receives frontend errors and writes them to backend terminal.
// Uses optionalAuth so pre-login errors are captured too (userId will be 'anon').
router.post('/client', optionalAuth, logsRateLimit, (req, res) => {
  const level   = ['error', 'warn'].includes(req.body?.level) ? req.body.level : 'error';
  const message = String(req.body?.message || '').slice(0, 256).replace(/[\n\r]/g, ' ');
  const rawMeta = req.body?.meta;
  const meta    = (typeof rawMeta === 'object' && rawMeta !== null && !Array.isArray(rawMeta))
    ? rawMeta
    : {};
  const ts = String(req.body?.ts || '').slice(0, 30);

  const metaStr = JSON.stringify(meta);
  if (metaStr.length > 1024) {
    return res.status(400).json({ success: false, error: { code: 'META_TOO_LARGE' } });
  }

  const logFn = level === 'error' ? Logger.error.bind(Logger) : Logger.warn.bind(Logger);
  logFn(`[CLIENT] ${message}`, { ...meta, clientTs: ts, userId: req.user?._id || 'anon' });
  return res.json({ success: true });
});

module.exports = router;
