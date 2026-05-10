const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Logger = require('../utils/logger');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.firebaseUid;
      },
      select: false,
    },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['email', 'google', 'github'],
      default: 'email',
    },

    // Profile
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    fullname: { type: String, trim: true },
    photoURL: { type: String, default: '/images/default-avatar.png' },
    headline: { type: String, default: '' },
    bio: { type: String, default: '' },
    isProfileComplete: { type: Boolean, default: false },

    // RBAC — server-side enforced
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin', 'superadmin'],
      default: 'user',
      index: true,
    },

    // Token versioning — increment to invalidate ALL existing tokens for this user
    tokenVersion: { type: Number, default: 0 },

    // Account status
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,

    // Email verification
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    emailVerificationCode: String,
    emailVerificationCodeExpires: Date,

    // Password reset
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordResetCode: String,
    passwordResetCodeExpires: Date,

    // UI preferences (per-user, persisted server-side)
    videoQuality: {
      type: String,
      enum: ['auto', '1080p', '720p', '480p'],
      default: 'auto',
    },

    // Notification preferences (per-user, persisted server-side)
    notificationPreferences: {
      newConnection:       { type: Boolean, default: true },
      connectionRequest:   { type: Boolean, default: true },
      newComment:          { type: Boolean, default: true },
      newLike:             { type: Boolean, default: false },
      newPost:             { type: Boolean, default: true },
      eventReminder:       { type: Boolean, default: true },
      systemAnnouncements: { type: Boolean, default: true },
    },

    // Activity
    lastLogin: { type: Date, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Hash password on save (skip if already hashed)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  const bcryptHashPattern = /^\$2[aby]\$\d{2}\$/;
  if (bcryptHashPattern.test(this.password) && this.password.length === 60) {
    Logger.warn('Skipping double-hash on already-hashed password', { userId: this._id });
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Normalize email/username case
userSchema.pre('save', function (next) {
  if (this.username) this.username = this.username.toLowerCase().trim();
  if (this.email) this.email = this.email.toLowerCase().trim();
  if (this.firstName && this.lastName && !this.fullname) {
    this.fullname = `${this.firstName} ${this.lastName}`.trim();
  }
  this.updatedAt = new Date();
  next();
});

userSchema.methods.comparePassword = async function (entered) {
  if (!this.password) return false;
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationCode;
  delete obj.passwordResetToken;
  delete obj.passwordResetCode;
  return obj;
};

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    email: this.email,
    username: this.username,
    fullname: this.fullname,
    firstName: this.firstName,
    lastName: this.lastName,
    photoURL: this.photoURL,
    headline: this.headline,
    bio: this.bio,
    role: this.role,
    isProfileComplete: this.isProfileComplete,
    emailVerified: this.emailVerified,
    provider: this.provider,
    isActive: this.isActive,
    createdAt: this.createdAt,
    lastLogin: this.lastLogin,
    videoQuality: this.videoQuality || 'auto',
  };
};

userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ username: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
