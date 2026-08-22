const User = require('./user.model');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { ROLES } = require('../../config/constants');

/**
 * Returns users visible to the requesting user based on their role.
 * Director sees all except chairperson.
 * Chairperson sees all.
 */
const listUsers = async (requestingUser, query) => {
  const { page, limit, skip } = getPaginationParams(query);

  const filter = {};

  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

  // Search by name or email
  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }

  // Director sees everyone except other directors and chairperson
  if (requestingUser.role === ROLES.DIRECTOR) {
    const directorExclusions = [ROLES.CHAIRPERSON, ROLES.DIRECTOR];
    if (query.role && !directorExclusions.includes(query.role)) {
      filter.role = query.role;
    } else {
      filter.role = { $nin: directorExclusions };
    }
  } else if (query.role) {
    filter.role = query.role;
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -refreshTokens -passwordResetToken -passwordResetExpiry')
      .populate('scopeRef', 'name code')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return { users, meta: buildPaginationMeta(page, limit, total) };
};

// Roles a Director is not permitted to view/manage via these endpoints (hierarchy protection)
const DIRECTOR_BLOCKED_TARGETS = [ROLES.CHAIRPERSON, ROLES.DIRECTOR];

const assertManageable = (requestingUser, targetUser) => {
  if (
    requestingUser.role === ROLES.DIRECTOR &&
    DIRECTOR_BLOCKED_TARGETS.includes(targetUser.role) &&
    targetUser._id.toString() !== requestingUser._id.toString()
  ) {
    const error = new Error('You do not have permission to access this account.');
    error.statusCode = 403;
    throw error;
  }
};

const getUserById = async (userId, requestingUser) => {
  const user = await User.findById(userId)
    .select('-passwordHash -refreshTokens -passwordResetToken -passwordResetExpiry')
    .populate('scopeRef', 'name code')
    .populate('createdBy', 'name email role');

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  assertManageable(requestingUser, user);

  return user;
};

const updateUser = async (userId, updates, requestingUser) => {
  const target = await User.findById(userId).select('role');
  if (!target) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  assertManageable(requestingUser, target);

  const allowed = ['name', 'isActive'];
  const safeUpdates = {};
  allowed.forEach((key) => {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  });

  // Revoke all active sessions when an account is deactivated
  if (safeUpdates.isActive === false) {
    safeUpdates.refreshTokens = [];
  }

  const user = await User.findByIdAndUpdate(userId, safeUpdates, { new: true, runValidators: true })
    .select('-passwordHash -refreshTokens -passwordResetToken -passwordResetExpiry');

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

module.exports = { listUsers, getUserById, updateUser };
