const User = require('../models/User');
const TokenService = require('../services/tokenService');
const Logger = require('../utils/logger');

const errorResponse = (res, status, code, message, extra = {}) => {
  return res.status(status).json({
    success: false,
    error: { code, message, timestamp: new Date().toISOString(), ...extra },
  });
};

// Layer 1-7: full auth middleware
const authenticateToken = async (req, res, next) => {
  try {
    // L1: Extract token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return errorResponse(res, 401, 'NO_TOKEN', 'Access token required');
    }

    // L2: Verify signature + expiry
    let decoded;
    try {
      decoded = TokenService.verifyAccessToken(token);
    } catch (err) {
      const expired = err.message.toLowerCase().includes('expired');
      return errorResponse(
        res,
        401,
        'INVALID_TOKEN',
        expired ? 'Access token expired' : 'Invalid access token'
      );
    }

    // L3: Revocation check
    if (TokenService.isTokenRevoked(decoded.jti)) {
      Logger.warn('Revoked token used', { userId: decoded.id, jti: decoded.jti, ip: req.ip });
      return errorResponse(res, 401, 'TOKEN_REVOKED', 'Token has been revoked');
    }

    // L4: Fetch fresh user
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return errorResponse(res, 403, 'USER_NOT_FOUND', 'User account not found');
    }

    // L5: Account status
    if (!user.isActive) {
      return errorResponse(res, 403, 'USER_INACTIVE', 'User account is inactive');
    }
    if (user.isDeleted) {
      return errorResponse(res, 403, 'USER_DELETED', 'User account has been deleted');
    }

    // L6: Token version (RBAC invalidation)
    if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      Logger.warn('Token version mismatch', {
        userId: user._id,
        tokenVersion: decoded.tokenVersion,
        userTokenVersion: user.tokenVersion,
      });
      return errorResponse(
        res,
        401,
        'TOKEN_VERSION_MISMATCH',
        'Permissions changed, please log in again',
        { requiresReauth: true }
      );
    }

    // L7: Role match (defense in depth)
    if (decoded.role !== user.role) {
      Logger.error('Role mismatch between token and DB', {
        userId: user._id,
        tokenRole: decoded.role,
        dbRole: user.role,
      });
      return errorResponse(res, 401, 'ROLE_MISMATCH', 'Security check failed, please log in again', {
        requiresReauth: true,
      });
    }

    req.user = user;
    req.token = token;
    req.tokenDecoded = decoded;
    next();
  } catch (err) {
    Logger.error('Authentication middleware error', { error: err.message });
    return errorResponse(res, 500, 'AUTH_ERROR', 'Authentication failed');
  }
};

// Generic role guard
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }
    if (!allowedRoles.includes(req.user.role)) {
      Logger.warn('Insufficient role', {
        userId: req.user._id,
        role: req.user.role,
        required: allowedRoles,
        path: req.path,
      });
      return errorResponse(res, 403, 'INSUFFICIENT_PERMISSIONS', `Required role: ${allowedRoles.join(' or ')}`, {
        requiredRoles: allowedRoles,
        currentRole: req.user.role,
      });
    }
    next();
  };
};

const requireModerator = requireRole('moderator', 'admin', 'superadmin');
const requireAdmin = requireRole('admin', 'superadmin');
const requireSuperAdmin = requireRole('superadmin');

module.exports = {
  authenticateToken,
  requireRole,
  requireModerator,
  requireAdmin,
  requireSuperAdmin,
};
