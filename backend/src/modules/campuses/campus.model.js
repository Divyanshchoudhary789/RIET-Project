const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Campus name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Campus name must not exceed 100 characters'],
    },
    code: {
      type: String,
      required: [true, 'Campus code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Campus code must not exceed 20 characters'],
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    centerHeadRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

campusSchema.index({ isActive: 1 });

module.exports = mongoose.model('Campus', campusSchema);
