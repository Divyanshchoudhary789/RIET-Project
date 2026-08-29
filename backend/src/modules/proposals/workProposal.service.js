const mongoose = require('mongoose');
const WorkProposal = require('./workProposal.model');
const Requirement = require('../requirements/requirement.model');
const Department = require('../departments/department.model');
const Assessment = require('../assessments/assessment.model');
const { buildTimelineEntry } = require('../../utils/timeline');
const { notifyMany, emitDashboardRefresh } = require('../notifications/notification.service');
const { DOCUMENT_STATUS, TIMELINE_ACTIONS, ROLES } = require('../../config/constants');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v);
const idStr = (v) => (v && v._id ? v._id.toString() : v?.toString());
const uniq = (arr) => [...new Set(arr.filter(Boolean).map((v) => v.toString()))];

const buildFilter = (user, query) => {
  const filter = {};
  if (user.role === ROLES.DEPARTMENT_ADMIN) {
    filter.departmentRefs = user.scopeRef;
  } else if (query.departmentRef) {
    filter.departmentRefs = query.departmentRef;
  }
  if (query.campusRef && isObjectId(query.campusRef)) {
    filter.campusRefs = query.campusRef;
  }
  if (query.status) filter.status = query.status;
  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: regex }, { description: regex }];
  }
  return filter;
};

/**
 * Loads the source requirements for a set of proposal items, validates them,
 * and returns the derived denormalized metadata.
 */
const resolveProposalMeta = async (items, { requireSubmittable = false } = {}) => {
  const requirementIds = uniq(items.map((i) => idStr(i.sourceRequirementRef)));
  const departmentIds = uniq(items.map((i) => idStr(i.departmentRef)));

  const requirements = await Requirement.find({ _id: { $in: requirementIds } });
  if (requirements.length !== requirementIds.length) {
    const error = new Error('One or more source requirements could not be found.');
    error.statusCode = 400;
    throw error;
  }
  if (requireSubmittable) {
    const bad = requirements.find(
      (r) => ![DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.REVISED].includes(r.status)
    );
    if (bad) {
      const error = new Error('One or more requirements are not in a submittable state.');
      error.statusCode = 400;
      throw error;
    }
  }

  const departments = await Department.find({ _id: { $in: departmentIds }, isActive: true })
    .populate('departmentAdminRef', 'name email');
  if (departments.length !== departmentIds.length) {
    const error = new Error('One or more departments are invalid or inactive.');
    error.statusCode = 400;
    throw error;
  }

  const campusRefs = uniq(requirements.map((r) => idStr(r.campusRef)));

  return { requirements, departments, requirementIds, departmentIds, campusRefs };
};

const populateProposal = (q) =>
  q
    .populate({ path: 'requirementRefs', populate: { path: 'campusRef', select: 'name code' } })
    .populate('departmentRefs', 'name code')
    .populate('campusRefs', 'name code')
    .populate('items.departmentRef', 'name code')
    .populate({ path: 'items.sourceRequirementRef', select: 'title campusRef', populate: { path: 'campusRef', select: 'name code' } })
    .populate('createdBy', 'name email role')
    .populate({ path: 'timeline.actor', select: 'name email role' })
    .populate('assessmentRefs', 'status departmentRef estimatedCost');

const listWorkProposals = async (user, query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = buildFilter(user, query);
  const [proposals, total] = await Promise.all([
    populateProposal(WorkProposal.find(filter)).sort({ createdAt: -1 }).skip(skip).limit(limit),
    WorkProposal.countDocuments(filter),
  ]);
  return { proposals, meta: buildPaginationMeta(page, limit, total) };
};

const getWorkProposalById = async (proposalId, user) => {
  const proposal = await populateProposal(WorkProposal.findById(proposalId));
  if (!proposal) {
    const error = new Error('Work proposal not found.');
    error.statusCode = 404;
    throw error;
  }
  if (user.role === ROLES.DEPARTMENT_ADMIN) {
    const isAssigned = proposal.departmentRefs.some((d) => d._id.toString() === user.scopeRef.toString());
    if (!isAssigned) {
      const error = new Error('You can only access work proposals assigned to your own department.');
      error.statusCode = 403;
      throw error;
    }
  }
  return proposal;
};

const notifyDepartmentAdmins = async (departments, notificationData) => {
  const admins = departments.map((d) => d.departmentAdminRef).filter(Boolean);
  await notifyMany(admins, notificationData);
};

const createWorkProposal = async (data, clusterManager) => {
  const { requirements, departments, requirementIds, departmentIds, campusRefs } =
    await resolveProposalMeta(data.items, { requireSubmittable: true });

  const timeline = [buildTimelineEntry(clusterManager, TIMELINE_ACTIONS.SUBMITTED, data.note || '')];

  const proposal = await WorkProposal.create({
    requirementRefs: requirementIds,
    departmentRefs: departmentIds,
    campusRefs,
    items: data.items,
    createdBy: clusterManager._id,
    title: data.title,
    description: data.description || '',
    status: DOCUMENT_STATUS.SUBMITTED,
    timeline,
  });

  const forwardEntry = buildTimelineEntry(clusterManager, TIMELINE_ACTIONS.FORWARDED, 'Included in Work Proposal');
  await Requirement.updateMany(
    { _id: { $in: requirementIds } },
    { $set: { status: DOCUMENT_STATUS.FORWARDED, workProposalRef: proposal._id }, $push: { timeline: forwardEntry } }
  );

  await notifyDepartmentAdmins(departments, {
    type: 'work_proposal_received',
    title: 'New Work Proposal Assigned',
    message: 'A new work proposal has been assigned to your department and requires your assessment.',
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

/**
 * Whether the proposal can still be structurally edited by the Cluster Manager.
 * Only before any department has started an assessment on it.
 */
const proposalIsEditable = async (proposal) => {
  if (![DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.REVISED].includes(proposal.status)) {
    return false;
  }
  return !(proposal.assessmentRefs && proposal.assessmentRefs.length > 0);
};

const applyProposalEdit = async (proposal, data, clusterManager, { resubmit = false } = {}) => {
  if (proposal.createdBy.toString() !== clusterManager._id.toString()) {
    const error = new Error('You can only edit proposals that you created.');
    error.statusCode = 403;
    throw error;
  }

  if (resubmit) {
    if (proposal.status !== DOCUMENT_STATUS.REJECTED) {
      const error = new Error('Only rejected work proposals can be resubmitted.');
      error.statusCode = 400;
      throw error;
    }
  } else if (!(await proposalIsEditable(proposal))) {
    const error = new Error('This proposal can no longer be edited — an assessment has already been forwarded.');
    error.statusCode = 409;
    throw error;
  }

  const prevDepartmentIds = uniq(proposal.departmentRefs.map(idStr));

  if (data.items) {
    const { departments, requirementIds, departmentIds, campusRefs } = await resolveProposalMeta(data.items);
    proposal.items = data.items;
    proposal.requirementRefs = requirementIds;
    proposal.departmentRefs = departmentIds;
    proposal.campusRefs = campusRefs;

    const addedDeptIds = departmentIds.filter((d) => !prevDepartmentIds.includes(d));
    const removedDeptIds = prevDepartmentIds.filter((d) => !departmentIds.includes(d));

    // Notify newly added department admins.
    if (addedDeptIds.length) {
      const added = departments.filter((d) => addedDeptIds.includes(d._id.toString()));
      await notifyDepartmentAdmins(added, {
        type: 'work_proposal_received',
        title: 'Work Proposal Assigned',
        message: 'A revised work proposal now includes your department and requires your assessment.',
        documentType: 'WorkProposal',
        documentId: proposal._id,
        actionType: 'Revised',
      });
    }

    // Close in-progress assessments for departments no longer on the proposal.
    if (removedDeptIds.length && proposal.assessmentRefs?.length) {
      await Assessment.updateMany(
        {
          _id: { $in: proposal.assessmentRefs },
          departmentRef: { $in: removedDeptIds },
          status: { $in: [DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.REVISED] },
        },
        {
          $set: { status: DOCUMENT_STATUS.CLOSED },
          $push: {
            timeline: buildTimelineEntry(clusterManager, TIMELINE_ACTIONS.CLOSED, 'Department removed from the work proposal'),
          },
        }
      );
    }

    // Refresh snapshots of still-open assessments whose admin has not started editing.
    const openAssessments = await Assessment.find({
      _id: { $in: proposal.assessmentRefs },
      status: { $in: [DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.REVISED] },
      itemsEdited: { $ne: true },
    });
    for (const a of openAssessments) {
      a.items = data.items
        .filter((i) => idStr(i.departmentRef) === a.departmentRef.toString())
        .map(({ sourceRequirementRef, sourceItemId, name, quantity, unit, price, description }) => ({
          sourceRequirementRef, sourceItemId, name, quantity, unit, price, description,
        }));
      await a.save();
    }
  }

  if (data.title !== undefined) proposal.title = data.title || proposal.title;
  if (data.description !== undefined) proposal.description = data.description;

  proposal.status = DOCUMENT_STATUS.REVISED;
  proposal.timeline.push(buildTimelineEntry(clusterManager, TIMELINE_ACTIONS.REVISED, data.note || ''));
  await proposal.save();

  emitDashboardRefresh(
    [ROLES.DEPARTMENT_ADMIN, ROLES.CLUSTER_MANAGER, ROLES.CENTER_HEAD],
    'workProposal',
    { action: resubmit ? 'resubmitted' : 'updated', id: proposal._id }
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
  return applyProposalEdit(proposal, data, clusterManager, { resubmit: true });
};

module.exports = {
  listWorkProposals,
  getWorkProposalById,
  createWorkProposal,
  resubmitWorkProposal,
};
