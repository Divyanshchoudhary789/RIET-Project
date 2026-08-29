const Assessment = require('./assessment.model');
const WorkProposal = require('../proposals/workProposal.model');
const User = require('../users/user.model');
const { buildTimelineEntry } = require('../../utils/timeline');
const { notifyMany, emitDashboardRefresh } = require('../notifications/notification.service');
const { DOCUMENT_STATUS, TIMELINE_ACTIONS, ROLES } = require('../../config/constants');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { applyAtomicTransition, throwTransitionConflict } = require('../../utils/atomicTransition');

const buildFilter = (user, query) => {
  const filter = {};
  if (user.role === ROLES.DEPARTMENT_ADMIN) {
    filter.departmentRef = user.scopeRef;
  } else {
    if (query.departmentRef) filter.departmentRef = query.departmentRef;
  }
  if (query.status) filter.status = query.status;
  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ feasibilityNotes: regex }, { recommendedAction: regex }, { technicalRemarks: regex }];
  }
  return filter;
};

const listAssessments = async (user, query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = buildFilter(user, query);
  const [assessments, total] = await Promise.all([
    Assessment.find(filter)
      .populate({ path: 'workProposalRef', populate: { path: 'requirementRefs', select: 'items priority campusRef' } })
      .populate('departmentRef', 'name code')
      .populate('createdBy', 'name email role')
      .populate({ path: 'timeline.actor', select: 'name email role' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Assessment.countDocuments(filter),
  ]);
  return { assessments, meta: buildPaginationMeta(page, limit, total) };
};

const getAssessmentById = async (assessmentId, user) => {
  const assessment = await Assessment.findById(assessmentId)
    .populate({
      path: 'workProposalRef',
      populate: [
        { path: 'requirementRefs', populate: { path: 'campusRef', select: 'name code' } },
        { path: 'departmentRefs', select: 'name code' },
        { path: 'items.sourceRequirementRef', select: 'title campusRef', populate: { path: 'campusRef', select: 'name code' } },
        { path: 'items.departmentRef', select: 'name code' },
      ],
    })
    .populate('departmentRef', 'name code')
    .populate('createdBy', 'name email role')
    .populate({ path: 'items.sourceRequirementRef', select: 'title campusRef', populate: { path: 'campusRef', select: 'name code' } })
    .populate({ path: 'timeline.actor', select: 'name email role' })
    .populate('notesheetRef', 'status revisionNumber');
  if (!assessment) {
    const error = new Error('Assessment not found.');
    error.statusCode = 404;
    throw error;
  }
  if (user.role === ROLES.DEPARTMENT_ADMIN && assessment.departmentRef._id.toString() !== user.scopeRef.toString()) {
    const error = new Error('You can only access assessments from your own department.');
    error.statusCode = 403;
    throw error;
  }
  return assessment;
};

const createAssessment = async (data, departmentAdmin) => {
  const proposal = await WorkProposal.findById(data.workProposalRef);
  if (!proposal) {
    const error = new Error('Work proposal not found.');
    error.statusCode = 404;
    throw error;
  }
  const reviewable = [DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.REVISED, DOCUMENT_STATUS.FORWARDED];
  if (!reviewable.includes(proposal.status)) {
    const error = new Error('Work proposal is not in a reviewable state.');
    error.statusCode = 400;
    throw error;
  }
  const deptId = departmentAdmin.scopeRef.toString();
  const isAssigned = proposal.departmentRefs.map((d) => d.toString()).includes(deptId);
  if (!isAssigned) {
    const error = new Error('This work proposal is not assigned to your department.');
    error.statusCode = 403;
    throw error;
  }

  const existing = await Assessment.findOne({ workProposalRef: data.workProposalRef, departmentRef: departmentAdmin.scopeRef });
  if (existing) {
    const error = new Error('An assessment for your department already exists on this work proposal.');
    error.statusCode = 409;
    throw error;
  }

  // Seed the department's item snapshot from the proposal, unless the admin
  // submitted their own edited set.
  const proposalItemsForDept = proposal.items
    .filter((i) => i.departmentRef.toString() === deptId)
    .map((i) => ({
      sourceRequirementRef: i.sourceRequirementRef,
      sourceItemId: i.sourceItemId,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      price: i.price,
      description: i.description,
    }));
  const items = Array.isArray(data.items) && data.items.length ? data.items : proposalItemsForDept;
  const itemsEdited = Array.isArray(data.items) && data.items.length > 0;

  let assessment;
  try {
    assessment = await Assessment.create({
      workProposalRef: data.workProposalRef,
      departmentRef: departmentAdmin.scopeRef,
      createdBy: departmentAdmin._id,
      feasibilityNotes: data.feasibilityNotes,
      estimatedCost: data.estimatedCost,
      technicalRemarks: data.technicalRemarks || '',
      recommendedAction: 'approve',
      items,
      itemsEdited,
      status: DOCUMENT_STATUS.SUBMITTED,
      timeline: [buildTimelineEntry(departmentAdmin, TIMELINE_ACTIONS.SUBMITTED, data.note || '')],
    });
  } catch (err) {
    if (err.code === 11000) {
      const error = new Error('An assessment for your department already exists on this work proposal.');
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }

  // Track the fan-out on the proposal; advance status only once every assigned
  // department has produced an assessment.
  await WorkProposal.updateOne(
    { _id: proposal._id },
    { $addToSet: { assessmentRefs: assessment._id } }
  );
  const fresh = await WorkProposal.findById(proposal._id).select('departmentRefs assessmentRefs status');
  const assessedDeptIds = await Assessment.find({ _id: { $in: fresh.assessmentRefs } }).distinct('departmentRef');
  const allAssessed = fresh.departmentRefs.every((d) =>
    assessedDeptIds.map((x) => x.toString()).includes(d.toString())
  );
  if (allAssessed && fresh.status !== DOCUMENT_STATUS.FORWARDED) {
    await WorkProposal.updateOne(
      { _id: proposal._id },
      {
        $set: { status: DOCUMENT_STATUS.FORWARDED },
        $push: { timeline: buildTimelineEntry(departmentAdmin, TIMELINE_ACTIONS.FORWARDED, 'All departments assessed') },
      }
    );
  }

  const directors = await User.find({ role: ROLES.DIRECTOR, isActive: true });
  await notifyMany(directors, {
    type: 'assessment_submitted',
    title: 'New Assessment Submitted',
    message: `An assessment has been submitted by ${departmentAdmin.name} and is awaiting your review.`,
    documentType: 'Assessment',
    documentId: assessment._id,
    actionType: 'Submitted',
  });

  emitDashboardRefresh(
    [ROLES.DIRECTOR, ROLES.DEPARTMENT_ADMIN, ROLES.CLUSTER_MANAGER],
    'assessment',
    { action: 'created', id: assessment._id }
  );

  return assessment;
};

const resubmitAssessment = async (assessmentId, data, departmentAdmin) => {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) {
    const error = new Error('Assessment not found.');
    error.statusCode = 404;
    throw error;
  }
  if (assessment.status !== DOCUMENT_STATUS.REJECTED) {
    const error = new Error('Only rejected assessments can be resubmitted.');
    error.statusCode = 400;
    throw error;
  }
  if (assessment.departmentRef.toString() !== departmentAdmin.scopeRef.toString()) {
    const error = new Error('You can only resubmit assessments from your own department.');
    error.statusCode = 403;
    throw error;
  }

  assessment.feasibilityNotes = data.feasibilityNotes || assessment.feasibilityNotes;
  assessment.estimatedCost = data.estimatedCost ?? assessment.estimatedCost;
  assessment.technicalRemarks = data.technicalRemarks ?? assessment.technicalRemarks;
  if (Array.isArray(data.items) && data.items.length) {
    assessment.items = data.items;
    assessment.itemsEdited = true;
  }
  assessment.status = DOCUMENT_STATUS.REVISED;
  assessment.timeline.push(buildTimelineEntry(departmentAdmin, TIMELINE_ACTIONS.REVISED, data.note || ''));
  await assessment.save();

  const directors = await User.find({ role: ROLES.DIRECTOR, isActive: true });
  await notifyMany(directors, {
    type: 'assessment_resubmitted',
    title: 'Assessment Resubmitted',
    message: `A revised assessment has been submitted by ${departmentAdmin.name} and is awaiting your review.`,
    documentType: 'Assessment',
    documentId: assessment._id,
    actionType: 'Revised',
  });

  emitDashboardRefresh(
    [ROLES.DIRECTOR, ROLES.DEPARTMENT_ADMIN],
    'assessment',
    { action: 'resubmitted', id: assessment._id }
  );

  return assessment;
};

const forwardAssessmentToPO = async (assessmentId, note, director) => {
  const assessment = await applyAtomicTransition(
    Assessment,
    assessmentId,
    [DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.REVISED],
    {
      $set: { status: DOCUMENT_STATUS.FORWARDED },
      $push: { timeline: buildTimelineEntry(director, TIMELINE_ACTIONS.FORWARDED, note || 'Forwarded to PO Office') },
    },
    { path: 'createdBy', select: 'name email' }
  );

  if (!assessment) {
    await throwTransitionConflict(
      Assessment,
      assessmentId,
      'Assessment not found.',
      'This assessment is no longer pending review — it may have already been processed.'
    );
  }

  const poUsers = await User.find({ role: ROLES.PO_OFFICE, isActive: true });
  await notifyMany(poUsers, {
    type: 'assessment_forwarded_to_po',
    title: 'Assessment Forwarded to PO Office',
    message: `An assessment has been approved by ${director.name} and requires vendor quotations.`,
    documentType: 'Assessment',
    documentId: assessment._id,
    actionType: 'Forwarded',
  });

  emitDashboardRefresh(
    [ROLES.PO_OFFICE, ROLES.DIRECTOR],
    'assessment',
    { action: 'forwarded', id: assessment._id }
  );

  return assessment;
};

module.exports = {
  listAssessments,
  getAssessmentById,
  createAssessment,
  resubmitAssessment,
  forwardAssessmentToPO,
};
