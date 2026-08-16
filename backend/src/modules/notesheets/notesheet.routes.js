const express = require('express');
const router = express.Router();
const notesheetController = require('./notesheet.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize, requirePasswordChange } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const {
  createNotesheetSchema,
  resubmitNotesheetSchema,
  rejectSchema,
} = require('./notesheet.validation');
const { ROLES } = require('../../config/constants');

router.use(authenticate, requirePasswordChange);

router.get(
  '/',
  authorize(ROLES.PO_OFFICE, ROLES.DIRECTOR, ROLES.CHAIRPERSON),
  notesheetController.listNotesheets
);

router.get(
  '/:id',
  authorize(ROLES.PO_OFFICE, ROLES.DIRECTOR, ROLES.CHAIRPERSON),
  notesheetController.getNotesheetById
);

// PO Office creates the first notesheet for a forwarded assessment
router.post(
  '/',
  authorize(ROLES.PO_OFFICE),
  validate(createNotesheetSchema),
  notesheetController.createNotesheet
);

// PO Office creates a revised notesheet after Director rejection
router.post(
  '/:id/resubmit',
  authorize(ROLES.PO_OFFICE),
  validate(resubmitNotesheetSchema),
  notesheetController.resubmitNotesheet
);

// Director rejects notesheet back to PO Office
router.patch(
  '/:id/reject',
  authorize(ROLES.DIRECTOR),
  validate(rejectSchema),
  notesheetController.rejectNotesheet
);

module.exports = router;
