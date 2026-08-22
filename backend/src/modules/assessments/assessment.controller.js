const assessmentService = require('./assessment.service');
const requirementService = require('../requirements/requirement.service');
const { resolveRequirementIdFromAssessment } = require('../../utils/chainResolver');
const { sendSuccess } = require('../../utils/response');

const listAssessments = async (req, res, next) => {
  try {
    const { assessments, meta } = await assessmentService.listAssessments(req.user, req.query);
    return sendSuccess(res, 200, 'Assessments retrieved.', assessments, meta);
  } catch (err) {
    next(err);
  }
};

const getAssessmentById = async (req, res, next) => {
  try {
    const assessment = await assessmentService.getAssessmentById(req.params.id, req.user);
    return sendSuccess(res, 200, 'Assessment retrieved.', assessment);
  } catch (err) {
    next(err);
  }
};

const createAssessment = async (req, res, next) => {
  try {
    const assessment = await assessmentService.createAssessment(req.body, req.user);
    return sendSuccess(res, 201, 'Assessment submitted to Director.', assessment);
  } catch (err) {
    next(err);
  }
};

const resubmitAssessment = async (req, res, next) => {
  try {
    const assessment = await assessmentService.resubmitAssessment(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Assessment resubmitted to Director.', assessment);
  } catch (err) {
    next(err);
  }
};

const forwardAssessmentToPO = async (req, res, next) => {
  try {
    const assessment = await assessmentService.forwardAssessmentToPO(req.params.id, req.user);
    return sendSuccess(res, 200, 'Assessment forwarded to PO Office.', assessment);
  } catch (err) {
    next(err);
  }
};

const rejectAssessment = async (req, res, next) => {
  try {
    const assessment = await assessmentService.rejectAssessment(req.params.id, req.body.note, req.user);
    return sendSuccess(res, 200, 'Assessment rejected.', assessment);
  } catch (err) {
    next(err);
  }
};

const getAssessmentChain = async (req, res, next) => {
  try {
    const requirementId = await resolveRequirementIdFromAssessment(req.params.id);
    const chain = requirementId ? await requirementService.getRequirementChain(requirementId, req.user) : null;
    return sendSuccess(res, 200, 'Assessment chain retrieved.', chain);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listAssessments,
  getAssessmentById,
  createAssessment,
  resubmitAssessment,
  forwardAssessmentToPO,
  rejectAssessment,
  getAssessmentChain,
};
