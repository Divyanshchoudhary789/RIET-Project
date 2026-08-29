const express = require('express');
const router = express.Router();
const assessmentController = require('./assessment.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize, requirePasswordChange } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const {
  createAssessmentSchema,
  resubmitAssessmentSchema,
} = require('./assessment.validation');
const { actionNoteSchema } = require('../shared/actionNote.validation');
const { ROLES } = require('../../config/constants');

router.use(authenticate, requirePasswordChange);

router.get(
  '/',
  authorize(ROLES.DEPARTMENT_ADMIN, ROLES.DIRECTOR, ROLES.CHAIRPERSON, ROLES.PO_OFFICE),
  assessmentController.listAssessments
);

router.get(
  '/:id',
  authorize(ROLES.DEPARTMENT_ADMIN, ROLES.DIRECTOR, ROLES.CHAIRPERSON, ROLES.PO_OFFICE),
  assessmentController.getAssessmentById
);

router.get(
  '/:id/chain',
  authorize(ROLES.DEPARTMENT_ADMIN, ROLES.DIRECTOR, ROLES.CHAIRPERSON, ROLES.PO_OFFICE),
  assessmentController.getAssessmentChain
);

// Department Admin creates a new assessment for a work proposal
router.post(
  '/',
  authorize(ROLES.DEPARTMENT_ADMIN),
  validate(createAssessmentSchema),
  assessmentController.createAssessment
);

// Department Admin resubmits after a legacy rejection
router.patch(
  '/:id/resubmit',
  authorize(ROLES.DEPARTMENT_ADMIN),
  validate(resubmitAssessmentSchema),
  assessmentController.resubmitAssessment
);

// Director forwards assessment to PO Office (optional note)
router.patch(
  '/:id/forward',
  authorize(ROLES.DIRECTOR),
  validate(actionNoteSchema),
  assessmentController.forwardAssessmentToPO
);

module.exports = router;
