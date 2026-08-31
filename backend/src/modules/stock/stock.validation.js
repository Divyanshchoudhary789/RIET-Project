const Joi = require('joi');

const objectIdPattern = /^[a-fA-F0-9]{24}$/;

const createStockItemSchema = Joi.object({
  itemName: Joi.string().trim().min(2).max(200).required().messages({
    'any.required': 'Item name is required.',
  }),
  category: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'Category is required.',
  }),
  unit: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'Unit of measure is required.',
  }),
  quantityAvailable: Joi.number().integer().min(0).required().messages({
    'number.min': 'Quantity cannot be negative.',
    'any.required': 'Quantity available is required.',
  }),
  quantityReserved: Joi.number().integer().min(0).default(0),
  reorderThreshold: Joi.number().integer().min(0).default(0),
  // Scoped roles (center_head / department_admin) don't send ownerType/ownerRef —
  // the service derives them from the caller's scope. Org-wide roles do send them,
  // and the service enforces that ownerRef is present for campus/department stock.
  ownerType: Joi.string().valid('campus', 'department', 'headOffice').optional(),
  ownerRef: Joi.string().pattern(objectIdPattern).optional().allow(null, ''),
  relatedDepartmentRef: Joi.string().pattern(objectIdPattern).optional().allow(null, ''),
});

const updateStockItemSchema = Joi.object({
  quantityAvailable: Joi.number().integer().min(0).optional(),
  quantityReserved: Joi.number().integer().min(0).optional(),
  reorderThreshold: Joi.number().integer().min(0).optional(),
  itemName: Joi.string().trim().min(2).max(200).optional(),
  category: Joi.string().trim().max(100).optional(),
  unit: Joi.string().trim().max(50).optional(),
  relatedDepartmentRef: Joi.string().pattern(objectIdPattern).optional().allow(null, ''),
});

const receiptEntrySchema = Joi.object({
  sourceItemId: Joi.string().pattern(objectIdPattern).optional().allow(null, ''),
  name: Joi.string().trim().min(1).max(200).required(),
  quantity: Joi.number().min(0).required(),
  unit: Joi.string().trim().max(50).optional().allow(''),
  price: Joi.number().min(0).optional(),
  category: Joi.string().trim().max(100).optional().allow(''),
});

const fulfilReceiptSchema = Joi.object({
  entries: Joi.array().items(receiptEntrySchema).min(1).optional(),
});

module.exports = { createStockItemSchema, updateStockItemSchema, fulfilReceiptSchema };
