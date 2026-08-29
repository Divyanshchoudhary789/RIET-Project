const notesheetService = require('./notesheet.service');
const requirementService = require('../requirements/requirement.service');
const { resolveRequirementIdFromNotesheet } = require('../../utils/chainResolver');
const { sendSuccess } = require('../../utils/response');

const listNotesheets = async (req, res, next) => {
  try {
    const { notesheets, meta } = await notesheetService.listNotesheets(req.user, req.query);
    return sendSuccess(res, 200, 'Notesheets retrieved.', notesheets, meta);
  } catch (err) {
    next(err);
  }
};

const getNotesheetById = async (req, res, next) => {
  try {
    const notesheet = await notesheetService.getNotesheetById(req.params.id);
    return sendSuccess(res, 200, 'Notesheet retrieved.', notesheet);
  } catch (err) {
    next(err);
  }
};

const createNotesheet = async (req, res, next) => {
  try {
    const notesheet = await notesheetService.createNotesheet(req.body, req.user);
    return sendSuccess(res, 201, 'Notesheet submitted to Director.', notesheet);
  } catch (err) {
    next(err);
  }
};

const resubmitNotesheet = async (req, res, next) => {
  try {
    const notesheet = await notesheetService.resubmitNotesheet(req.params.id, req.body, req.user);
    return sendSuccess(res, 201, 'Revised notesheet submitted to Director.', notesheet);
  } catch (err) {
    next(err);
  }
};

const getNotesheetChain = async (req, res, next) => {
  try {
    const requirementId = await resolveRequirementIdFromNotesheet(req.params.id);
    const chain = requirementId ? await requirementService.getRequirementChain(requirementId, req.user) : null;
    return sendSuccess(res, 200, 'Notesheet chain retrieved.', chain);
  } catch (err) {
    next(err);
  }
};

module.exports = { listNotesheets, getNotesheetById, createNotesheet, resubmitNotesheet, getNotesheetChain };
