const Joi = require('joi');

const objectIdPattern = /^[a-fA-F0-9]{24}$/;

const quotationSchema = Joi.object({
  vendorName: Joi.string().trim().min(2).max(200).required().messages({
    'any.required': 'Vendor name is required.',
  }),
  amount: Joi.number().min(0).required().messages({
    'number.min': 'Amount cannot be negative.',
    'any.required': 'Quotation amount is required.',
  }),
  validity: Joi.date().iso().min('now').required().messages({
    'date.min': 'Quotation validity date cannot be in the past. Please enter today\'s date or a future date.',
    'date.base': 'Quotation validity must be a valid date.',
    'any.required': 'Quotation validity date is required.',
  }),
  itemBreakdown: Joi.string().trim().max(2000).optional().allow(''),
});

const createNotesheetSchema = Joi.object({
  assessmentRef: Joi.string().pattern(objectIdPattern).required().messages({
    'any.required': 'Assessment reference is required.',
  }),
  quotations: Joi.array().items(quotationSchema).min(2).max(3).required().messages({
    'array.min': 'A notesheet must contain at least 2 vendor quotations.',
    'array.max': 'A notesheet must not exceed 3 vendor quotations.',
    'any.required': 'Quotations are required.',
  }),
  remarks: Joi.string().trim().max(2000).optional().allow(''),
});

/**
 * Resubmit schema — assessmentRef is not required (it comes from the original notesheet).
 * Only quotations and remarks can be updated.
 */
const resubmitNotesheetSchema = Joi.object({
  quotations: Joi.array().items(quotationSchema).min(2).max(3).required().messages({
    'array.min': 'A notesheet must contain at least 2 vendor quotations.',
    'array.max': 'A notesheet must not exceed 3 vendor quotations.',
    'any.required': 'Quotations are required.',
  }),
  remarks: Joi.string().trim().max(2000).optional().allow(''),
});

module.exports = { createNotesheetSchema, resubmitNotesheetSchema };
