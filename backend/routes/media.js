const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const Media = require('../models/Media');
const Logger = require('../utils/logger');

const router = express.Router();

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

// GET /api/media/:mediaId — ownership-checked status endpoint.
// Used by the frontend to poll whether a queued upload has finished.
router.get('/:mediaId', authenticateToken, async (req, res) => {
  try {
    if (!isValidId(req.params.mediaId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID' } });
    }

    const media = await Media.findOne({
      _id: req.params.mediaId,
      uploadedBy: req.user._id,
    }).lean();

    if (!media) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    }

    Logger.info('Media status polled', { mediaId: media._id, status: media.status, userId: req.user._id });

    return res.json({
      success: true,
      data: {
        status: media.status,
        cdnUrl: media.cdnUrl || null,
        width: media.width,
        height: media.height,
        mediaType: media.mediaType,
      },
    });
  } catch (err) {
    Logger.error('Media status error', { error: err.message });
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR' } });
  }
});

module.exports = router;
