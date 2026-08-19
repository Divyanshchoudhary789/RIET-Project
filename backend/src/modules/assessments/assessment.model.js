const mongoose = require('mongoose');
const timelineEntrySchema = require('../shared/timelineEntry.schema');
const { DOCUMENT_STATUS } = require('../../config/constants');

const assessmentSchema = new mongoose.Schema(
  {
    workProposalRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkProposal',
      required: [true, 'Work proposal reference is required'],
    },
    departmentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    feasibilityNotes: {
      type: String,
      required: [true, 'Feasibility notes are required'],
      trim: true,
      maxlength: [3000, 'Feasibility notes must not exceed 3000 characters'],
    },
    estimatedCost: {
      type: Number,
      required: [true, 'Estimated cost is required'],
      min: [0, 'Estimated cost cannot be negative'],
    },
    technicalRemarks: {
      type: String,
      trim: true,
      default: '',
    },
    recommendedAction: {
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
    notesheetRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notesheet',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

assessmentSchema.index({ workProposalRef: 1 });
assessmentSchema.index({ departmentRef: 1, status: 1 });
assessmentSchema.index({ status: 1, createdAt: -1 });

// Human-readable reference derived from _id
assessmentSchema.virtual('referenceNumber').get(function () {
  return `ASS-${this._id.toString().slice(-8).toUpperCase()}`;
});
assessmentSchema.set('toJSON', { virtuals: true });
assessmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Assessment', assessmentSchema);
