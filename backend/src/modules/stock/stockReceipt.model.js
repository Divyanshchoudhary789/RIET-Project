const mongoose = require('mongoose');

/**
 * Created when a Purchase Order is marked "goods received". Represents the
 * pending stock entry a Center Head must complete for one campus — the platform
 * no longer auto-increments stock. One StockReceipt per (PO, campus).
 */
const stockReceiptItemSchema = new mongoose.Schema(
  {
    sourceItemId: { type: mongoose.Schema.Types.ObjectId, default: null },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, trim: true, default: 'units' },
    price: { type: Number, min: 0, default: 0 },
    category: { type: String, trim: true, default: 'Received' },
  },
  { _id: true }
);

const stockReceiptSchema = new mongoose.Schema(
  {
    purchaseOrderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
    },
    campusRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      required: true,
    },
    departmentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    items: {
      type: [stockReceiptItemSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

stockReceiptSchema.index({ purchaseOrderRef: 1, campusRef: 1 }, { unique: true });
stockReceiptSchema.index({ campusRef: 1, status: 1 });

module.exports = mongoose.model('StockReceipt', stockReceiptSchema);
