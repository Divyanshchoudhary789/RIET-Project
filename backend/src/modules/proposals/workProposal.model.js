const mongoose = require('mongoose');
const timelineEntrySchema = require('../shared/timelineEntry.schema');
const { DOCUMENT_STATUS } = require('../../config/constants');

/**
 * A snapshot line item. The Cluster Manager copies items out of the source
 * requirement(s) into the proposal and may edit them freely — the original
 * requirement is never mutated. Each line is assigned to exactly one department.
 */
const proposalItemSchema = new mongoose.Schema(
  {
    sourceRequirementRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Requirement',
      required: [true, 'Source requirement reference is required'],
    },
    sourceItemId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
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
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      default: 0,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    departmentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Each item must be assigned to a department'],
    },
  },
  { _id: true }
);

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
    // Denormalized distinct campuses of the source requirements — powers the
    // Department Admin "filter by campus" view without extra joins.
    campusRefs: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Campus' }],
      default: [],
    },
    items: {
      type: [proposalItemSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'At least one line item is required',
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
    // One assessment per assigned department (fan-out).
    assessmentRefs: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Assessment' }],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

workProposalSchema.index({ status: 1, createdAt: -1 });
workProposalSchema.index({ createdBy: 1 });
workProposalSchema.index({ departmentRefs: 1, status: 1 });
workProposalSchema.index({ campusRefs: 1 });

// Human-readable reference derived from _id
workProposalSchema.virtual('referenceNumber').get(function () {
  return `WP-${this._id.toString().slice(-8).toUpperCase()}`;
});
workProposalSchema.set('toJSON', { virtuals: true });
workProposalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WorkProposal', workProposalSchema);
