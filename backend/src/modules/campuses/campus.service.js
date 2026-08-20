const Campus = require('./campus.model');
const User = require('../users/user.model');
const authService = require('../auth/auth.service');
const { ROLES } = require('../../config/constants');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

/**
 * Infer location from campus name or code if location field is empty.
 */
const inferLocationFromName = (name, code) => {
  const n = (name || '').toLowerCase();
  const c = (code || '').toUpperCase();
  if (n.includes('bharatpur') || c.includes('SGS')) return 'Bharatpur, Rajasthan';
  if (n.includes('gandhipath') || c.includes('SJS-G')) return 'Gandhipath, Jaipur, Rajasthan';
  if (n.includes('dhawas') || c.includes('SHS')) return 'Dhawas, Jaipur, Rajasthan';
  if (n.includes('hawasadak') || c.includes('SJS-H')) return 'Hawasadak, Jaipur, Rajasthan';
  if (n.includes('riet') || c === 'RIET') return 'Bhankrota, Ajmer Road, Jaipur, Rajasthan';
  return 'Jaipur, Rajasthan';
};

const listCampuses = async (query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = {};
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { code: regex }, { location: regex }];
  }

  const [rawCampuses, total] = await Promise.all([
    Campus.find(filter)
      .populate('centerHeadRef', 'name email isActive')
      .populate('createdBy', 'name email')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    Campus.countDocuments(filter),
  ]);

  const campuses = await Promise.all(
    rawCampuses.map(async (doc) => {
      const cObj = doc.toObject ? doc.toObject() : doc;

      // 1. Auto fetch Center Head from User collection if missing or null on Campus doc
      if (!cObj.centerHeadRef) {
        const centerHeadUser = await User.findOne({
          role: ROLES.CENTER_HEAD,
          scopeRef: cObj._id,
        }).select('name email isActive');

        if (centerHeadUser) {
          cObj.centerHeadRef = centerHeadUser.toObject ? centerHeadUser.toObject() : centerHeadUser;
          // Auto-heal DB reference asynchronously
          Campus.updateOne({ _id: cObj._id }, { centerHeadRef: centerHeadUser._id }).exec().catch(() => {});
        }
      }

      // 2. Infer location if empty or missing
      if (!cObj.location || cObj.location.trim() === '') {
        const inferredLoc = inferLocationFromName(cObj.name, cObj.code);
        cObj.location = inferredLoc;
        // Auto-heal DB location asynchronously
        Campus.updateOne({ _id: cObj._id }, { location: inferredLoc }).exec().catch(() => {});
      }

      return cObj;
    })
  );

  return { campuses, meta: buildPaginationMeta(page, limit, total) };
};

const getCampusById = async (campusId) => {
  const doc = await Campus.findById(campusId)
    .populate('centerHeadRef', 'name email isActive lastLoginAt')
    .populate('createdBy', 'name email');

  if (!doc) {
    const error = new Error('Campus not found.');
    error.statusCode = 404;
    throw error;
  }

  const campus = doc.toObject ? doc.toObject() : doc;

  if (!campus.centerHeadRef) {
    const centerHeadUser = await User.findOne({
      role: ROLES.CENTER_HEAD,
      scopeRef: campus._id,
    }).select('name email isActive lastLoginAt');

    if (centerHeadUser) {
      campus.centerHeadRef = centerHeadUser.toObject ? centerHeadUser.toObject() : centerHeadUser;
      Campus.updateOne({ _id: campus._id }, { centerHeadRef: centerHeadUser._id }).exec().catch(() => {});
    }
  }

  if (!campus.location || campus.location.trim() === '') {
    const inferredLoc = inferLocationFromName(campus.name, campus.code);
    campus.location = inferredLoc;
    Campus.updateOne({ _id: campus._id }, { location: inferredLoc }).exec().catch(() => {});
  }

  return campus;
};

/**
 * Creates a new campus and optionally provisions a Center Head user for it.
 */
const createCampus = async ({ name, code, location, centerHeadData, createdBy }) => {
  const finalLocation = location && location.trim() ? location.trim() : inferLocationFromName(name, code);
  const campus = await Campus.create({ name, code, location: finalLocation, createdBy });

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
  if (updates.name !== undefined) allowedUpdates.name = updates.name.trim();
  if (updates.code !== undefined) allowedUpdates.code = updates.code.trim().toUpperCase();
  if (updates.location !== undefined) allowedUpdates.location = updates.location.trim();
  if (updates.isActive !== undefined) allowedUpdates.isActive = updates.isActive;
  if (updates.centerHeadRef !== undefined) allowedUpdates.centerHeadRef = updates.centerHeadRef;

  if (updates.centerHeadData && updates.centerHeadData.email) {
    const centerHead = await authService.provisionUserAccount({
      name: updates.centerHeadData.name,
      email: updates.centerHeadData.email,
      role: ROLES.CENTER_HEAD,
      scopeRef: campusId,
      scopeModel: 'Campus',
      createdBy: updates.updatedBy || null,
    });
    allowedUpdates.centerHeadRef = centerHead._id;
  }

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
