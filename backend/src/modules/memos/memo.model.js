const mongoose = require('mongoose');
const timelineEntrySchema = require('../shared/timelineEntry.schema');
const { DOCUMENT_STATUS } = require('../../config/constants');

const memoSchema = new mongoose.Schema(
  {
    notesheetRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notesheet',
      required: [true, 'Notesheet reference is required'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    summary: {
      type: String,
      required: [true, 'Memo summary is required'],
      trim: true,
      maxlength: [3000, 'Summary must not exceed 3000 characters'],
    },
    recommendedVendor: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(DOCUMENT_STATUS),
      default: DOCUMENT_STATUS.SUBMITTED,
    },
    decisionNote: {
      type: String,
      trim: true,
      default: '',
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
    timeline: {
      type: [timelineEntrySchema],
      default: [],
    },
    purchaseOrderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      default: null,
    },
    revisionNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

memoSchema.index({ status: 1, createdAt: -1 });
memoSchema.index({ createdBy: 1 });

// Human-readable reference derived from _id
memoSchema.virtual('referenceNumber').get(function () {
  return `MEMO-${this._id.toString().slice(-8).toUpperCase()}`;
});
memoSchema.set('toJSON', { virtuals: true });
memoSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Memo', memoSchema);
