const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shortId: { type: String, unique: true, index: true },
    content: { type: String, maxlength: 5000, default: '' },
    mediaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }],
    mediaType: {
      type: String,
      enum: ['none', 'image', 'video', 'mixed'],
      default: 'none',
    },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public',
    },
    hideLikeCount: { type: Boolean, default: false },
    commentsDisabled: { type: Boolean, default: false },
    isPending: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'archived', 'recently_deleted', 'deleted'],
      default: 'active',
      index: true,
    },
    archivedAt: { type: Date, default: null },
    deletedAt:  { type: Date, default: null },
    cleanupJobId: { type: String, default: null },
    deletedBy: { type: String, enum: ['user', 'admin'], default: null },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ authorId: 1, createdAt: -1 });
// Feed query filter+sort — status+isPending must precede createdAt for index to cover the query
postSchema.index({ status: 1, isPending: 1, createdAt: -1 });
postSchema.index({ authorId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.Post || mongoose.model('Post', postSchema);
