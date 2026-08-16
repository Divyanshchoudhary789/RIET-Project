const workProposalService = require('./workProposal.service');
const { sendSuccess } = require('../../utils/response');

const listWorkProposals = async (req, res, next) => {
  try {
    const { proposals, meta } = await workProposalService.listWorkProposals(req.user, req.query);
    return sendSuccess(res, 200, 'Work proposals retrieved.', proposals, meta);
  } catch (err) {
    next(err);
  }
};

const getWorkProposalById = async (req, res, next) => {
  try {
    const proposal = await workProposalService.getWorkProposalById(req.params.id);
    return sendSuccess(res, 200, 'Work proposal retrieved.', proposal);
  } catch (err) {
    next(err);
  }
};

const createWorkProposal = async (req, res, next) => {
  try {
    const proposal = await workProposalService.createWorkProposal(req.body, req.user);
    return sendSuccess(res, 201, 'Work proposal created and sent to department(s).', proposal);
  } catch (err) {
    next(err);
  }
};

const resubmitWorkProposal = async (req, res, next) => {
  try {
    const proposal = await workProposalService.resubmitWorkProposal(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Work proposal revised and resubmitted.', proposal);
  } catch (err) {
    next(err);
  }
};

const rejectWorkProposal = async (req, res, next) => {
  try {
    const proposal = await workProposalService.rejectWorkProposal(
      req.params.id,
      req.body.note,
      req.user
    );
    return sendSuccess(res, 200, 'Work proposal rejected.', proposal);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listWorkProposals,
  getWorkProposalById,
  createWorkProposal,
  resubmitWorkProposal,
  rejectWorkProposal,
};
