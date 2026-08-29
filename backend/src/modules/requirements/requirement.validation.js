const Joi = require('joi');
const { PRIORITY_LEVELS } = require('../../config/constants');

const requirementItemSchema = Joi.object({
  name: Joi.string().trim().required().messages({ 'any.required': 'Item name is required.' }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.min': 'Quantity must be at least 1.',
    'any.required': 'Quantity is required.',
  }),
  unit: Joi.string().trim().required().messages({ 'any.required': 'Unit is required.' }),
  price: Joi.number().min(0).required().messages({
    'number.min': 'Price cannot be negative.',
    'any.required': 'Price is required.',
  }),
  description: Joi.string().trim().max(500).optional().allow(''),
});

const createRequirementSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required().messages({
    'string.min': 'Title must be at least 3 characters.',
    'any.required': 'Title is required.',
  }),
  items: Joi.array().items(requirementItemSchema).min(1).required().messages({
    'array.min': 'At least one item is required.',
    'any.required': 'Items are required.',
  }),
  priority: Joi.string()
    .valid(...Object.values(PRIORITY_LEVELS))
    .required()
    .messages({ 'any.required': 'Priority is required.' }),
  description: Joi.string().trim().min(10).max(2000).required().messages({
    'string.min': 'Description must be at least 10 characters.',
    'any.required': 'Description is required.',
  }),
});

module.exports = { createRequirementSchema };
