const mongoose = require('mongoose');
const timelineEntrySchema = require('../shared/timelineEntry.schema');
const { DOCUMENT_STATUS } = require('../../config/constants');

/**
 * The Department Admin's own editable snapshot of the line items assigned to
 * their department. Seeded from the work proposal snapshot; edits here never
 * touch the proposal or the original requirement.
 */
const assessmentItemSchema = new mongoose.Schema(
  {
    sourceRequirementRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement', default: null },
    sourceItemId: { type: mongoose.Schema.Types.ObjectId, default: null },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0, default: 0 },
    description: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

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
    items: {
      type: [assessmentItemSchema],
      default: [],
    },
    // True once the Department Admin has manually edited the item snapshot —
    // stops a later proposal edit from silently overwriting their work.
    itemsEdited: {
      type: Boolean,
      default: false,
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
// One assessment per (proposal, department) — guards the per-department fan-out
// against a double submit.
assessmentSchema.index({ workProposalRef: 1, departmentRef: 1 }, { unique: true });

// Human-readable reference derived from _id
assessmentSchema.virtual('referenceNumber').get(function () {
  return `ASS-${this._id.toString().slice(-8).toUpperCase()}`;
});
assessmentSchema.set('toJSON', { virtuals: true });
assessmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Assessment', assessmentSchema);
