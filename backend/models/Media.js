const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    storageKey: { type: String, required: true },
    cdnUrl: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    mimeType: { type: String, required: true },
    originalMimeType: { type: String },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    fileSize: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'claiming', 'ready', 'failed'], default: 'pending' },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

mediaSchema.index({ postId: 1, sortOrder: 1 });
mediaSchema.index({ uploadedBy: 1 });

module.exports = mongoose.models.Media || mongoose.model('Media', mediaSchema);
