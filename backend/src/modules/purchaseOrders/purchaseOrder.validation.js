const Joi = require('joi');

const objectIdPattern = /^[a-fA-F0-9]{24}$/;

const createPurchaseOrderSchema = Joi.object({
  memoRef: Joi.string().pattern(objectIdPattern).required().messages({
    'any.required': 'Memo reference is required.',
  }),
  vendorName: Joi.string().trim().min(2).max(200).required().messages({
    'any.required': 'Vendor name is required.',
  }),
  totalAmount: Joi.number().min(0).required().messages({
    'number.min': 'Total amount cannot be negative.',
    'any.required': 'Total amount is required.',
  }),
});

const goodsReceivedSchema = Joi.object({
  note: Joi.string().trim().max(1000).optional().allow(''),
});

module.exports = { createPurchaseOrderSchema, goodsReceivedSchema };
