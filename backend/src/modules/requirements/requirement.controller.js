const requirementService = require('./requirement.service');
const { sendSuccess } = require('../../utils/response');

const listRequirements = async (req, res, next) => {
  try {
    const { requirements, meta } = await requirementService.listRequirements(req.user, req.query);
    return sendSuccess(res, 200, 'Requirements retrieved.', requirements, meta);
  } catch (err) {
    next(err);
  }
};

const getRequirementById = async (req, res, next) => {
  try {
    const requirement = await requirementService.getRequirementById(req.params.id, req.user);
    return sendSuccess(res, 200, 'Requirement retrieved.', requirement);
  } catch (err) {
    next(err);
  }
};

const createRequirement = async (req, res, next) => {
  try {
    const requirement = await requirementService.createRequirement(req.body, req.user);
    return sendSuccess(res, 201, 'Requirement submitted successfully.', requirement);
  } catch (err) {
    next(err);
  }
};

const rejectRequirement = async (req, res, next) => {
  try {
    const requirement = await requirementService.rejectRequirement(req.params.id, req.body.note, req.user);
    return sendSuccess(res, 200, 'Requirement rejected.', requirement);
  } catch (err) {
    next(err);
  }
};

const resubmitRequirement = async (req, res, next) => {
  try {
    const requirement = await requirementService.resubmitRequirement(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Requirement resubmitted successfully.', requirement);
  } catch (err) {
    next(err);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await requirementService.getDashboardStats(req.user);
    return sendSuccess(res, 200, 'Dashboard stats retrieved.', stats);
  } catch (err) {
    next(err);
  }
};

const getRequirementChain = async (req, res, next) => {
  try {
    const chain = await requirementService.getRequirementChain(req.params.id, req.user);
    return sendSuccess(res, 200, 'Requirement chain retrieved.', chain);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listRequirements,
  getRequirementById,
  createRequirement,
  rejectRequirement,
  resubmitRequirement,
  getDashboardStats,
  getRequirementChain,
};
