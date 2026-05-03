const User = require('../models/User');
const TokenService = require('../services/tokenService');
const Logger = require('../utils/logger');

// Runs the same checks as authenticateToken (L1-L7) but NEVER calls res.status() or res.json().
// On any failure the request proceeds as anonymous (req.user unset).
//
// The naive pattern of wrapping authenticateToken in try/catch is broken:
// authenticateToken calls res.status(401).json() on failure, so the response is already
// sent before catch() can call next(), causing a headers-already-sent crash.
//
// This middleware is intentionally more permissive than authenticateToken for one reason:
// it is only used on endpoints that work for both authenticated and anonymous users.
// Do NOT use this on any endpoint that performs write operations or requires verified identity.
module.exports = async function optionalAuth(req, res, next) {
  try {
    // L1: Extract token
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) return next();

    // L2: Verify signature + expiry
    let decoded;
    try {
      decoded = TokenService.verifyAccessToken(token);
    } catch {
      return next(); // invalid or expired — proceed as anonymous
    }

    // L3: Revocation check (matches authenticateToken L3)
    if (TokenService.isTokenRevoked(decoded.jti)) {
      Logger.warn('optionalAuth: revoked token presented', { userId: decoded.id, ip: req.ip });
      return next();
    }

    // L4: Fetch fresh user
    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user) return next();

    // L5: Account status
    if (!user.isActive || user.isDeleted) return next();

    // L6: Token version (RBAC invalidation after password reset or role change)
    if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      Logger.warn('optionalAuth: token version mismatch', { userId: user._id, ip: req.ip });
      return next();
    }

    // L7: Role match (defense in depth)
    if (decoded.role !== user.role) {
      Logger.warn('optionalAuth: role mismatch', { userId: user._id, ip: req.ip });
      return next();
    }

    req.user = user;
  } catch (err) {
    Logger.warn('optionalAuth unexpected error', { error: err.message });
  }
  next();
};
