const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['welcome', 'like', 'comment', 'connection_request', 'connection_accepted', 'event', 'system'],
      default: 'system',
    },
    content: { type: String, required: true, maxlength: 500 },
    read: { type: Boolean, default: false, index: true },
    refId: String,
    refType: String,
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
