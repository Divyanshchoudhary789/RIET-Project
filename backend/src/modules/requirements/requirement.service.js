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

const buildFilter = async (user, query) => {
  const filter = {};
  if (user.role === ROLES.CENTER_HEAD) {
    filter.campusRef = user.scopeRef;
  } else if (user.role === ROLES.DEPARTMENT_ADMIN) {
    // A department admin may only see requirements that reached their department via a work proposal
    const proposalIds = await WorkProposal.find({ departmentRefs: user.scopeRef }).distinct('_id');
    filter.workProposalRef = { $in: proposalIds };
  } else {
    if (query.campusRef) filter.campusRef = query.campusRef;
  }
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: regex }, { description: regex }];
  }
  return filter;
};

const listRequirements = async (user, query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = await buildFilter(user, query);
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
  if (user.role === ROLES.DEPARTMENT_ADMIN) {
    await assertDepartmentAdminAccess(requirement, user);
  }
  return requirement;
};

const assertDepartmentAdminAccess = async (requirement, user) => {
  // requirement.workProposalRef may already be a populated document (partial fields only) —
  // resolve its _id explicitly rather than passing the whole object to findById.
  const workProposalId = requirement.workProposalRef?._id || requirement.workProposalRef;
  const proposal = workProposalId
    ? await WorkProposal.findById(workProposalId).select('departmentRefs')
    : null;
  const isAssigned = proposal?.departmentRefs.some((d) => d.toString() === user.scopeRef.toString());
  if (!isAssigned) {
    const error = new Error('You do not have access to this requirement.');
    error.statusCode = 403;
    throw error;
  }
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
    title: data.title,
    items: data.items,
    priority: data.priority,
    description: data.description,
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

  requirement.title = data.title || requirement.title;
  requirement.items = data.items || requirement.items;
  requirement.priority = data.priority || requirement.priority;
  requirement.description = data.description || requirement.description;
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
  if (user.role === ROLES.DEPARTMENT_ADMIN) {
    await assertDepartmentAdminAccess(requirement, user);
  }

  const chain = {
    requirement: { _id: requirement._id, status: requirement.status, timeline: requirement.timeline },
    workProposal: null,
    branches: [],
    // Legacy single-branch fields — kept populated with branches[0] for any
    // caller / UI that has not yet been updated to read `branches`.
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
    items: workProposal.items || [],
    createdBy: workProposal.createdBy,
    createdAt: workProposal.createdAt,
    timeline: workProposal.timeline,
  };

  // A proposal may fan out to one assessment per assigned department.
  const assessmentIds = (workProposal.assessmentRefs && workProposal.assessmentRefs.length > 0)
    ? workProposal.assessmentRefs
    : (workProposal.assessmentRef ? [workProposal.assessmentRef] : []);

  for (const assessmentId of assessmentIds) {
    const branch = await buildBranchFromAssessment(assessmentId);
    if (branch) chain.branches.push(branch);
  }

  if (chain.branches.length > 0) {
    const b = chain.branches[0];
    chain.assessment = b.assessment;
    chain.notesheet = b.notesheet;
    chain.memo = b.memo;
    chain.purchaseOrder = b.purchaseOrder;
  }

  return chain;
};

/**
 * Builds a single department branch { department, assessment, notesheet, memo,
 * purchaseOrder } starting from an assessment id. Returns null if the assessment
 * no longer exists.
 */
const buildBranchFromAssessment = async (assessmentId) => {
  const assessment = await Assessment.findById(assessmentId)
    .populate('createdBy', 'name role')
    .populate('departmentRef', 'name')
    .populate({ path: 'timeline.actor', select: 'name email role' })
    .lean();
  if (!assessment) return null;

  const branch = {
    department: assessment.departmentRef || null,
    assessment: {
      _id: assessment._id,
      status: assessment.status,
      estimatedCost: assessment.estimatedCost,
      feasibilityNotes: assessment.feasibilityNotes,
      recommendedAction: assessment.recommendedAction,
      items: assessment.items || [],
      createdBy: assessment.createdBy,
      departmentRef: assessment.departmentRef,
      createdAt: assessment.createdAt,
      timeline: assessment.timeline,
    },
    notesheet: null,
    memo: null,
    purchaseOrder: null,
  };

  if (!assessment.notesheetRef) return branch;

  const notesheet = await Notesheet.findById(assessment.notesheetRef)
    .populate('createdBy', 'name role')
    .populate({ path: 'timeline.actor', select: 'name email role' })
    .lean();
  if (!notesheet) return branch;

  branch.notesheet = {
    _id: notesheet._id,
    status: notesheet.status,
    quotations: notesheet.quotations,
    createdBy: notesheet.createdBy,
    createdAt: notesheet.createdAt,
    timeline: notesheet.timeline,
  };

  if (!notesheet.memoRef) return branch;

  const memo = await Memo.findById(notesheet.memoRef)
    .populate('createdBy', 'name role')
    .populate('decidedBy', 'name role')
    .populate({ path: 'timeline.actor', select: 'name email role' })
    .lean();
  if (!memo) return branch;

  branch.memo = {
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

  if (!memo.purchaseOrderRef) return branch;

  const purchaseOrder = await PurchaseOrder.findById(memo.purchaseOrderRef)
    .populate('createdBy', 'name role')
    .populate('receivedBy', 'name role')
    .lean();
  if (!purchaseOrder) return branch;

  branch.purchaseOrder = {
    _id: purchaseOrder._id,
    poNumber: purchaseOrder.poNumber,
    status: purchaseOrder.status,
    vendorName: purchaseOrder.vendorName,
    totalAmount: purchaseOrder.totalAmount,
    piAttachmentUrl: purchaseOrder.piAttachmentUrl,
    stockEntryStatus: purchaseOrder.stockEntryStatus,
    createdBy: purchaseOrder.createdBy,
    receivedBy: purchaseOrder.receivedBy,
    receivedAt: purchaseOrder.receivedAt,
    createdAt: purchaseOrder.createdAt,
    timeline: purchaseOrder.timeline,
  };

  return branch;
};

module.exports = {
  listRequirements,
  getRequirementById,
  createRequirement,
  resubmitRequirement,
  getDashboardStats,
  getRequirementChain,
};
