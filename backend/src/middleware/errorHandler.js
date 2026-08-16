const { sendError } = require('../utils/response');

/**
 * Centralized error handling middleware.
 * Must be registered last in the Express middleware chain.
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.originalUrl} — ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return sendError(res, 422, 'Validation failed.', errors);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    return sendError(res, 409, `A record with this ${field} already exists: ${value}`);
  }

  // Mongoose cast error (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return sendError(res, 400, `Invalid value for field: ${err.path}`);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'Invalid token.');
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 401, 'Token has expired.');
  }

  // Default
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode < 500 ? err.message : 'An unexpected server error occurred.';

  return sendError(res, statusCode, message);
};

/**
 * 404 handler for unmatched routes.
 */
const notFoundHandler = (req, res) => {
  return sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
};

module.exports = { errorHandler, notFoundHandler };
