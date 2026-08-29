const Notesheet = require('./notesheet.model');
const Assessment = require('../assessments/assessment.model');
const User = require('../users/user.model');
const { buildTimelineEntry } = require('../../utils/timeline');
const { notifyMany, emitDashboardRefresh } = require('../notifications/notification.service');
const { DOCUMENT_STATUS, TIMELINE_ACTIONS, ROLES } = require('../../config/constants');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

const listNotesheets = async (user, query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = {};
  if (user.role === ROLES.PO_OFFICE) filter.createdBy = user._id;
  if (query.status) filter.status = query.status;
  if (query.assessmentRef) filter.assessmentRef = query.assessmentRef;
  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ remarks: regex }];
  }

  const [notesheets, total] = await Promise.all([
    Notesheet.find(filter)
      .populate({ path: 'assessmentRef', populate: { path: 'workProposalRef', select: 'title' } })
      .populate('createdBy', 'name email role')
      .populate({ path: 'timeline.actor', select: 'name email role' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notesheet.countDocuments(filter),
  ]);
  return { notesheets, meta: buildPaginationMeta(page, limit, total) };
};

const getNotesheetById = async (notesheetId) => {
  const notesheet = await Notesheet.findById(notesheetId)
    .populate({
      path: 'assessmentRef',
      populate: [
        { path: 'workProposalRef', select: 'title description requirementRefs' },
        { path: 'departmentRef', select: 'name code' },
      ],
    })
    .populate('createdBy', 'name email role')
    .populate({ path: 'timeline.actor', select: 'name email role' })
    .populate('memoRef', 'status summary');
  if (!notesheet) {
    const error = new Error('Notesheet not found.');
    error.statusCode = 404;
    throw error;
  }
  return notesheet;
};

const createNotesheet = async (data, poUser) => {
  const assessment = await Assessment.findById(data.assessmentRef);
  if (!assessment) {
    const error = new Error('Assessment not found.');
    error.statusCode = 404;
    throw error;
  }
  if (assessment.status !== DOCUMENT_STATUS.FORWARDED) {
    const error = new Error('Assessment has not been forwarded to the PO Office yet.');
    error.statusCode = 400;
    throw error;
  }

  const activeNotesheet = await Notesheet.findOne({
    assessmentRef: data.assessmentRef,
    status: { $in: [DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.FORWARDED, DOCUMENT_STATUS.APPROVED] },
  });
  if (activeNotesheet) {
    const error = new Error('An active notesheet already exists for this assessment.');
    error.statusCode = 409;
    throw error;
  }

  const latestNotesheet = await Notesheet.findOne({ assessmentRef: data.assessmentRef }).sort({ revisionNumber: -1 });
  const revisionNumber = latestNotesheet ? latestNotesheet.revisionNumber + 1 : 1;

  const notesheet = await Notesheet.create({
    assessmentRef: data.assessmentRef,
    createdBy: poUser._id,
    quotations: data.quotations,
    remarks: data.remarks || '',
    status: DOCUMENT_STATUS.SUBMITTED,
    revisionNumber,
    timeline: [buildTimelineEntry(poUser, TIMELINE_ACTIONS.SUBMITTED)],
  });

  assessment.notesheetRef = notesheet._id;
  await assessment.save();

  const directors = await User.find({ role: ROLES.DIRECTOR, isActive: true });
  await notifyMany(directors, {
    type: 'notesheet_submitted',
    title: 'Notesheet Submitted for Review',
    message: `A notesheet with vendor quotations has been submitted by ${poUser.name} and requires your review.`,
    documentType: 'Notesheet',
    documentId: notesheet._id,
    actionType: 'Submitted',
  });

  emitDashboardRefresh(
    [ROLES.DIRECTOR, ROLES.PO_OFFICE],
    'notesheet',
    { action: 'created', id: notesheet._id }
  );

  return notesheet;
};

const resubmitNotesheet = async (notesheetId, data, poUser) => {
  const originalNotesheet = await Notesheet.findById(notesheetId);
  if (!originalNotesheet) {
    const error = new Error('Notesheet not found.');
    error.statusCode = 404;
    throw error;
  }
  if (originalNotesheet.status !== DOCUMENT_STATUS.REJECTED) {
    const error = new Error('Only rejected notesheets can be resubmitted.');
    error.statusCode = 400;
    throw error;
  }
  if (originalNotesheet.createdBy.toString() !== poUser._id.toString()) {
    const error = new Error('You can only resubmit notesheets that you created.');
    error.statusCode = 403;
    throw error;
  }

  const newNotesheet = await createNotesheet(
    { assessmentRef: originalNotesheet.assessmentRef.toString(), quotations: data.quotations, remarks: data.remarks || '' },
    poUser
  );
  return newNotesheet;
};

module.exports = { listNotesheets, getNotesheetById, createNotesheet, resubmitNotesheet };
