const Joi = require('joi');

const objectIdPattern = /^[a-fA-F0-9]{24}$/;

const assessmentItemSchema = Joi.object({
  sourceRequirementRef: Joi.string().pattern(objectIdPattern).optional().allow(null, ''),
  sourceItemId: Joi.string().pattern(objectIdPattern).optional().allow(null, ''),
  name: Joi.string().trim().min(1).max(200).required().messages({ 'any.required': 'Item name is required.' }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.min': 'Quantity must be at least 1.',
    'any.required': 'Quantity is required.',
  }),
  unit: Joi.string().trim().min(1).max(50).required().messages({ 'any.required': 'Unit is required.' }),
  price: Joi.number().min(0).required().messages({
    'number.min': 'Price cannot be negative.',
    'any.required': 'Price is required.',
  }),
  description: Joi.string().trim().max(500).optional().allow(''),
});

const createAssessmentSchema = Joi.object({
  workProposalRef: Joi.string().pattern(objectIdPattern).required().messages({
    'any.required': 'Work proposal reference is required.',
  }),
  feasibilityNotes: Joi.string().trim().min(10).max(3000).required().messages({
    'string.min': 'Feasibility notes must be at least 10 characters.',
    'any.required': 'Feasibility notes are required.',
  }),
  estimatedCost: Joi.number().min(0).required().messages({
    'number.min': 'Estimated cost cannot be negative.',
    'any.required': 'Estimated cost is required.',
  }),
  technicalRemarks: Joi.string().trim().max(2000).optional().allow(''),
  // Rejection is no longer a downstream outcome — only "approve".
  recommendedAction: Joi.string().trim().valid('approve').optional().default('approve'),
  note: Joi.string().trim().max(1000).optional().allow(''),
  items: Joi.array().items(assessmentItemSchema).min(1).optional(),
});

const resubmitAssessmentSchema = Joi.object({
  feasibilityNotes: Joi.string().trim().min(10).max(3000).optional().messages({
    'string.min': 'Feasibility notes must be at least 10 characters.',
  }),
  estimatedCost: Joi.number().min(0).optional().messages({
    'number.min': 'Estimated cost cannot be negative.',
  }),
  technicalRemarks: Joi.string().trim().max(2000).optional().allow(''),
  recommendedAction: Joi.string().trim().valid('approve').optional(),
  note: Joi.string().trim().max(1000).optional().allow(''),
  items: Joi.array().items(assessmentItemSchema).min(1).optional(),
});

module.exports = {
  createAssessmentSchema,
  resubmitAssessmentSchema,
};
