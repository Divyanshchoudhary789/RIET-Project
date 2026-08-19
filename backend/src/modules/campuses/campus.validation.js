const Joi = require('joi');

const createCampusSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required().messages({
    'any.required': 'Campus name is required.',
  }),
  code: Joi.string().min(2).max(20).uppercase().trim().required().messages({
    'any.required': 'Campus code is required.',
  }),
  location: Joi.string().max(200).trim().optional().allow('', null),
  centerHeadData: Joi.object({
    name: Joi.string().min(2).max(100).trim().required(),
    email: Joi.string().email().required(),
  })
    .optional()
    .allow(null),
});

const updateCampusSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().optional(),
  isActive: Joi.boolean().optional(),
});

module.exports = { createCampusSchema, updateCampusSchema };
