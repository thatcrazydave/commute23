const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const { authenticateToken, requireModerator } = require('../middleware/auth');
const Logger = require('../utils/logger');

const router = express.Router();

// GET /api/events — list upcoming events
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const createdBy = req.query.mine === 'true' ? req.user._id : undefined;

    const filter = { date: { $gte: new Date() } };
    if (category && category !== 'all') filter.category = category;
    if (createdBy) filter.createdBy = createdBy;

    const [events, total] = await Promise.all([
      Event.find(filter).sort({ date: 1 }).skip(skip).limit(limit).lean(),
      Event.countDocuments(filter),
    ]);

    const userId = req.user._id.toString();
    const enriched = events.map(e => ({
      ...e,
      isAttending: e.attendees?.some(id => id.toString() === userId) || false,
      isFavorite: e.favorites?.some(id => id.toString() === userId) || false,
    }));

    return res.json({ success: true, data: { events: enriched, total, page, limit, hasMore: skip + events.length < total } });
  } catch (err) {
    Logger.error('Fetch events error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch events' } });
  }
});

// GET /api/events/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } });
    }
    const userId = req.user._id.toString();
    return res.json({
      success: true,
      data: {
        event: {
          ...event,
          isAttending: event.attendees?.some(id => id.toString() === userId) || false,
          isFavorite: event.favorites?.some(id => id.toString() === userId) || false,
        },
      },
    });
  } catch (err) {
    Logger.error('Fetch event error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch event' } });
  }
});

// POST /api/events — create (moderator+)
router.post('/', authenticateToken, requireModerator, async (req, res) => {
  try {
    const { title, description, date, location, category, capacity, price, isVirtual, registrationLink, imageUrl } = req.body;

    if (!title?.trim() || !description?.trim() || !date || !location?.trim()) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'title, description, date, and location are required' } });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_DATE', message: 'Invalid date format' } });
    }

    const event = await Event.create({
      title: title.trim(),
      description: description.trim(),
      date: parsedDate,
      location: location.trim(),
      category: category || 'tech',
      capacity: parseInt(capacity) || 50,
      price: parseFloat(price) || 0,
      isVirtual: Boolean(isVirtual),
      registrationLink: registrationLink || '',
      imageUrl: imageUrl || '',
      createdBy: req.user._id,
    });

    Logger.info('Event created', { eventId: event._id, userId: req.user._id });
    return res.status(201).json({ success: true, data: { event } });
  } catch (err) {
    Logger.error('Create event error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create event' } });
  }
});

// DELETE /api/events/:id (creator or moderator+)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } });

    const canDelete = event.createdBy.toString() === req.user._id.toString()
      || ['moderator', 'admin', 'superadmin'].includes(req.user.role);

    if (!canDelete) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorised' } });

    await event.deleteOne();
    return res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    Logger.error('Delete event error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete event' } });
  }
});

// POST /api/events/:id/attend — toggle attendance
router.post('/:id/attend', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } });

    const userId = req.user._id;
    const idx = event.attendees.findIndex(id => id.toString() === userId.toString());
    let isAttending;

    if (idx > -1) {
      event.attendees.splice(idx, 1);
      event.attendeesCount = Math.max(0, event.attendeesCount - 1);
      isAttending = false;
    } else {
      if (event.capacity && event.attendeesCount >= event.capacity) {
        return res.status(400).json({ success: false, error: { code: 'AT_CAPACITY', message: 'Event is at full capacity' } });
      }
      event.attendees.push(userId);
      event.attendeesCount += 1;
      isAttending = true;
    }

    await event.save();
    return res.json({ success: true, data: { isAttending, attendeesCount: event.attendeesCount } });
  } catch (err) {
    Logger.error('Attend event error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update attendance' } });
  }
});

// POST /api/events/:id/favorite — toggle favorite
router.post('/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } });

    const userId = req.user._id;
    const idx = event.favorites.findIndex(id => id.toString() === userId.toString());
    let isFavorite;

    if (idx > -1) {
      event.favorites.splice(idx, 1);
      isFavorite = false;
    } else {
      event.favorites.push(userId);
      isFavorite = true;
    }

    await event.save();
    return res.json({ success: true, data: { isFavorite } });
  } catch (err) {
    Logger.error('Favorite event error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update favorite' } });
  }
});

module.exports = router;
