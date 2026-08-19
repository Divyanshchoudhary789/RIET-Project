const Requirement = require('./requirement.model');
const WorkProposal = require('../proposals/workProposal.model');
const Assessment = require('../assessments/assessment.model');
const Notesheet = require('../notesheets/notesheet.model');
const Memo = require('../memos/memo.model');
const PurchaseOrder = require('../purchaseOrders/purchaseOrder.model');
const User = require('../users/user.model');
const { buildTimelineEntry } = require('../../utils/timeline');
const { createNotification, emitDashboardRefresh } = require('../notifications/notification.service');
const { DOCUMENT_STATUS, TIMELINE_ACTIONS, ROLES } = require('../../config/constants');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

const buildFilter = (user, query) => {
  const filter = {};
  if (user.role === ROLES.CENTER_HEAD) {
    filter.campusRef = user.scopeRef;
  } else {
    if (query.campusRef) filter.campusRef = query.campusRef;
  }
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ justification: regex }];
  }
  return filter;
};

const listRequirements = async (user, query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = buildFilter(user, query);
  const [requirements, total] = await Promise.all([
    Requirement.find(filter)
      .populate('campusRef', 'name code')
      .populate('createdBy', 'name email role')
      .populate({ path: 'timeline.actor', select: 'name email role' })
      .populate('workProposalRef', 'title status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Requirement.countDocuments(filter),
  ]);
  return { requirements, meta: buildPaginationMeta(page, limit, total) };
};

const getRequirementById = async (requirementId, user) => {
  const requirement = await Requirement.findById(requirementId)
    .populate('campusRef', 'name code')
    .populate('createdBy', 'name email role')
    .populate({ path: 'timeline.actor', select: 'name email role' })
    .populate('workProposalRef', 'title status');

  if (!requirement) {
    const error = new Error('Requirement not found.');
    error.statusCode = 404;
    throw error;
  }
  if (user.role === ROLES.CENTER_HEAD && requirement.campusRef._id.toString() !== user.scopeRef.toString()) {
    const error = new Error('You do not have access to this requirement.');
    error.statusCode = 403;
    throw error;
  }
  return requirement;
};

const createRequirement = async (data, user) => {
  if (user.role !== ROLES.CENTER_HEAD) {
    const error = new Error('Only Center Heads can create requirements.');
    error.statusCode = 403;
    throw error;
  }

  const requirement = await Requirement.create({
    campusRef: user.scopeRef,
    createdBy: user._id,
    items: data.items,
    priority: data.priority,
    justification: data.justification,
    attachments: data.attachments || [],
    status: DOCUMENT_STATUS.SUBMITTED,
    timeline: [buildTimelineEntry(user, TIMELINE_ACTIONS.SUBMITTED)],
  });

  const clusterManagers = await User.find({ role: ROLES.CLUSTER_MANAGER, isActive: true });
  for (const cm of clusterManagers) {
    await createNotification({
      userId: cm._id,
      userEmail: cm.email,
      userName: cm.name,
      type: 'requirement_submitted',
      title: 'New Requirement Submitted',
      message: `A new requirement has been submitted by ${user.name} and is awaiting your review.`,
      documentType: 'Requirement',
      documentId: requirement._id,
      actionType: 'Submitted',
    });
  }

  // Refresh cluster manager dashboards
  emitDashboardRefresh(ROLES.CLUSTER_MANAGER, 'requirement', { action: 'created', id: requirement._id });

  return requirement;
};

const rejectRequirement = async (requirementId, note, clusterManager) => {
  const requirement = await Requirement.findById(requirementId)
    .populate('createdBy', 'name email');

  if (!requirement) {
    const error = new Error('Requirement not found.');
    error.statusCode = 404;
    throw error;
  }
  if (requirement.status !== DOCUMENT_STATUS.SUBMITTED && requirement.status !== DOCUMENT_STATUS.REVISED) {
    const error = new Error(`Cannot reject a requirement with status: ${requirement.status}`);
    error.statusCode = 400;
    throw error;
  }

  requirement.status = DOCUMENT_STATUS.REJECTED;
  requirement.timeline.push(buildTimelineEntry(clusterManager, TIMELINE_ACTIONS.REJECTED, note));
  await requirement.save();

  await createNotification({
    userId: requirement.createdBy._id,
    userEmail: requirement.createdBy.email,
    userName: requirement.createdBy.name,
    type: 'requirement_rejected',
    title: 'Requirement Rejected',
    message: `Your requirement has been rejected by ${clusterManager.name}. Reason: ${note}`,
    documentType: 'Requirement',
    documentId: requirement._id,
    actionType: 'Rejected',
    note,
  });

  // Refresh center_head and cluster_manager dashboards
  emitDashboardRefresh(
    [ROLES.CENTER_HEAD, ROLES.CLUSTER_MANAGER],
    'requirement',
    { action: 'rejected', id: requirement._id }
  );

  return requirement;
};

const resubmitRequirement = async (requirementId, data, user) => {
  const requirement = await Requirement.findById(requirementId);
  if (!requirement) {
    const error = new Error('Requirement not found.');
    error.statusCode = 404;
    throw error;
  }
  if (requirement.status !== DOCUMENT_STATUS.REJECTED) {
    const error = new Error('Only rejected requirements can be resubmitted.');
    error.statusCode = 400;
    throw error;
  }
  if (requirement.campusRef.toString() !== user.scopeRef.toString()) {
    const error = new Error('You can only resubmit requirements from your own campus.');
    error.statusCode = 403;
    throw error;
  }

  requirement.items = data.items || requirement.items;
  requirement.priority = data.priority || requirement.priority;
  requirement.justification = data.justification || requirement.justification;
  requirement.status = DOCUMENT_STATUS.REVISED;
  requirement.timeline.push(buildTimelineEntry(user, TIMELINE_ACTIONS.REVISED, data.note || ''));
  await requirement.save();

  const clusterManagers = await User.find({ role: ROLES.CLUSTER_MANAGER, isActive: true });
  for (const cm of clusterManagers) {
    await createNotification({
      userId: cm._id,
      userEmail: cm.email,
      userName: cm.name,
      type: 'requirement_resubmitted',
      title: 'Requirement Resubmitted',
      message: `A previously rejected requirement has been revised and resubmitted by ${user.name}.`,
      documentType: 'Requirement',
      documentId: requirement._id,
      actionType: 'Revised',
    });
  }

  emitDashboardRefresh(
    [ROLES.CENTER_HEAD, ROLES.CLUSTER_MANAGER],
    'requirement',
    { action: 'resubmitted', id: requirement._id }
  );

  return requirement;
};

const getDashboardStats = async (user) => {
  const filter = user.role === ROLES.CENTER_HEAD ? { campusRef: user.scopeRef } : {};
  const [total, submitted, underReview, rejected, closed] = await Promise.all([
    Requirement.countDocuments(filter),
    Requirement.countDocuments({ ...filter, status: DOCUMENT_STATUS.SUBMITTED }),
    Requirement.countDocuments({ ...filter, status: DOCUMENT_STATUS.UNDER_REVIEW }),
    Requirement.countDocuments({ ...filter, status: DOCUMENT_STATUS.REJECTED }),
    Requirement.countDocuments({ ...filter, status: DOCUMENT_STATUS.CLOSED }),
  ]);
  const recent = await Requirement.find(filter)
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('campusRef', 'name code')
    .populate('createdBy', 'name');
  return { total, submitted, underReview, rejected, closed, recent };
};

const getRequirementChain = async (requirementId, user) => {
  const requirement = await Requirement.findById(requirementId)
    .populate('campusRef', 'name code')
    .populate('createdBy', 'name email role')
    .populate({ path: 'timeline.actor', select: 'name email role' });

  if (!requirement) {
    const error = new Error('Requirement not found.');
    error.statusCode = 404;
    throw error;
  }
  if (user.role === ROLES.CENTER_HEAD && requirement.campusRef._id.toString() !== user.scopeRef.toString()) {
    const error = new Error('You do not have access to this requirement.');
    error.statusCode = 403;
    throw error;
  }

  const chain = {
    requirement: { _id: requirement._id, status: requirement.status, timeline: requirement.timeline },
    workProposal: null,
    assessment: null,
    notesheet: null,
    memo: null,
    purchaseOrder: null,
  };

  if (!requirement.workProposalRef) return chain;

  const workProposal = await WorkProposal.findById(requirement.workProposalRef)
    .populate('createdBy', 'name role')
    .populate({ path: 'timeline.actor', select: 'name email role' })
    .lean();
  if (!workProposal) return chain;

  chain.workProposal = {
    _id: workProposal._id,
    title: workProposal.title,
    status: workProposal.status,
    createdBy: workProposal.createdBy,
    createdAt: workProposal.createdAt,
    timeline: workProposal.timeline,
  };

  if (!workProposal.assessmentRef) return chain;

  const assessment = await Assessment.findById(workProposal.assessmentRef)
    .populate('createdBy', 'name role')
    .populate('departmentRef', 'name')
    .populate({ path: 'timeline.actor', select: 'name email role' })
    .lean();
  if (!assessment) return chain;

  chain.assessment = {
    _id: assessment._id,
    status: assessment.status,
    estimatedCost: assessment.estimatedCost,
    feasibilityNotes: assessment.feasibilityNotes,
    recommendedAction: assessment.recommendedAction,
    createdBy: assessment.createdBy,
    departmentRef: assessment.departmentRef,
    createdAt: assessment.createdAt,
    timeline: assessment.timeline,
  };

  if (!assessment.notesheetRef) return chain;

  const notesheet = await Notesheet.findById(assessment.notesheetRef)
    .populate('createdBy', 'name role')
    .populate({ path: 'timeline.actor', select: 'name email role' })
    .lean();
  if (!notesheet) return chain;

  chain.notesheet = {
    _id: notesheet._id,
    status: notesheet.status,
    quotations: notesheet.quotations,
    createdBy: notesheet.createdBy,
    createdAt: notesheet.createdAt,
    timeline: notesheet.timeline,
  };

  if (!notesheet.memoRef) return chain;

  const memo = await Memo.findById(notesheet.memoRef)
    .populate('createdBy', 'name role')
    .populate('decidedBy', 'name role')
    .populate({ path: 'timeline.actor', select: 'name email role' })
    .lean();
  if (!memo) return chain;

  chain.memo = {
    _id: memo._id,
    status: memo.status,
    summary: memo.summary,
    recommendedVendor: memo.recommendedVendor,
    decisionNote: memo.decisionNote,
    createdBy: memo.createdBy,
    decidedBy: memo.decidedBy,
    decidedAt: memo.decidedAt,
    createdAt: memo.createdAt,
    timeline: memo.timeline,
  };

  if (!memo.purchaseOrderRef) return chain;

  const purchaseOrder = await PurchaseOrder.findById(memo.purchaseOrderRef)
    .populate('createdBy', 'name role')
    .populate('receivedBy', 'name role')
    .lean();
  if (!purchaseOrder) return chain;

  chain.purchaseOrder = {
    _id: purchaseOrder._id,
    poNumber: purchaseOrder.poNumber,
    status: purchaseOrder.status,
    vendorName: purchaseOrder.vendorName,
    totalAmount: purchaseOrder.totalAmount,
    piAttachmentUrl: purchaseOrder.piAttachmentUrl,
    createdBy: purchaseOrder.createdBy,
    receivedBy: purchaseOrder.receivedBy,
    receivedAt: purchaseOrder.receivedAt,
    createdAt: purchaseOrder.createdAt,
    timeline: purchaseOrder.timeline,
  };

  return chain;
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
