const Department = require('./department.model');
const authService = require('../auth/auth.service');
const { ROLES } = require('../../config/constants');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

const listDepartments = async (query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = {};
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

  const [departments, total] = await Promise.all([
    Department.find(filter)
      .populate('departmentAdminRef', 'name email isActive')
      .populate('createdBy', 'name email')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    Department.countDocuments(filter),
  ]);

  return { departments, meta: buildPaginationMeta(page, limit, total) };
};

const getDepartmentById = async (departmentId) => {
  const department = await Department.findById(departmentId)
    .populate('departmentAdminRef', 'name email isActive lastLoginAt')
    .populate('createdBy', 'name email');

  if (!department) {
    const error = new Error('Department not found.');
    error.statusCode = 404;
    throw error;
  }

  return department;
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
