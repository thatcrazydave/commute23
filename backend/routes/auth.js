const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const TokenService = require('../services/tokenService');
const PasswordValidator = require('../services/passwordValidator');
const { getFirebaseAdmin } = require('../config/firebaseAdmin');
const { authenticateToken } = require('../middleware/auth');
const {
  checkAccountLockout,
  handleFailedLogin,
  handleSuccessfulLogin,
} = require('../middleware/accountLockout');
const {
  validateSignup,
  validateLogin,
  validateForgotPassword,
} = require('../middleware/inputValidator');
const Logger = require('../utils/logger');

const router = express.Router();

const tokenPair = (user) => {
  const accessToken = TokenService.generateAccessToken(user);
  const refreshToken = TokenService.generateRefreshToken(user);
  return { accessToken, refreshToken };
};

const userResponse = (user) => ({
  ...user.toSafeJSON(),
  isAdmin: user.role === 'admin' || user.role === 'superadmin',
  isSuperAdmin: user.role === 'superadmin',
  isModerator: ['moderator', 'admin', 'superadmin'].includes(user.role),
});

// ===== Signup =====
router.post('/signup', validateSignup, async (req, res) => {
  try {
    const { email, username, password, firstName, lastName } = req.body;

    const passwordCheck = PasswordValidator.validate(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password does not meet security requirements',
          details: passwordCheck.errors,
          strength: passwordCheck.strength,
          score: passwordCheck.score,
        },
      });
    }

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });

    if (existing) {
      Logger.warn('Signup with existing credentials', { email, ip: req.ip });
      return res.status(409).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'Account already registered' },
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const user = new User({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password,
      firstName,
      lastName,
      fullname: `${firstName} ${lastName}`.trim(),
      provider: 'email',
      role: 'user',
      emailVerified: false,
      emailVerificationToken: crypto.createHash('sha256').update(verificationToken).digest('hex'),
      emailVerificationCode: verificationCode,
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
      emailVerificationCodeExpires: Date.now() + 24 * 60 * 60 * 1000,
    });

    await user.save();
    Logger.info('New user registered', { userId: user._id, email: user.email });

    // TODO: hook up real email service. For MVP, surface verification code in dev.
    const devVerification = process.env.NODE_ENV !== 'production'
      ? { verificationToken, verificationCode }
      : undefined;

    const { accessToken, refreshToken } = tokenPair(user);

    return res.status(201).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: userResponse(user),
        expiresIn: 15 * 60,
        refreshExpiresIn: 7 * 24 * 60 * 60,
        tabIsolated: true,
        devVerification,
      },
      message: 'Signup successful',
    });
  } catch (err) {
    Logger.error('Signup error', { error: err.message, stack: err.stack });
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Server error during signup' },
    });
  }
});

// ===== Login =====
router.post('/login', validateLogin, checkAccountLockout, async (req, res) => {
  try {
    const identifier = req.loginIdentifier;
    const { password } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).select('+password');

    if (!user) {
      handleFailedLogin(req, identifier);
      Logger.warn('Login attempt for non-existent user', { identifier, ip: req.ip });
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
      });
    }

    if (!user.isActive) {
      Logger.warn('Login attempt on inactive account', { userId: user._id });
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_INACTIVE', message: 'Account is inactive, contact support' },
      });
    }

    if (!user.password) {
      // Account was created via OAuth — no password set
      handleFailedLogin(req, identifier);
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_PASSWORD',
          message: 'This account uses social sign-in. Use Google or GitHub to log in.',
        },
      });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      const result = handleFailedLogin(req, identifier);
      Logger.warn('Failed login', { userId: user._id, attempts: result.attempts });
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
      });
    }

    handleSuccessfulLogin(req, identifier);
    user.lastLogin = new Date();
    await user.save();

    const { accessToken, refreshToken } = tokenPair(user);
    Logger.info('Successful login', { userId: user._id, role: user.role });

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: userResponse(user),
        isAdmin: user.role === 'admin' || user.role === 'superadmin',
        isSuperAdmin: user.role === 'superadmin',
        expiresIn: 15 * 60,
        refreshExpiresIn: 7 * 24 * 60 * 60,
        tabIsolated: true,
      },
    });
  } catch (err) {
    Logger.error('Login error', { error: err.message, stack: err.stack });
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Login failed' },
    });
  }
});

// ===== Firebase OAuth Login (Google / GitHub) =====
router.post('/firebase-login', async (req, res) => {
  try {
    const { firebaseToken, idToken } = req.body;
    const token = firebaseToken || idToken;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Firebase ID token is required' },
      });
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return res.status(503).json({
        success: false,
        error: { code: 'OAUTH_NOT_CONFIGURED', message: 'OAuth not configured on the server' },
      });
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token, true);
    } catch (err) {
      Logger.warn('Firebase token verification failed', { error: err.message });
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired Firebase token' },
      });
    }

    const { uid: firebaseUid, email, name, picture, firebase: providerInfo } = decoded;
    if (!firebaseUid || !email) {
      return res.status(400).json({
        success: false,
        error: { code: 'INCOMPLETE_TOKEN', message: 'Token missing uid or email' },
      });
    }

    const providerId = providerInfo?.sign_in_provider;
    const provider = providerId === 'github.com' ? 'github' : providerId === 'google.com' ? 'google' : 'google';

    let user = await User.findOne({ firebaseUid });

    if (!user) {
      user = await User.findOne({ email: email.toLowerCase() });
      if (user && !user.firebaseUid) {
        user.firebaseUid = firebaseUid;
        user.provider = provider;
        if (!user.photoURL || user.photoURL === '/images/default-avatar.png') user.photoURL = picture;
        user.emailVerified = true;
        await user.save();
      }
    }

    if (!user) {
      const baseUsername = (email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const username = `${baseUsername}_${Date.now().toString(36)}`;
      const [first = name?.split(' ')[0] || baseUsername, ...rest] = (name || '').split(' ');

      user = new User({
        email: email.toLowerCase(),
        username,
        firstName: first || baseUsername,
        lastName: rest.join(' '),
        fullname: name || baseUsername,
        firebaseUid,
        provider,
        photoURL: picture || '/images/default-avatar.png',
        role: 'user',
        emailVerified: true,
      });
      await user.save();
      Logger.info('New OAuth user created', { userId: user._id, provider });
    }

    user.lastLogin = new Date();
    await user.save();

    const { accessToken, refreshToken } = tokenPair(user);

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: userResponse(user),
        isAdmin: user.role === 'admin' || user.role === 'superadmin',
        isSuperAdmin: user.role === 'superadmin',
        expiresIn: 15 * 60,
        refreshExpiresIn: 7 * 24 * 60 * 60,
        tabIsolated: true,
      },
    });
  } catch (err) {
    Logger.error('Firebase login error', { error: err.message, stack: err.stack });
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'OAuth login failed' },
    });
  }
});

// ===== Refresh =====
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_REFRESH_TOKEN', message: 'Refresh token is required' },
      });
    }

    let decoded;
    try {
      decoded = TokenService.verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_REFRESH', message: err.message },
      });
    }

    if (TokenService.isTokenRevoked(decoded.jti)) {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_REVOKED', message: 'Refresh token has been revoked' },
      });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive || user.isDeleted) {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found or inactive' },
      });
    }

    if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      TokenService.revokeToken(decoded.jti);
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_VERSION_MISMATCH',
          message: 'Permissions changed, please log in again',
          requiresReauth: true,
        },
      });
    }

    // Rotate refresh token
    TokenService.revokeToken(decoded.jti);
    const newAccessToken = TokenService.generateAccessToken(user);
    const newRefreshToken = TokenService.generateRefreshToken(user);

    return res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: userResponse(user),
        expiresIn: 15 * 60,
        refreshExpiresIn: 7 * 24 * 60 * 60,
      },
    });
  } catch (err) {
    Logger.error('Refresh error', { error: err.message });
    return res.status(401).json({
      success: false,
      error: { code: 'REFRESH_FAILED', message: 'Failed to refresh token' },
    });
  }
});

// ===== Verify (used by frontend on app boot) =====
router.get('/verify', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    data: {
      user: userResponse(req.user),
      isAdmin: req.user.role === 'admin' || req.user.role === 'superadmin',
      isSuperAdmin: req.user.role === 'superadmin',
    },
  });
});

// ===== Logout =====
router.post('/logout', async (req, res) => {
  try {
    // If access token is present, revoke it
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (accessToken) {
      try {
        const decoded = TokenService.verifyAccessToken(accessToken);
        if (decoded?.jti) TokenService.revokeToken(decoded.jti, 60 * 60); // 1h ttl is plenty
      } catch (_) {
        // ignore
      }
    }
    if (req.body?.refreshToken) {
      try {
        const decoded = TokenService.verifyRefreshToken(req.body.refreshToken);
        if (decoded?.jti) TokenService.revokeToken(decoded.jti);
      } catch (_) {
        // ignore
      }
    }
    return res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    Logger.error('Logout error', { error: err.message });
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Error during logout' },
    });
  }
});

// ===== Forgot Password =====
router.post('/forgot-password', validateForgotPassword, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always succeed (prevents enumeration)
    if (!user) {
      Logger.warn('Password reset for non-existent email', { email });
      return res.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetCode = resetCode;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    user.passwordResetCodeExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    // TODO: hook up real email service — send resetToken/resetCode via email
    // Dev: check server logs for token (Logger.info below), never return it in the response
    Logger.info('Password reset issued', { userId: user._id, devToken: process.env.NODE_ENV !== 'production' ? resetToken : '[redacted]' });

    return res.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (err) {
    Logger.error('Forgot password error', { error: err.message });
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Error processing reset request' },
    });
  }
});

// ===== Reset Password =====
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PASSWORD', message: 'New password is required' },
      });
    }

    const passwordCheck = PasswordValidator.validate(password);
    if (!passwordCheck.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password does not meet security requirements',
          details: passwordCheck.errors,
        },
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Reset token is invalid or expired' },
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // invalidate all sessions
    await user.save();

    Logger.info('Password reset successful', { userId: user._id });
    return res.json({ success: true, message: 'Password reset, please log in.' });
  } catch (err) {
    Logger.error('Reset password error', { error: err.message });
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Error resetting password' },
    });
  }
});

// ===== Email verification =====
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Verification token is invalid or expired' },
      });
    }
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationCode = undefined;
    user.emailVerificationCodeExpires = undefined;
    await user.save();
    return res.json({ success: true, message: 'Email verified' });
  } catch (err) {
    Logger.error('Verify email error', { error: err.message });
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Error verifying email' },
    });
  }
});

module.exports = router;
