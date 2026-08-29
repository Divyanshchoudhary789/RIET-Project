const Joi = require('joi');

const objectIdPattern = /^[a-fA-F0-9]{24}$/;

const proposalItemSchema = Joi.object({
  sourceRequirementRef: Joi.string().pattern(objectIdPattern).required().messages({
    'any.required': 'Each item must reference its source requirement.',
  }),
  sourceItemId: Joi.string().pattern(objectIdPattern).optional().allow(null, ''),
  name: Joi.string().trim().min(1).max(200).required().messages({
    'any.required': 'Item name is required.',
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.min': 'Quantity must be at least 1.',
    'any.required': 'Quantity is required.',
  }),
  unit: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'Unit is required.',
  }),
  price: Joi.number().min(0).required().messages({
    'number.min': 'Price cannot be negative.',
    'any.required': 'Price is required.',
  }),
  description: Joi.string().trim().max(500).optional().allow(''),
  departmentRef: Joi.string().pattern(objectIdPattern).required().messages({
    'any.required': 'Each item must be assigned to a department.',
  }),
});

const createWorkProposalSchema = Joi.object({
  title: Joi.string().trim().min(5).max(300).required().messages({
    'string.min': 'Title must be at least 5 characters.',
    'any.required': 'Proposal title is required.',
  }),
  description: Joi.string().trim().max(2000).optional().allow(''),
  note: Joi.string().trim().max(1000).optional().allow(''),
  items: Joi.array().items(proposalItemSchema).min(1).required().messages({
    'array.min': 'At least one line item is required.',
    'any.required': 'Line items are required.',
  }),
});

/**
 * Update / resubmit — all fields optional; the service keeps existing values
 * for anything omitted.
 */
const updateWorkProposalSchema = Joi.object({
  title: Joi.string().trim().min(5).max(300).optional(),
  description: Joi.string().trim().max(2000).optional().allow(''),
  note: Joi.string().trim().max(1000).optional().allow(''),
  items: Joi.array().items(proposalItemSchema).min(1).optional().messages({
    'array.min': 'At least one line item is required.',
  }),
});

module.exports = {
  createWorkProposalSchema,
  updateWorkProposalSchema,
  // resubmit shares the same shape as update
  resubmitWorkProposalSchema: updateWorkProposalSchema,
};
