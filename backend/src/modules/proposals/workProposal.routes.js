const express = require('express');
const router = express.Router();
const workProposalController = require('./workProposal.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize, requirePasswordChange } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { createWorkProposalSchema, resubmitWorkProposalSchema } = require('./workProposal.validation');
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

// Cluster Manager creates a new work proposal from requirement line items
router.post(
  '/',
  authorize(ROLES.CLUSTER_MANAGER),
  validate(createWorkProposalSchema),
  workProposalController.createWorkProposal
);

// Cluster Manager resubmits a rejected proposal (legacy rejected rows only)
router.patch(
  '/:id/resubmit',
  authorize(ROLES.CLUSTER_MANAGER),
  validate(resubmitWorkProposalSchema),
  workProposalController.resubmitWorkProposal
);

module.exports = router;
