const express = require('express');
const Connection = require('../models/Connection');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');
const Logger = require('../utils/logger');

const router = express.Router();

// GET /api/connections — my connections
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    const conns = await Connection.find({
      $or: [{ requesterId: userId }, { recipientId: userId }],
      status: 'connected',
    }).lean();

    const enriched = await Promise.all(
      conns.map(async (c) => {
        const otherId = c.requesterId.toString() === userId.toString() ? c.recipientId : c.requesterId;
        const other = await User.findById(otherId).select('firstName lastName username photoURL headline').lean();
        return {
          id: c._id,
          status: c.status,
          createdAt: c.createdAt,
          user: other || { firstName: 'Unknown', lastName: '' },
        };
      })
    );

    return res.json({ success: true, data: { connections: enriched } });
  } catch (err) {
    Logger.error('Fetch connections error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch connections' } });
  }
});

// GET /api/connections/recommendations — people you may know
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get IDs already connected or requested
    const existing = await Connection.find({
      $or: [{ requesterId: userId }, { recipientId: userId }],
    }).lean();

    const excludeIds = new Set([userId.toString()]);
    existing.forEach(c => {
      excludeIds.add(c.requesterId.toString());
      excludeIds.add(c.recipientId.toString());
    });

    const recommendations = await User.find({
      _id: { $nin: [...excludeIds] },
      isActive: true,
      isDeleted: false,
    })
      .select('firstName lastName username photoURL headline bio')
      .limit(10)
      .lean();

    return res.json({ success: true, data: { recommendations } });
  } catch (err) {
    Logger.error('Fetch recommendations error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch recommendations' } });
  }
});

// GET /api/connections/pending — incoming requests
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const pending = await Connection.find({ recipientId: userId, status: 'pending' }).lean();

    const enriched = await Promise.all(
      pending.map(async (c) => {
        const requester = await User.findById(c.requesterId).select('firstName lastName username photoURL headline').lean();
        return { id: c._id, status: c.status, createdAt: c.createdAt, user: requester };
      })
    );

    return res.json({ success: true, data: { pending: enriched } });
  } catch (err) {
    Logger.error('Fetch pending connections error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch pending connections' } });
  }
});

// POST /api/connections — send request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const requesterId = req.user._id;
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELD', message: 'recipientId is required' } });
    }
    if (requesterId.toString() === recipientId) {
      return res.status(400).json({ success: false, error: { code: 'SELF_CONNECT', message: 'Cannot connect with yourself' } });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const existing = await Connection.findOne({
      $or: [
        { requesterId, recipientId },
        { requesterId: recipientId, recipientId: requesterId },
      ],
    });

    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'Connection already exists', status: existing.status } });
    }

    const conn = await Connection.create({ requesterId, recipientId, status: 'pending' });

    await Notification.create({
      userId: recipientId,
      type: 'connection_request',
      content: `${req.user.firstName || req.user.username} sent you a connection request`,
      refId: conn._id.toString(),
      refType: 'Connection',
    });

    return res.status(201).json({ success: true, data: { connection: conn } });
  } catch (err) {
    Logger.error('Create connection error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to send connection request' } });
  }
});

// PATCH /api/connections/:id — accept or reject
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { action } = req.body; // 'accept' | 'reject'
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ACTION', message: 'action must be accept or reject' } });
    }

    const conn = await Connection.findById(req.params.id);
    if (!conn) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Connection not found' } });
    }
    if (conn.recipientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your connection request' } });
    }

    conn.status = action === 'accept' ? 'connected' : 'rejected';
    await conn.save();

    if (action === 'accept') {
      await Notification.create({
        userId: conn.requesterId,
        type: 'connection_accepted',
        content: `${req.user.firstName || req.user.username} accepted your connection request`,
        refId: conn._id.toString(),
        refType: 'Connection',
      });
    }

    return res.json({ success: true, data: { connection: conn } });
  } catch (err) {
    Logger.error('Update connection error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update connection' } });
  }
});

// DELETE /api/connections/:id — remove
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const conn = await Connection.findOne({
      _id: req.params.id,
      $or: [{ requesterId: userId }, { recipientId: userId }],
    });

    if (!conn) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Connection not found' } });
    }

    await conn.deleteOne();
    return res.json({ success: true, message: 'Connection removed' });
  } catch (err) {
    Logger.error('Delete connection error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to remove connection' } });
  }
});

module.exports = router;
