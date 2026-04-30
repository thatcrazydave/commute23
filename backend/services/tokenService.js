const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Logger = require('../utils/logger');

if (!process.env.JWT_SECRET) {
  Logger.error('FATAL: JWT_SECRET is not set');
  throw new Error('JWT_SECRET is required');
}
if (!process.env.JWT_REFRESH_SECRET) {
  Logger.error('FATAL: JWT_REFRESH_SECRET is not set');
  throw new Error('JWT_REFRESH_SECRET is required');
}
if (process.env.JWT_REFRESH_SECRET === process.env.JWT_SECRET) {
  Logger.error('FATAL: JWT_REFRESH_SECRET must differ from JWT_SECRET');
  throw new Error('JWT_REFRESH_SECRET must differ from JWT_SECRET');
}

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// In-memory revocation list. For multi-instance deploys, swap to Redis.
const revokedJtis = new Map();

const cleanupRevokedJtis = () => {
  const now = Date.now();
  for (const [jti, expiresAt] of revokedJtis.entries()) {
    if (expiresAt <= now) revokedJtis.delete(jti);
  }
};
setInterval(cleanupRevokedJtis, 5 * 60 * 1000).unref?.();

const TokenService = {
  generateAccessToken: (user, expiresIn = ACCESS_EXPIRES) => {
    const jti = crypto.randomBytes(16).toString('hex');
    return jwt.sign(
      {
        id: user._id || user.id,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion || 0,
        jti,
      },
      process.env.JWT_SECRET,
      { expiresIn, algorithm: 'HS256' }
    );
  },

  generateRefreshToken: (user, expiresIn = REFRESH_EXPIRES) => {
    const jti = crypto.randomBytes(16).toString('hex');
    return jwt.sign(
      {
        id: user._id || user.id,
        email: user.email,
        tokenVersion: user.tokenVersion || 0,
        type: 'refresh',
        jti,
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn, algorithm: 'HS256' }
    );
  },

  verifyAccessToken: (token) => {
    try {
      return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (err) {
      if (err.name === 'TokenExpiredError') throw new Error('Access token expired');
      throw new Error('Invalid access token');
    }
  },

  verifyRefreshToken: (token) => {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
    } catch (err) {
      if (err.name === 'TokenExpiredError') throw new Error('Refresh token expired');
      throw new Error('Invalid refresh token');
    }
  },

  revokeToken: (jti, ttlSeconds = 7 * 24 * 60 * 60) => {
    if (!jti) return false;
    revokedJtis.set(jti, Date.now() + ttlSeconds * 1000);
    return true;
  },

  isTokenRevoked: (jti) => {
    if (!jti) return false;
    const expiresAt = revokedJtis.get(jti);
    if (!expiresAt) return false;
    if (expiresAt <= Date.now()) {
      revokedJtis.delete(jti);
      return false;
    }
    return true;
  },
};

module.exports = TokenService;
