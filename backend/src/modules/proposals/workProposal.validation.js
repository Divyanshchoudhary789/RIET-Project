const Joi = require('joi');

const objectIdPattern = /^[a-fA-F0-9]{24}$/;

const createWorkProposalSchema = Joi.object({
  requirementRefs: Joi.array()
    .items(Joi.string().pattern(objectIdPattern).required())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one requirement reference is required.',
      'any.required': 'Requirement references are required.',
    }),
  departmentRefs: Joi.array()
    .items(Joi.string().pattern(objectIdPattern).required())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one department must be assigned.',
      'any.required': 'Department references are required.',
    }),
  title: Joi.string().trim().min(5).max(300).required().messages({
    'string.min': 'Title must be at least 5 characters.',
    'any.required': 'Proposal title is required.',
  }),
  description: Joi.string().trim().max(2000).optional().allow(''),
});

/**
 * Resubmit schema — all fields optional because the Cluster Manager
 * may only want to update some fields (e.g. change department or update title).
 * The service fills in original values for any omitted fields.
 */
const resubmitWorkProposalSchema = Joi.object({
  requirementRefs: Joi.array()
    .items(Joi.string().pattern(objectIdPattern).required())
    .min(1)
    .optional()
    .messages({ 'array.min': 'At least one requirement reference is required.' }),
  departmentRefs: Joi.array()
    .items(Joi.string().pattern(objectIdPattern).required())
    .min(1)
    .optional()
    .messages({ 'array.min': 'At least one department must be assigned.' }),
  title: Joi.string().trim().min(5).max(300).optional(),
  description: Joi.string().trim().max(2000).optional().allow(''),
});

const rejectSchema = Joi.object({
  note: Joi.string().trim().min(5).max(1000).required().messages({
    'string.min': 'Rejection note must be at least 5 characters.',
    'any.required': 'A rejection note is mandatory.',
  }),
});

module.exports = { createWorkProposalSchema, resubmitWorkProposalSchema, rejectSchema };
