const mongoose = require('mongoose');
const timelineEntrySchema = require('../shared/timelineEntry.schema');

const purchaseOrderSchema = new mongoose.Schema(
  {
    memoRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Memo',
      required: [true, 'Memo reference is required'],
    },
    poNumber: {
      type: String,
      required: [true, 'PO number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vendorName: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    piAttachmentUrl: {
      type: String,
      default: null,
    },
    poAttachmentUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['issued', 'pi_uploaded', 'received', 'closed'],
      default: 'issued',
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    /**
     * Tracks which stock items were incremented on goods receipt.
     * Stored for audit purposes.
     */
    stockUpdateRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StockItem',
      default: null,
    },
    timeline: {
      type: [timelineEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

purchaseOrderSchema.index({ status: 1, createdAt: -1 });
purchaseOrderSchema.index({ memoRef: 1 });

// Human-readable reference derived from _id
purchaseOrderSchema.virtual('referenceNumber').get(function () {
  return this.poNumber || `PO-${this._id.toString().slice(-8).toUpperCase()}`;
});
purchaseOrderSchema.set('toJSON', { virtuals: true });
purchaseOrderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
