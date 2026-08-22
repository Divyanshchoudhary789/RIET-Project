const Department = require('./department.model');
const User = require('../users/user.model');
const authService = require('../auth/auth.service');
const { ROLES } = require('../../config/constants');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

/**
 * Resolves the department admin for a department, falling back to a lookup by
 * User.scopeRef when departmentAdminRef wasn't back-filled at account-creation time
 * (e.g. accounts provisioned before this reference existed), and self-heals the
 * department document so future reads don't need the fallback.
 */
const resolveDepartmentAdmin = async (department, selectFields) => {
  if (department.departmentAdminRef) return department;

  const admin = await User.findOne({ role: ROLES.DEPARTMENT_ADMIN, scopeRef: department._id })
    .select(selectFields);

  if (admin) {
    department.departmentAdminRef = admin.toObject ? admin.toObject() : admin;
    Department.updateOne({ _id: department._id }, { departmentAdminRef: admin._id }).exec().catch(() => {});
  }

  return department;
};

const listDepartments = async (query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = {};
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { code: regex }];
  }

  const [rawDepartments, total] = await Promise.all([
    Department.find(filter)
      .populate('departmentAdminRef', 'name email isActive')
      .populate('createdBy', 'name email')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    Department.countDocuments(filter),
  ]);

  const departments = await Promise.all(
    rawDepartments.map((doc) => resolveDepartmentAdmin(doc.toObject(), 'name email isActive'))
  );

  return { departments, meta: buildPaginationMeta(page, limit, total) };
};

const getDepartmentById = async (departmentId) => {
  const doc = await Department.findById(departmentId)
    .populate('departmentAdminRef', 'name email isActive lastLoginAt')
    .populate('createdBy', 'name email');

  if (!doc) {
    const error = new Error('Department not found.');
    error.statusCode = 404;
    throw error;
  }

  return resolveDepartmentAdmin(doc.toObject(), 'name email isActive lastLoginAt');
};

const createDepartment = async ({ name, code, adminData, createdBy }) => {
  const department = await Department.create({ name, code, createdBy });

  if (adminData) {
    const admin = await authService.provisionUserAccount({
      name: adminData.name,
      email: adminData.email,
      role: ROLES.DEPARTMENT_ADMIN,
      scopeRef: department._id,
      scopeModel: 'Department',
      createdBy,
    });

    department.departmentAdminRef = admin._id;
    await department.save();
  }

  return Department.findById(department._id).populate('departmentAdminRef', 'name email');
};

const updateDepartment = async (departmentId, updates) => {
  const allowedUpdates = {};
  if (updates.name !== undefined) allowedUpdates.name = updates.name;
  if (updates.isActive !== undefined) allowedUpdates.isActive = updates.isActive;

  if (updates.adminData && updates.adminData.email) {
    const admin = await authService.provisionUserAccount({
      name: updates.adminData.name,
      email: updates.adminData.email,
      role: ROLES.DEPARTMENT_ADMIN,
      scopeRef: departmentId,
      scopeModel: 'Department',
      createdBy: updates.updatedBy || null,
    });
    allowedUpdates.departmentAdminRef = admin._id;
  }

  if (Object.keys(allowedUpdates).length === 0) {
    const error = new Error('No valid fields provided for update.');
    error.statusCode = 400;
    throw error;
  }

  const department = await Department.findByIdAndUpdate(
    departmentId,
    { $set: allowedUpdates },
    { new: true, runValidators: true }
  ).populate('departmentAdminRef', 'name email isActive');

  if (!department) {
    const error = new Error('Department not found.');
    error.statusCode = 404;
    throw error;
  }

  return department;
};

module.exports = { listDepartments, getDepartmentById, createDepartment, updateDepartment };
