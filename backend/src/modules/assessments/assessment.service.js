const Assessment = require('./assessment.model');
const WorkProposal = require('../proposals/workProposal.model');
const User = require('../users/user.model');
const { buildTimelineEntry } = require('../../utils/timeline');
const { createNotification, notifyMany } = require('../notifications/notification.service');
const { DOCUMENT_STATUS, TIMELINE_ACTIONS, ROLES } = require('../../config/constants');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

const buildFilter = (user, query) => {
  const filter = {};

  // Department admin is always scoped to their own department — cannot be overridden by query
  if (user.role === ROLES.DEPARTMENT_ADMIN) {
    filter.departmentRef = user.scopeRef;
  } else {
    // Other roles can optionally filter by department
    if (query.departmentRef) filter.departmentRef = query.departmentRef;
  }

  if (query.status) filter.status = query.status;

  return filter;
};

const listAssessments = async (user, query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = buildFilter(user, query);

  const [assessments, total] = await Promise.all([
    Assessment.find(filter)
      .populate({
        path: 'workProposalRef',
        populate: { path: 'requirementRefs', select: 'items priority campusRef' },
      })
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

const getAssessmentById = async (assessmentId) => {
  const assessment = await Assessment.findById(assessmentId)
    .populate({
      path: 'workProposalRef',
      populate: [
        { path: 'requirementRefs', populate: { path: 'campusRef', select: 'name code' } },
        { path: 'departmentRefs', select: 'name code' },
      ],
    })
    .populate('departmentRef', 'name code')
    .populate('createdBy', 'name email role')
    .populate({ path: 'timeline.actor', select: 'name email role' })
    .populate('notesheetRef', 'status revisionNumber');

  if (!assessment) {
    const error = new Error('Assessment not found.');
    error.statusCode = 404;
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

  if (
    proposal.status !== DOCUMENT_STATUS.SUBMITTED &&
    proposal.status !== DOCUMENT_STATUS.REVISED
  ) {
    const error = new Error('Work proposal is not in a reviewable state.');
    error.statusCode = 400;
    throw error;
  }

  const isAssigned = proposal.departmentRefs
    .map((d) => d.toString())
    .includes(departmentAdmin.scopeRef.toString());

  if (!isAssigned) {
    const error = new Error('This work proposal is not assigned to your department.');
    error.statusCode = 403;
    throw error;
  }

  const assessment = await Assessment.create({
    workProposalRef: data.workProposalRef,
    departmentRef: departmentAdmin.scopeRef,
    createdBy: departmentAdmin._id,
    feasibilityNotes: data.feasibilityNotes,
    estimatedCost: data.estimatedCost,
    technicalRemarks: data.technicalRemarks || '',
    recommendedAction: data.recommendedAction || '',
    status: DOCUMENT_STATUS.SUBMITTED,
    timeline: [buildTimelineEntry(departmentAdmin, TIMELINE_ACTIONS.SUBMITTED)],
  });

  proposal.status = DOCUMENT_STATUS.FORWARDED;
  proposal.assessmentRef = assessment._id;
  proposal.timeline.push(
    buildTimelineEntry(departmentAdmin, TIMELINE_ACTIONS.FORWARDED, 'Assessment created')
  );
  await proposal.save();

  const directors = await User.find({ role: ROLES.DIRECTOR, isActive: true });
  await notifyMany(directors, {
    type: 'assessment_submitted',
    title: 'New Assessment Submitted',
    message: `An assessment has been submitted by ${departmentAdmin.name} and is awaiting your review.`,
    documentType: 'Assessment',
    documentId: assessment._id,
    actionType: 'Submitted',
  });

  return assessment;
};

/**
 * Department Admin revises and resubmits a rejected assessment.
 */
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
  assessment.recommendedAction = data.recommendedAction ?? assessment.recommendedAction;
  assessment.status = DOCUMENT_STATUS.REVISED;
  assessment.timeline.push(buildTimelineEntry(departmentAdmin, TIMELINE_ACTIONS.REVISED));
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

  return assessment;
};

const forwardAssessmentToPO = async (assessmentId, director) => {
  const assessment = await Assessment.findById(assessmentId)
    .populate('createdBy', 'name email');

  if (!assessment) {
    const error = new Error('Assessment not found.');
    error.statusCode = 404;
    throw error;
  }

  if (
    assessment.status !== DOCUMENT_STATUS.SUBMITTED &&
    assessment.status !== DOCUMENT_STATUS.REVISED
  ) {
    const error = new Error(`Cannot forward an assessment with status: ${assessment.status}`);
    error.statusCode = 400;
    throw error;
  }

  assessment.status = DOCUMENT_STATUS.FORWARDED;
  assessment.timeline.push(
    buildTimelineEntry(director, TIMELINE_ACTIONS.FORWARDED, 'Forwarded to PO Office')
  );
  await assessment.save();

  const poUsers = await User.find({ role: ROLES.PO_OFFICE, isActive: true });
  await notifyMany(poUsers, {
    type: 'assessment_forwarded_to_po',
    title: 'Assessment Forwarded to PO Office',
    message: `An assessment has been approved by ${director.name} and requires vendor quotations.`,
    documentType: 'Assessment',
    documentId: assessment._id,
    actionType: 'Forwarded',
  });

  return assessment;
};

const rejectAssessment = async (assessmentId, note, director) => {
  const assessment = await Assessment.findById(assessmentId)
    .populate('createdBy', 'name email');

  if (!assessment) {
    const error = new Error('Assessment not found.');
    error.statusCode = 404;
    throw error;
  }

  if (
    assessment.status !== DOCUMENT_STATUS.SUBMITTED &&
    assessment.status !== DOCUMENT_STATUS.REVISED
  ) {
    const error = new Error(`Cannot reject an assessment with status: ${assessment.status}`);
    error.statusCode = 400;
    throw error;
  }

  assessment.status = DOCUMENT_STATUS.REJECTED;
  assessment.timeline.push(buildTimelineEntry(director, TIMELINE_ACTIONS.REJECTED, note));
  await assessment.save();

  await createNotification({
    userId: assessment.createdBy._id,
    userEmail: assessment.createdBy.email,
    userName: assessment.createdBy.name,
    type: 'assessment_rejected',
    title: 'Assessment Rejected',
    message: `Your assessment has been rejected by ${director.name}. Reason: ${note}`,
    documentType: 'Assessment',
    documentId: assessment._id,
    actionType: 'Rejected',
    note,
  });

  return assessment;
};

module.exports = {
  listAssessments,
  getAssessmentById,
  createAssessment,
  resubmitAssessment,
  forwardAssessmentToPO,
  rejectAssessment,
};
