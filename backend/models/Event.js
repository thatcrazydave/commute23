const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200, trim: true },
    description: { type: String, required: true, maxlength: 5000 },
    date: { type: Date, required: true },
    location: { type: String, required: true, maxlength: 300 },
    category: {
      type: String,
      enum: ['conference', 'workshop', 'networking', 'social', 'tech', 'business', 'arts', 'other'],
      default: 'tech',
    },
    capacity: { type: Number, min: 1, default: 50 },
    price: { type: Number, min: 0, default: 0 },
    isVirtual: { type: Boolean, default: false },
    registrationLink: String,
    imageUrl: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    attendeesCount: { type: Number, default: 0 },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

eventSchema.index({ date: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ createdBy: 1 });

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);
