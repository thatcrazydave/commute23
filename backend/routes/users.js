const express = require('express');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');
const Logger = require('../utils/logger');

const router = express.Router();

// GET /api/users/me — current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    return res.json({ success: true, data: { user: user.toSafeJSON() } });
  } catch (err) {
    Logger.error('Fetch profile error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch profile' } });
  }
});

// PATCH /api/users/me — update profile
router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const allowed = ['firstName', 'lastName', 'headline', 'bio', 'photoURL', 'isProfileComplete', 'videoQuality'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.firstName || updates.lastName) {
      const u = await User.findById(req.user._id).select('firstName lastName');
      updates.fullname = `${updates.firstName || u.firstName || ''} ${updates.lastName || u.lastName || ''}`.trim();
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).select('-password');
    return res.json({ success: true, data: { user: user.toSafeJSON() } });
  } catch (err) {
    Logger.error('Update profile error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update profile' } });
  }
});

// GET /api/users/:id — public profile
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('firstName lastName username photoURL headline bio createdAt')
      .lean();
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    return res.json({ success: true, data: { user } });
  } catch (err) {
    Logger.error('Fetch user error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch user' } });
  }
});

module.exports = router;
