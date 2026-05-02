const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

likeSchema.index({ postId: 1, userId: 1 }, { unique: true });
likeSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.Like || mongoose.model('Like', likeSchema);
