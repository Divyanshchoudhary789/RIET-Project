const mongoose = require('mongoose');
const { ROLES } = require('../../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: [true, 'Role is required'],
    },
    /**
     * scopeRef points to a Campus _id for center_head,
     * a Department _id for department_admin,
     * null for all org-wide roles (director, chairperson, etc.)
     */
    scopeRef: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'scopeModel',
      default: null,
    },
    /**
     * scopeModel is a discriminator for the refPath above.
     * Allowed values: 'Campus', 'Department', or null.
     * We do NOT put null in the enum array because Mongoose rejects it —
     * instead we use a custom validator.
     */
    scopeModel: {
      type: String,
      default: null,
      validate: {
        validator: (v) => v === null || v === 'Campus' || v === 'Department',
        message: 'scopeModel must be Campus, Department, or null.',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockedUntil: {
      type: Date,
      default: null,
      select: false,
    },
    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpiry: {
      type: Date,
      default: null,
      select: false,
    },
    refreshTokens: {
      type: [String],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ scopeRef: 1 });
// Note: email index is already created by the unique:true field option above.
// Do NOT add a duplicate userSchema.index({ email: 1 }) here.

userSchema.methods.isLocked = function () {
  if (!this.lockedUntil) return false;
  return this.lockedUntil > Date.now();
};

/**
 * Returns a plain object with all sensitive fields stripped.
 * Safe to send in API responses.
 */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokens;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpiry;
  delete obj.loginAttempts;
  delete obj.lockedUntil;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
