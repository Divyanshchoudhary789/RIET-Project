const WorkProposal = require('../modules/proposals/workProposal.model');
const Assessment = require('../modules/assessments/assessment.model');
const Notesheet = require('../modules/notesheets/notesheet.model');
const Memo = require('../modules/memos/memo.model');
const PurchaseOrder = require('../modules/purchaseOrders/purchaseOrder.model');

/**
 * The full approval chain (Requirement → WorkProposal → Assessment → Notesheet →
 * Memo → PurchaseOrder) is always built starting from a Requirement id
 * (see requirement.service.js getRequirementChain). These helpers let any
 * downstream document resolve "its" originating Requirement id by walking the
 * parent references back up, so every stage of the workflow can show the same
 * complete journey instead of just its own local timeline.
 *
 * A work proposal can bundle more than one requirement — the first one is used
 * as the representative origin, matching how the rest of the UI (ApprovalJourney)
 * already treats the chain as a single-requirement journey.
 */

const resolveRequirementIdFromWorkProposal = async (workProposalId) => {
  const wp = await WorkProposal.findById(workProposalId).select('requirementRefs');
  return wp?.requirementRefs?.[0] || null;
};

const resolveRequirementIdFromAssessment = async (assessmentId) => {
  const assessment = await Assessment.findById(assessmentId).select('workProposalRef');
  if (!assessment?.workProposalRef) return null;
  return resolveRequirementIdFromWorkProposal(assessment.workProposalRef);
};

const resolveRequirementIdFromNotesheet = async (notesheetId) => {
  const notesheet = await Notesheet.findById(notesheetId).select('assessmentRef');
  if (!notesheet?.assessmentRef) return null;
  return resolveRequirementIdFromAssessment(notesheet.assessmentRef);
};

const resolveRequirementIdFromMemo = async (memoId) => {
  const memo = await Memo.findById(memoId).select('notesheetRef');
  if (!memo?.notesheetRef) return null;
  return resolveRequirementIdFromNotesheet(memo.notesheetRef);
};

const resolveRequirementIdFromPurchaseOrder = async (purchaseOrderId) => {
  const order = await PurchaseOrder.findById(purchaseOrderId).select('memoRef');
  if (!order?.memoRef) return null;
  return resolveRequirementIdFromMemo(order.memoRef);
};

module.exports = {
  resolveRequirementIdFromWorkProposal,
  resolveRequirementIdFromAssessment,
  resolveRequirementIdFromNotesheet,
  resolveRequirementIdFromMemo,
  resolveRequirementIdFromPurchaseOrder,
};
