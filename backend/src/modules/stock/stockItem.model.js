const mongoose = require('mongoose');

const stockItemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [200, 'Item name must not exceed 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: [100, 'Category must not exceed 100 characters'],
    },
    unit: {
      type: String,
      required: [true, 'Unit of measure is required'],
      trim: true,
      maxlength: [50, 'Unit must not exceed 50 characters'],
    },
    quantityAvailable: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    quantityReserved: {
      type: Number,
      min: [0, 'Reserved quantity cannot be negative'],
      default: 0,
    },
    reorderThreshold: {
      type: Number,
      min: [0, 'Reorder threshold cannot be negative'],
      default: 0,
    },
    ownerType: {
      type: String,
      enum: ['campus', 'department', 'headOffice'],
      required: [true, 'Owner type is required'],
    },
    ownerRef: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'ownerModel',
      default: null,
    },
    ownerModel: {
      type: String,
      enum: ['Campus', 'Department'],
      default: null,
      // null is valid for headOffice stock which has no ownerRef
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

stockItemSchema.index({ ownerType: 1, ownerRef: 1 });
stockItemSchema.index({ itemName: 'text', category: 'text' });

module.exports = mongoose.model('StockItem', stockItemSchema);
