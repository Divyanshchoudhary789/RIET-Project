const express = require('express');
const router = express.Router();
const workProposalController = require('./workProposal.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize, requirePasswordChange } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { createWorkProposalSchema, resubmitWorkProposalSchema, rejectSchema } = require('./workProposal.validation');
const { ROLES } = require('../../config/constants');

router.use(authenticate, requirePasswordChange);

router.get(
  '/',
  authorize(ROLES.CLUSTER_MANAGER, ROLES.DEPARTMENT_ADMIN, ROLES.DIRECTOR, ROLES.CHAIRPERSON),
  workProposalController.listWorkProposals
);

router.get(
  '/:id',
  authorize(ROLES.CLUSTER_MANAGER, ROLES.DEPARTMENT_ADMIN, ROLES.DIRECTOR, ROLES.CHAIRPERSON),
  workProposalController.getWorkProposalById
);

router.get(
  '/:id/chain',
  authorize(ROLES.CLUSTER_MANAGER, ROLES.DEPARTMENT_ADMIN, ROLES.DIRECTOR, ROLES.CHAIRPERSON),
  workProposalController.getWorkProposalChain
);

// Cluster Manager creates a new work proposal from requirements
router.post(
  '/',
  authorize(ROLES.CLUSTER_MANAGER),
  validate(createWorkProposalSchema),
  workProposalController.createWorkProposal
);

// Cluster Manager resubmits after Department Admin rejection
router.patch(
  '/:id/resubmit',
  authorize(ROLES.CLUSTER_MANAGER),
  validate(resubmitWorkProposalSchema),
  workProposalController.resubmitWorkProposal
);

// Department Admin rejects back to Cluster Manager
router.patch(
  '/:id/reject',
  authorize(ROLES.DEPARTMENT_ADMIN),
  validate(rejectSchema),
  workProposalController.rejectWorkProposal
);

module.exports = router;
