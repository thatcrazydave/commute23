const express = require('express');
const Notification = require('../models/Notification');
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

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
    return res.json({ success: true });
  } catch (err) {
    Logger.error('Mark all notifications read error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to mark notifications' } });
  }
});

module.exports = router;
