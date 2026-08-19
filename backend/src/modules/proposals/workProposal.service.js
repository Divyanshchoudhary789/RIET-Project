const WorkProposal = require('./workProposal.model');
const Requirement = require('../requirements/requirement.model');
const Department = require('../departments/department.model');
const User = require('../users/user.model');
const { buildTimelineEntry } = require('../../utils/timeline');
const { createNotification, notifyMany, emitDashboardRefresh } = require('../notifications/notification.service');
const { DOCUMENT_STATUS, TIMELINE_ACTIONS, ROLES } = require('../../config/constants');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

const buildFilter = (user, query) => {
  const filter = {};
  if (user.role === ROLES.DEPARTMENT_ADMIN) {
    filter.departmentRefs = user.scopeRef;
  } else {
    if (query.departmentRef) filter.departmentRefs = query.departmentRef;
  }
  if (query.status) filter.status = query.status;
  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: regex }, { description: regex }];
  }
  return filter;
};

const listWorkProposals = async (user, query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = buildFilter(user, query);
  const [proposals, total] = await Promise.all([
    WorkProposal.find(filter)
      .populate('requirementRefs', 'items priority status campusRef')
      .populate('departmentRefs', 'name code')
      .populate('createdBy', 'name email role')
      .populate({ path: 'timeline.actor', select: 'name email role' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    WorkProposal.countDocuments(filter),
  ]);
  return { proposals, meta: buildPaginationMeta(page, limit, total) };
};

const getWorkProposalById = async (proposalId) => {
  const proposal = await WorkProposal.findById(proposalId)
    .populate({ path: 'requirementRefs', populate: { path: 'campusRef', select: 'name code' } })
    .populate('departmentRefs', 'name code')
    .populate('createdBy', 'name email role')
    .populate({ path: 'timeline.actor', select: 'name email role' })
    .populate('assessmentRef', 'status estimatedCost');
  if (!proposal) {
    const error = new Error('Work proposal not found.');
    error.statusCode = 404;
    throw error;
  }
  return proposal;
};

const createWorkProposal = async (data, clusterManager) => {
  const requirements = await Requirement.find({
    _id: { $in: data.requirementRefs },
    status: { $in: [DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.REVISED] },
  });
  if (requirements.length !== data.requirementRefs.length) {
    const error = new Error('One or more requirements are invalid or not in a submittable state.');
    error.statusCode = 400;
    throw error;
  }

  const departments = await Department.find({ _id: { $in: data.departmentRefs }, isActive: true })
    .populate('departmentAdminRef', 'name email');
  if (departments.length !== data.departmentRefs.length) {
    const error = new Error('One or more departments are invalid or inactive.');
    error.statusCode = 400;
    throw error;
  }

  const proposal = await WorkProposal.create({
    requirementRefs: data.requirementRefs,
    departmentRefs: data.departmentRefs,
    createdBy: clusterManager._id,
    title: data.title,
    description: data.description || '',
    status: DOCUMENT_STATUS.SUBMITTED,
    timeline: [buildTimelineEntry(clusterManager, TIMELINE_ACTIONS.SUBMITTED)],
  });

  const timelineEntry = buildTimelineEntry(clusterManager, TIMELINE_ACTIONS.FORWARDED, 'Included in Work Proposal');
  await Requirement.updateMany(
    { _id: { $in: data.requirementRefs } },
    { $set: { status: DOCUMENT_STATUS.FORWARDED, workProposalRef: proposal._id }, $push: { timeline: timelineEntry } }
  );

  const departmentAdmins = departments.map((d) => d.departmentAdminRef).filter(Boolean);
  await notifyMany(departmentAdmins, {
    type: 'work_proposal_received',
    title: 'New Work Proposal Assigned',
    message: `A new work proposal has been assigned to your department and requires your assessment.`,
    documentType: 'WorkProposal',
    documentId: proposal._id,
    actionType: 'Submitted',
  });

  emitDashboardRefresh(
    [ROLES.DEPARTMENT_ADMIN, ROLES.CLUSTER_MANAGER, ROLES.CENTER_HEAD],
    'workProposal',
    { action: 'created', id: proposal._id }
  );

  return proposal;
};

const resubmitWorkProposal = async (proposalId, data, clusterManager) => {
  const proposal = await WorkProposal.findById(proposalId);
  if (!proposal) {
    const error = new Error('Work proposal not found.');
    error.statusCode = 404;
    throw error;
  }
  if (proposal.status !== DOCUMENT_STATUS.REJECTED) {
    const error = new Error('Only rejected work proposals can be resubmitted.');
    error.statusCode = 400;
    throw error;
  }
  if (proposal.createdBy.toString() !== clusterManager._id.toString()) {
    const error = new Error('You can only resubmit proposals that you created.');
    error.statusCode = 403;
    throw error;
  }

  const targetDepartmentRefs = data.departmentRefs || proposal.departmentRefs;
  const departments = await Department.find({ _id: { $in: targetDepartmentRefs }, isActive: true })
    .populate('departmentAdminRef', 'name email');
  if (departments.length !== targetDepartmentRefs.length) {
    const error = new Error('One or more departments are invalid or inactive.');
    error.statusCode = 400;
    throw error;
  }

  proposal.title = data.title || proposal.title;
  proposal.description = data.description ?? proposal.description;
  proposal.departmentRefs = targetDepartmentRefs;
  proposal.status = DOCUMENT_STATUS.REVISED;
  proposal.timeline.push(buildTimelineEntry(clusterManager, TIMELINE_ACTIONS.REVISED));
  await proposal.save();

  const departmentAdmins = departments.map((d) => d.departmentAdminRef).filter(Boolean);
  await notifyMany(departmentAdmins, {
    type: 'work_proposal_resubmitted',
    title: 'Revised Work Proposal',
    message: `A revised work proposal has been resubmitted to your department.`,
    documentType: 'WorkProposal',
    documentId: proposal._id,
    actionType: 'Revised',
  });

  emitDashboardRefresh(
    [ROLES.DEPARTMENT_ADMIN, ROLES.CLUSTER_MANAGER],
    'workProposal',
    { action: 'resubmitted', id: proposal._id }
  );

  return proposal;
};

const rejectWorkProposal = async (proposalId, note, departmentAdmin) => {
  const proposal = await WorkProposal.findById(proposalId).populate('createdBy', 'name email');
  if (!proposal) {
    const error = new Error('Work proposal not found.');
    error.statusCode = 404;
    throw error;
  }
  if (proposal.status !== DOCUMENT_STATUS.SUBMITTED && proposal.status !== DOCUMENT_STATUS.REVISED) {
    const error = new Error(`Cannot reject a proposal with status: ${proposal.status}`);
    error.statusCode = 400;
    throw error;
  }

  proposal.status = DOCUMENT_STATUS.REJECTED;
  proposal.timeline.push(buildTimelineEntry(departmentAdmin, TIMELINE_ACTIONS.REJECTED, note));
  await proposal.save();

  await createNotification({
    userId: proposal.createdBy._id,
    userEmail: proposal.createdBy.email,
    userName: proposal.createdBy.name,
    type: 'work_proposal_rejected',
    title: 'Work Proposal Rejected',
    message: `Your work proposal has been rejected. Reason: ${note}`,
    documentType: 'WorkProposal',
    documentId: proposal._id,
    actionType: 'Rejected',
    note,
  });

  emitDashboardRefresh(
    [ROLES.CLUSTER_MANAGER, ROLES.DEPARTMENT_ADMIN],
    'workProposal',
    { action: 'rejected', id: proposal._id }
  );

  return proposal;
};

module.exports = { listWorkProposals, getWorkProposalById, createWorkProposal, resubmitWorkProposal, rejectWorkProposal };
