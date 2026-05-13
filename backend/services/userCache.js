const { getClient, isReady } = require('../config/redis');
const Logger = require('../utils/logger');

// TTL chosen to balance security (role/ban changes propagate) vs DB load reduction.
// All writes that change security-relevant fields (role, isActive, tokenVersion) must
// call invalidate() so the stale entry is evicted immediately rather than waiting for TTL.
const USER_TTL_SECONDS = 60;
const STATS_TTL_SECONDS = 300;

const userKey = (userId) => `user_cache:${userId}`;
const statsKey = (userId) => `user_stats:${userId}`;

const UserCache = {
  // Retrieve a cached user object. Returns null on miss or when Redis is unavailable.
  async get(userId) {
    if (!isReady()) return null;
    try {
      const raw = await getClient().get(userKey(userId));
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      Logger.warn('UserCache.get failed', { userId, error: err.message });
      return null;
    }
  },

  // Store a user object. Strips password before writing regardless of what was passed in.
  async set(userId, userDoc) {
    if (!isReady()) return;
    try {
      const obj = typeof userDoc.toObject === 'function' ? userDoc.toObject() : { ...userDoc };
      delete obj.password;
      delete obj.emailVerificationToken;
      delete obj.emailVerificationCode;
      delete obj.passwordResetToken;
      delete obj.passwordResetCode;
      await getClient().setex(userKey(userId), USER_TTL_SECONDS, JSON.stringify(obj));
    } catch (err) {
      Logger.warn('UserCache.set failed', { userId, error: err.message });
    }
  },

  // Remove cached user — call this immediately after any write to the user document.
  async invalidate(userId) {
    if (!isReady()) return;
    try {
      await getClient().del(userKey(userId));
    } catch (err) {
      Logger.warn('UserCache.invalidate failed', { userId, error: err.message });
    }
  },

  // Retrieve cached stats (post count, connection count, etc.).
  async getStats(userId) {
    if (!isReady()) return null;
    try {
      const raw = await getClient().get(statsKey(userId));
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      Logger.warn('UserCache.getStats failed', { userId, error: err.message });
      return null;
    }
  },

  // Store stats for a user. Longer TTL than the user object since counts are not security-sensitive.
  async setStats(userId, stats) {
    if (!isReady()) return;
    try {
      await getClient().setex(statsKey(userId), STATS_TTL_SECONDS, JSON.stringify(stats));
    } catch (err) {
      Logger.warn('UserCache.setStats failed', { userId, error: err.message });
    }
  },

  // Remove cached stats — call after post creation/deletion or connection changes.
  async invalidateStats(userId) {
    if (!isReady()) return;
    try {
      await getClient().del(statsKey(userId));
    } catch (err) {
      Logger.warn('UserCache.invalidateStats failed', { userId, error: err.message });
    }
  },
};

module.exports = UserCache;
