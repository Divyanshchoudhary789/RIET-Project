const Joi = require('joi');

const objectIdPattern = /^[a-fA-F0-9]{24}$/;

const createMemoSchema = Joi.object({
  notesheetRef: Joi.string().pattern(objectIdPattern).required().messages({
    'any.required': 'Notesheet reference is required.',
  }),
  summary: Joi.string().trim().min(10).max(3000).required().messages({
    'string.min': 'Memo summary must be at least 10 characters.',
    'any.required': 'Memo summary is required.',
  }),
  recommendedVendor: Joi.string().trim().max(200).optional().allow(''),
});

/**
 * Resubmit schema — Director can optionally point to a new notesheet and update summary.
 * If notesheetRef is omitted, the service reuses the original notesheet.
 */
const resubmitMemoSchema = Joi.object({
  notesheetRef: Joi.string().pattern(objectIdPattern).optional().messages({
    'string.pattern.base': 'Invalid notesheet reference ID.',
  }),
  summary: Joi.string().trim().min(10).max(3000).optional().messages({
    'string.min': 'Memo summary must be at least 10 characters.',
  }),
  recommendedVendor: Joi.string().trim().max(200).optional().allow(''),
});

const approveRejectMemoSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required().messages({
    'any.only': 'Action must be either approve or reject.',
    'any.required': 'Action is required.',
  }),
  note: Joi.when('action', {
    is: 'reject',
    then: Joi.string().trim().min(5).max(1000).required().messages({
      'string.min': 'Rejection note must be at least 5 characters.',
      'any.required': 'A rejection note is mandatory when rejecting a memo.',
    }),
    otherwise: Joi.string().trim().max(1000).optional().allow(''),
  }),
});

module.exports = { createMemoSchema, resubmitMemoSchema, approveRejectMemoSchema };
