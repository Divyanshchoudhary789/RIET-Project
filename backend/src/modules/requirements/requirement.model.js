const mongoose = require('mongoose');
const timelineEntrySchema = require('../shared/timelineEntry.schema');
const { DOCUMENT_STATUS, PRIORITY_LEVELS } = require('../../config/constants');

const requirementItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const requirementSchema = new mongoose.Schema(
  {
    campusRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      required: [true, 'Campus reference is required'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [requirementItemSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'At least one item is required',
      },
    },
    priority: {
      type: String,
      enum: Object.values(PRIORITY_LEVELS),
      required: [true, 'Priority is required'],
    },
    justification: {
      type: String,
      required: [true, 'Justification is required'],
      trim: true,
      maxlength: [2000, 'Justification must not exceed 2000 characters'],
    },
    attachments: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(DOCUMENT_STATUS),
      default: DOCUMENT_STATUS.SUBMITTED,
    },
    timeline: {
      type: [timelineEntrySchema],
      default: [],
    },
    workProposalRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkProposal',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

requirementSchema.index({ campusRef: 1, status: 1 });
requirementSchema.index({ createdBy: 1 });
requirementSchema.index({ status: 1, createdAt: -1 });

// Human-readable reference derived from _id
requirementSchema.virtual('referenceNumber').get(function () {
  return `REQ-${this._id.toString().slice(-8).toUpperCase()}`;
});
requirementSchema.set('toJSON', { virtuals: true });
requirementSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Requirement', requirementSchema);
