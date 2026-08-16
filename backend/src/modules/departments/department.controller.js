const departmentService = require('./department.service');
const { sendSuccess } = require('../../utils/response');

const listDepartments = async (req, res, next) => {
  try {
    const { departments, meta } = await departmentService.listDepartments(req.query);
    return sendSuccess(res, 200, 'Departments retrieved.', departments, meta);
  } catch (err) {
    next(err);
  }
};

const getDepartmentById = async (req, res, next) => {
  try {
    const department = await departmentService.getDepartmentById(req.params.id);
    return sendSuccess(res, 200, 'Department retrieved.', department);
  } catch (err) {
    next(err);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.createDepartment({ ...req.body, createdBy: req.user._id });
    return sendSuccess(res, 201, 'Department created successfully.', department);
  } catch (err) {
    next(err);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const department = await departmentService.updateDepartment(req.params.id, req.body);
    return sendSuccess(res, 200, 'Department updated.', department);
  } catch (err) {
    next(err);
  }
};

module.exports = { listDepartments, getDepartmentById, createDepartment, updateDepartment };
