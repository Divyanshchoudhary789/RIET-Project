const mongoose = require('mongoose');
const timelineEntrySchema = require('../shared/timelineEntry.schema');
const { DOCUMENT_STATUS } = require('../../config/constants');

const workProposalSchema = new mongoose.Schema(
  {
    requirementRefs: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Requirement' }],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'At least one requirement reference is required',
      },
    },
    departmentRefs: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'At least one department must be assigned',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Proposal title is required'],
      trim: true,
      maxlength: [300, 'Title must not exceed 300 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
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
    assessmentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

workProposalSchema.index({ status: 1, createdAt: -1 });
workProposalSchema.index({ createdBy: 1 });
workProposalSchema.index({ departmentRefs: 1, status: 1 });

// Human-readable reference derived from _id
workProposalSchema.virtual('referenceNumber').get(function () {
  return `WP-${this._id.toString().slice(-8).toUpperCase()}`;
});
workProposalSchema.set('toJSON', { virtuals: true });
workProposalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WorkProposal', workProposalSchema);
