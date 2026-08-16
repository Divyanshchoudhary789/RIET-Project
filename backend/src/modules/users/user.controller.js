const userService = require('./user.service');
const authService = require('../auth/auth.service');
const { sendSuccess } = require('../../utils/response');
const { ROLES } = require('../../config/constants');

const listUsers = async (req, res, next) => {
  try {
    const { users, meta } = await userService.listUsers(req.user, req.query);
    return sendSuccess(res, 200, 'Users retrieved.', users, meta);
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    return sendSuccess(res, 200, 'User retrieved.', user);
  } catch (err) {
    next(err);
  }
};

/**
 * Creates a new user account.
 * Chairperson can create Director accounts.
 * Director can create all other roles.
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, role, scopeRef } = req.body;
    const requestingRole = req.user.role;

    // Enforce creation permissions
    if (requestingRole === ROLES.CHAIRPERSON && role !== ROLES.DIRECTOR) {
      const error = new Error('Chairperson can only create Director accounts.');
      error.statusCode = 403;
      throw error;
    }

    if (requestingRole === ROLES.DIRECTOR && role === ROLES.CHAIRPERSON) {
      const error = new Error('Director cannot create Chairperson accounts.');
      error.statusCode = 403;
      throw error;
    }

    if (requestingRole === ROLES.DIRECTOR && role === ROLES.DIRECTOR) {
      const error = new Error('Director cannot create another Director account.');
      error.statusCode = 403;
      throw error;
    }

    let scopeModel = null;
    if (role === ROLES.CENTER_HEAD) scopeModel = 'Campus';
    if (role === ROLES.DEPARTMENT_ADMIN) scopeModel = 'Department';

    const user = await authService.provisionUserAccount({
      name,
      email,
      role,
      scopeRef: scopeRef || null,
      scopeModel,
      createdBy: req.user._id,
    });

    return sendSuccess(res, 201, 'User account created. Credentials have been sent to the provided email.', {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return sendSuccess(res, 200, 'User updated.', user);
  } catch (err) {
    next(err);
  }
};

module.exports = { listUsers, getUserById, createUser, updateUser };
