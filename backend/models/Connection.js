const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema(
  {
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'connected', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

// Unique pair — prevent duplicate connection requests
connectionSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

module.exports = mongoose.models.Connection || mongoose.model('Connection', connectionSchema);
