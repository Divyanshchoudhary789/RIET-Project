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

  if (query.role) filter.role = query.role;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

  // Director sees everyone except other directors and chairperson
  // The role query filter is allowed within that constraint but cannot override it.
  if (requestingUser.role === ROLES.DIRECTOR) {
    const directorExclusions = [ROLES.CHAIRPERSON, ROLES.DIRECTOR];
    if (query.role && !directorExclusions.includes(query.role)) {
      filter.role = query.role;
    } else if (!query.role) {
      filter.role = { $nin: directorExclusions };
    } else {
      // Attempted to query for a role Director is not allowed to see — return empty
      filter.role = { $nin: directorExclusions };
    }
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

const getUserById = async (userId) => {
  const user = await User.findById(userId)
    .select('-passwordHash -refreshTokens -passwordResetToken -passwordResetExpiry')
    .populate('scopeRef', 'name code')
    .populate('createdBy', 'name email role');

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

const updateUser = async (userId, updates) => {
  const allowed = ['name', 'isActive'];
  const safeUpdates = {};
  allowed.forEach((key) => {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  });

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
