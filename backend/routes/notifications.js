const express = require('express');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const Logger = require('../utils/logger');

const router = express.Router();

// GET /api/notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unread = notifications.filter(n => !n.read).length;
    return res.json({ success: true, data: { notifications, unread } });
  } catch (err) {
    Logger.error('Fetch notifications error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch notifications' } });
  }
});

// GET /api/notifications/preferences
const PREF_DEFAULTS = {
  newConnection: true, connectionRequest: true, newComment: true,
  newLike: false, newPost: true, eventReminder: true, systemAnnouncements: true,
};
const ALLOWED_PREF_KEYS = Object.keys(PREF_DEFAULTS);

router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    Logger.info('Fetch notification preferences', { userId: req.user._id });
    const user = await User.findById(req.user._id).select('notificationPreferences').lean();
    const preferences = { ...PREF_DEFAULTS, ...(user?.notificationPreferences || {}) };
    Logger.info('Notification preferences fetched', { userId: req.user._id, preferences });
    return res.json({ success: true, data: { preferences } });
  } catch (err) {
    Logger.error('Fetch notification preferences error', { userId: req.user._id, error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch preferences' } });
  }
});

// PATCH /api/notifications/preferences
router.patch('/preferences', authenticateToken, async (req, res) => {
  try {
    Logger.info('Update notification preferences', { userId: req.user._id, body: req.body });
    const update = {};
    for (const key of ALLOWED_PREF_KEYS) {
      if (typeof req.body[key] === 'boolean') {
        update[`notificationPreferences.${key}`] = req.body[key];
      }
    }
    Logger.info('Applying notification preference update', { userId: req.user._id, update });
    await User.updateOne({ _id: req.user._id }, { $set: update });
    Logger.info('Notification preferences saved', { userId: req.user._id });
    return res.json({ success: true });
  } catch (err) {
    Logger.error('Update notification preferences error', { userId: req.user._id, error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update preferences' } });
  }
});

// PATCH /api/notifications/read-all  (must be BEFORE /:id to avoid route collision)
router.patch('/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
    return res.json({ success: true });
  } catch (err) {
    Logger.error('Mark all notifications read error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to mark notifications' } });
  }
});

// DELETE /api/notifications  — clear all for user
router.delete('/', authenticateToken, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    return res.json({ success: true });
  } catch (err) {
    Logger.error('Delete all notifications error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete notifications' } });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, userId: req.user._id },
      { $set: { read: true } }
    );
    return res.json({ success: true });
  } catch (err) {
    Logger.error('Mark notification read error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to mark notification' } });
  }
});

// DELETE /api/notifications/:id  — delete a single notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await Notification.deleteOne({ _id: req.params.id, userId: req.user._id });
    return res.json({ success: true });
  } catch (err) {
    Logger.error('Delete notification error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete notification' } });
  }
});

module.exports = router;
