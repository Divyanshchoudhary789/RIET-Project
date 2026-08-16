const jwt = require('jsonwebtoken');
const User = require('../modules/users/user.model');
const { sendError } = require('../utils/response');

/**
 * Verifies the JWT access token from the Authorization header.
 * Attaches the full user document to req.user.
 * Does NOT accept refresh tokens — only short-lived access tokens.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'Authentication required. No token provided.');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 401, 'Session expired. Please log in again.');
      }
      return sendError(res, 401, 'Invalid authentication token.');
    }

    const user = await User.findById(decoded.id).select(
      '-passwordHash -refreshTokens -passwordResetToken -passwordResetExpiry'
    );

    if (!user) {
      return sendError(res, 401, 'User account not found.');
    }

    if (!user.isActive) {
      return sendError(res, 403, 'Your account has been deactivated. Contact your administrator.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate };
