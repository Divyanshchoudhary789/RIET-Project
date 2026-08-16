const { sendError } = require('../utils/response');

/**
 * Role-based authorization middleware.
 * Accepts one or more allowed roles. Must be used after authenticate.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required.');
    }
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 403, 'You do not have permission to perform this action.');
    }
    next();
  };
};

/**
 * Scope enforcement middleware.
 * Center Head can only access their own campus data.
 * Department Admin can only access their own department data.
 */
const enforceScope = (campusField = 'campusId', departmentField = 'departmentId') => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required.');
    }

    const { ROLES } = require('../config/constants');
    const { role, scopeRef } = req.user;

    if (role === ROLES.CENTER_HEAD) {
      const campusId = req.params[campusField] || req.body[campusField];
      if (campusId && scopeRef && campusId.toString() !== scopeRef.toString()) {
        return sendError(res, 403, 'You can only access data for your own campus.');
      }
    }

    if (role === ROLES.DEPARTMENT_ADMIN) {
      const departmentId = req.params[departmentField] || req.body[departmentField];
      if (departmentId && scopeRef && departmentId.toString() !== scopeRef.toString()) {
        return sendError(res, 403, 'You can only access data for your own department.');
      }
    }

    next();
  };
};

/**
 * Forces password change on first login.
 * Blocks all routes except /change-password until mustChangePassword is cleared.
 * Works correctly regardless of router mount path because req.path is router-relative.
 */
const requirePasswordChange = (req, res, next) => {
  if (req.user && req.user.mustChangePassword) {
    // req.path is relative to the router — for auth routes mounted at /api/auth,
    // the change-password route will have req.path === '/change-password'
    if (req.path !== '/change-password') {
      return sendError(
        res,
        403,
        'You must change your password before accessing the platform.',
        { mustChangePassword: true }
      );
    }
  }
  next();
};

module.exports = { authorize, enforceScope, requirePasswordChange };
