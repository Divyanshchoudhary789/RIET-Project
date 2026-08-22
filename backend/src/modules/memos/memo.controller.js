const memoService = require('./memo.service');
const requirementService = require('../requirements/requirement.service');
const { resolveRequirementIdFromMemo } = require('../../utils/chainResolver');
const { sendSuccess } = require('../../utils/response');

const listMemos = async (req, res, next) => {
  try {
    const { memos, meta } = await memoService.listMemos(req.user, req.query);
    return sendSuccess(res, 200, 'Memos retrieved.', memos, meta);
  } catch (err) {
    next(err);
  }
};

const getMemoById = async (req, res, next) => {
  try {
    const memo = await memoService.getMemoById(req.params.id);
    return sendSuccess(res, 200, 'Memo retrieved.', memo);
  } catch (err) {
    next(err);
  }
};

const createMemo = async (req, res, next) => {
  try {
    const memo = await memoService.createMemo(req.body, req.user);
    return sendSuccess(res, 201, 'Memo submitted to Chairperson for approval.', memo);
  } catch (err) {
    next(err);
  }
};

const resubmitMemo = async (req, res, next) => {
  try {
    const memo = await memoService.resubmitMemo(req.params.id, req.body, req.user);
    return sendSuccess(res, 201, 'Revised memo submitted to Chairperson.', memo);
  } catch (err) {
    next(err);
  }
};

const decideMemo = async (req, res, next) => {
  try {
    const { action, note } = req.body;
    const memo = await memoService.decideMemo(req.params.id, action, note, req.user);
    const message = action === 'approve' ? 'Memo approved and sent to Accounts.' : 'Memo rejected.';
    return sendSuccess(res, 200, message, memo);
  } catch (err) {
    next(err);
  }
};

const getMemoChain = async (req, res, next) => {
  try {
    const requirementId = await resolveRequirementIdFromMemo(req.params.id);
    const chain = requirementId ? await requirementService.getRequirementChain(requirementId, req.user) : null;
    return sendSuccess(res, 200, 'Memo chain retrieved.', chain);
  } catch (err) {
    next(err);
  }
};

module.exports = { listMemos, getMemoById, createMemo, resubmitMemo, decideMemo, getMemoChain };
