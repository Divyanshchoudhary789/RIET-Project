const Campus = require('./campus.model');
const authService = require('../auth/auth.service');
const { ROLES } = require('../../config/constants');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

const listCampuses = async (query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = {};
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

  const [campuses, total] = await Promise.all([
    Campus.find(filter)
      .populate('centerHeadRef', 'name email isActive')
      .populate('createdBy', 'name email')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    Campus.countDocuments(filter),
  ]);

  return { campuses, meta: buildPaginationMeta(page, limit, total) };
};

const getCampusById = async (campusId) => {
  const campus = await Campus.findById(campusId)
    .populate('centerHeadRef', 'name email isActive lastLoginAt')
    .populate('createdBy', 'name email');

  if (!campus) {
    const error = new Error('Campus not found.');
    error.statusCode = 404;
    throw error;
  }

  return campus;
};

/**
 * Creates a new campus and optionally provisions a Center Head user for it.
 */
const createCampus = async ({ name, code, centerHeadData, createdBy }) => {
  const campus = await Campus.create({ name, code, createdBy });

  if (centerHeadData) {
    const centerHead = await authService.provisionUserAccount({
      name: centerHeadData.name,
      email: centerHeadData.email,
      role: ROLES.CENTER_HEAD,
      scopeRef: campus._id,
      scopeModel: 'Campus',
      createdBy,
    });

    campus.centerHeadRef = centerHead._id;
    await campus.save();
  }

  return Campus.findById(campus._id).populate('centerHeadRef', 'name email');
};

const updateCampus = async (campusId, updates) => {
  const allowedUpdates = {};
  if (updates.name !== undefined) allowedUpdates.name = updates.name;
  if (updates.isActive !== undefined) allowedUpdates.isActive = updates.isActive;

  if (Object.keys(allowedUpdates).length === 0) {
    const error = new Error('No valid fields provided for update.');
    error.statusCode = 400;
    throw error;
  }

  const campus = await Campus.findByIdAndUpdate(
    campusId,
    { $set: allowedUpdates },
    { new: true, runValidators: true }
  ).populate('centerHeadRef', 'name email isActive');

  if (!campus) {
    const error = new Error('Campus not found.');
    error.statusCode = 404;
    throw error;
  }

  return campus;
};

module.exports = { listCampuses, getCampusById, createCampus, updateCampus };
