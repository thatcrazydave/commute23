const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Logger = require('../utils/logger');

// Standalone JWT extractor — does NOT call res.status() or res.json().
// Safe to use before endpoints that work for both authenticated and anonymous users.
// The naive pattern of wrapping authenticateToken in try/catch is broken because
// authenticateToken calls res.status(401).json() on failure, so the response is
// already sent before the catch block can call next(), causing a headers-already-sent crash.
module.exports = async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) return next();

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(); // invalid or expired token — proceed as anonymous
    }

    const user = await User.findById(decoded.id || decoded._id).select('-password -refreshToken');
    if (user && !user.isDeleted && user.isActive) {
      req.user = user;
    }
  } catch (err) {
    Logger.warn('optionalAuth unexpected error', { error: err.message });
  }
  next();
};
