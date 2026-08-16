const express = require('express');
const router = express.Router();
const departmentController = require('./department.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize, requirePasswordChange } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { createDepartmentSchema, updateDepartmentSchema } = require('./department.validation');
const { ROLES } = require('../../config/constants');

router.use(authenticate, requirePasswordChange);

router.get('/', departmentController.listDepartments);
router.get('/:id', departmentController.getDepartmentById);

router.post(
  '/',
  authorize(ROLES.DIRECTOR),
  validate(createDepartmentSchema),
  departmentController.createDepartment
);
router.patch(
  '/:id',
  authorize(ROLES.DIRECTOR),
  validate(updateDepartmentSchema),
  departmentController.updateDepartment
);

module.exports = router;
