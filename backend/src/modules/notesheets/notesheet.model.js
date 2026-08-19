const mongoose = require('mongoose');
const timelineEntrySchema = require('../shared/timelineEntry.schema');
const { DOCUMENT_STATUS } = require('../../config/constants');

const quotationSchema = new mongoose.Schema(
  {
    vendorName: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true,
      maxlength: [200, 'Vendor name must not exceed 200 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Quotation amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    validity: {
      type: Date,
      required: [true, 'Quotation validity date is required'],
    },
    itemBreakdown: {
      type: String,
      trim: true,
      default: '',
    },
    attachmentUrl: {
      type: String,
      default: null,
    },
  },
  { _id: true }
);

const notesheetSchema = new mongoose.Schema(
  {
    assessmentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: [true, 'Assessment reference is required'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quotations: {
      type: [quotationSchema],
      validate: {
        validator: (arr) => arr.length >= 2 && arr.length <= 3,
        message: 'A notesheet must contain between 2 and 3 vendor quotations',
      },
    },
    remarks: {
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
    memoRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Memo',
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

notesheetSchema.index({ assessmentRef: 1 });
notesheetSchema.index({ status: 1, createdAt: -1 });

// Human-readable reference derived from _id
notesheetSchema.virtual('referenceNumber').get(function () {
  return `NS-${this._id.toString().slice(-8).toUpperCase()}`;
});
notesheetSchema.set('toJSON', { virtuals: true });
notesheetSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Notesheet', notesheetSchema);
