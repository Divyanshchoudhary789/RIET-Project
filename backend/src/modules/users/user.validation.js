const Joi = require('joi');
const { ROLES } = require('../../config/constants');

const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required().messages({
    'string.min': 'Name must be at least 2 characters.',
    'any.required': 'Name is required.',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address.',
    'any.required': 'Email is required.',
  }),
  role: Joi.string()
    .valid(...Object.values(ROLES))
    .required()
    .messages({
      'any.only': 'Invalid role specified.',
      'any.required': 'Role is required.',
    }),
  scopeRef: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Invalid scope reference ID.',
    }),
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().optional(),
  isActive: Joi.boolean().optional(),
});

module.exports = { createUserSchema, updateUserSchema };
