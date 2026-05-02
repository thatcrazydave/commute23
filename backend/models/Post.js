const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
    isPending: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ authorId: 1, createdAt: -1 });
// Feed query filter+sort — isDeleted+isPending must precede createdAt for index to cover the query
postSchema.index({ isDeleted: 1, isPending: 1, createdAt: -1 });

module.exports = mongoose.models.Post || mongoose.model('Post', postSchema);
