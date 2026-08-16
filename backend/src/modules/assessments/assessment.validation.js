const Joi = require('joi');

const objectIdPattern = /^[a-fA-F0-9]{24}$/;

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
  recommendedAction: Joi.string().trim().max(1000).optional().allow(''),
});

/**
 * Resubmit schema — workProposalRef is not required (it doesn't change on resubmit).
 * Only the content fields can be updated.
 */
const resubmitAssessmentSchema = Joi.object({
  feasibilityNotes: Joi.string().trim().min(10).max(3000).optional().messages({
    'string.min': 'Feasibility notes must be at least 10 characters.',
  }),
  estimatedCost: Joi.number().min(0).optional().messages({
    'number.min': 'Estimated cost cannot be negative.',
  }),
  technicalRemarks: Joi.string().trim().max(2000).optional().allow(''),
  recommendedAction: Joi.string().trim().max(1000).optional().allow(''),
});

const rejectSchema = Joi.object({
  note: Joi.string().trim().min(5).max(1000).required().messages({
    'string.min': 'Rejection note must be at least 5 characters.',
    'any.required': 'A rejection note is mandatory.',
  }),
});

module.exports = { createAssessmentSchema, resubmitAssessmentSchema, rejectSchema };
