const express = require('express');
const router = express.Router();
const memoController = require('./memo.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize, requirePasswordChange } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const {
  createMemoSchema,
  resubmitMemoSchema,
  approveRejectMemoSchema,
} = require('./memo.validation');
const { ROLES } = require('../../config/constants');

router.use(authenticate, requirePasswordChange);

router.get(
  '/',
  authorize(ROLES.DIRECTOR, ROLES.CHAIRPERSON, ROLES.ACCOUNTS),
  memoController.listMemos
);

router.get(
  '/:id',
  authorize(ROLES.DIRECTOR, ROLES.CHAIRPERSON, ROLES.ACCOUNTS),
  memoController.getMemoById
);

// Director creates a memo from a reviewed notesheet
router.post(
  '/',
  authorize(ROLES.DIRECTOR),
  validate(createMemoSchema),
  memoController.createMemo
);

// Director resubmits a revised memo after Chairperson rejection
router.post(
  '/:id/resubmit',
  authorize(ROLES.DIRECTOR),
  validate(resubmitMemoSchema),
  memoController.resubmitMemo
);

// Chairperson approves or rejects a memo
router.patch(
  '/:id/decide',
  authorize(ROLES.CHAIRPERSON),
  validate(approveRejectMemoSchema),
  memoController.decideMemo
);

module.exports = router;
