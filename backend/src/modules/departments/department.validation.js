const Joi = require('joi');

const createDepartmentSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required().messages({
    'any.required': 'Department name is required.',
  }),
  code: Joi.string().min(2).max(20).uppercase().trim().required().messages({
    'any.required': 'Department code is required.',
  }),
  adminData: Joi.object({
    name: Joi.string().min(2).max(100).trim().required(),
    email: Joi.string().email().required(),
  })
    .optional()
    .allow(null),
});

const updateDepartmentSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().optional(),
  isActive: Joi.boolean().optional(),
  adminData: Joi.object({
    name: Joi.string().min(2).max(100).trim().required(),
    email: Joi.string().email().required(),
  })
    .optional()
    .allow(null),
});

module.exports = { createDepartmentSchema, updateDepartmentSchema };
