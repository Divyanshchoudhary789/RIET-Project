const express = require('express');
const router = express.Router();
const requirementController = require('./requirement.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize, requirePasswordChange } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { createRequirementSchema, rejectSchema } = require('./requirement.validation');
const { ROLES } = require('../../config/constants');

router.use(authenticate, requirePasswordChange);

router.get(
  '/dashboard-stats',
  authorize(ROLES.CENTER_HEAD, ROLES.CLUSTER_MANAGER, ROLES.DIRECTOR, ROLES.CHAIRPERSON),
  requirementController.getDashboardStats
);

router.get(
  '/',
  authorize(
    ROLES.CENTER_HEAD,
    ROLES.CLUSTER_MANAGER,
    ROLES.DIRECTOR,
    ROLES.CHAIRPERSON,
    ROLES.DEPARTMENT_ADMIN
  ),
  requirementController.listRequirements
);

router.get(
  '/:id',
  authorize(
    ROLES.CENTER_HEAD,
    ROLES.CLUSTER_MANAGER,
    ROLES.DIRECTOR,
    ROLES.CHAIRPERSON,
    ROLES.DEPARTMENT_ADMIN
  ),
  requirementController.getRequirementById
);

router.post(
  '/',
  authorize(ROLES.CENTER_HEAD),
  validate(createRequirementSchema),
  requirementController.createRequirement
);

router.patch(
  '/:id/reject',
  authorize(ROLES.CLUSTER_MANAGER),
  validate(rejectSchema),
  requirementController.rejectRequirement
);

router.patch(
  '/:id/resubmit',
  authorize(ROLES.CENTER_HEAD),
  validate(createRequirementSchema),
  requirementController.resubmitRequirement
);

module.exports = router;
