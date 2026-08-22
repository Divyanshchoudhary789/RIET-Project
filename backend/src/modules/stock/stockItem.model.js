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

// ownerModel must always agree with ownerType for the refPath populate on ownerRef to
// work — derive it automatically instead of relying on every write path to set it
// correctly by hand (a mismatch here silently breaks population, not an error).
const deriveOwnerModel = (ownerType) => {
  if (ownerType === 'campus') return 'Campus';
  if (ownerType === 'department') return 'Department';
  return null;
};

stockItemSchema.pre('save', function (next) {
  this.ownerModel = deriveOwnerModel(this.ownerType);
  next();
});

// Also cover atomic findOneAndUpdate/upsert writes (e.g. the goods-received stock
// increment), which bypass document middleware entirely.
stockItemSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() || {};
  const ownerType = update.ownerType || update.$set?.ownerType || this.getQuery()?.ownerType;
  if (ownerType) {
    update.$set = { ...(update.$set || {}), ownerModel: deriveOwnerModel(ownerType) };
    this.setUpdate(update);
  }
  next();
});

module.exports = mongoose.model('StockItem', stockItemSchema);
