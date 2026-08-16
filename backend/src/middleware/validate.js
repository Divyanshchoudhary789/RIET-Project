const { sendError } = require('../utils/response');

/**
 * Generic Joi schema validation middleware.
 * Validates req.body against the provided schema.
 *
 * @param {import('joi').Schema} schema - A Joi schema object
 * @param {string} [source='body'] - Where to validate: 'body', 'query', or 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
      }));
      return sendError(res, 422, 'Validation failed.', errors);
    }

    req[source] = value;
    next();
  };
};

module.exports = { validate };
