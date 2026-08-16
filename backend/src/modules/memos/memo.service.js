const Memo = require('./memo.model');
const Notesheet = require('../notesheets/notesheet.model');
const User = require('../users/user.model');
const { buildTimelineEntry } = require('../../utils/timeline');
const { createNotification, notifyMany } = require('../notifications/notification.service');
const { DOCUMENT_STATUS, TIMELINE_ACTIONS, ROLES } = require('../../config/constants');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

const listMemos = async (user, query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = {};
  if (query.status) filter.status = query.status;

  const [memos, total] = await Promise.all([
    Memo.find(filter)
      .populate({
        path: 'notesheetRef',
        populate: { path: 'assessmentRef', select: 'estimatedCost workProposalRef' },
      })
      .populate('createdBy', 'name email role')
      .populate('decidedBy', 'name email role')
      .populate({ path: 'timeline.actor', select: 'name email role' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Memo.countDocuments(filter),
  ]);

  return { memos, meta: buildPaginationMeta(page, limit, total) };
};

const getMemoById = async (memoId) => {
  const memo = await Memo.findById(memoId)
    .populate({
      path: 'notesheetRef',
      populate: {
        path: 'assessmentRef',
        populate: {
          path: 'workProposalRef',
          populate: { path: 'requirementRefs', select: 'items priority campusRef' },
        },
      },
    })
    .populate('createdBy', 'name email role')
    .populate('decidedBy', 'name email role')
    .populate({ path: 'timeline.actor', select: 'name email role' })
    .populate('purchaseOrderRef', 'poNumber status totalAmount');

  if (!memo) {
    const error = new Error('Memo not found.');
    error.statusCode = 404;
    throw error;
  }

  return memo;
};

/**
 * Internal helper — creates a memo from a notesheet.
 * Accepts notesheets in SUBMITTED, REVISED, or FORWARDED status.
 * FORWARDED is allowed when the Director is creating a revised memo after Chairperson rejection
 * (the notesheet's status is already FORWARDED from the original memo, but that memo was rejected).
 */
const _createMemo = async (data, director) => {
  const notesheet = await Notesheet.findById(data.notesheetRef);

  if (!notesheet) {
    const error = new Error('Notesheet not found.');
    error.statusCode = 404;
    throw error;
  }

  const allowedNotesheetStatuses = [
    DOCUMENT_STATUS.SUBMITTED,
    DOCUMENT_STATUS.REVISED,
    DOCUMENT_STATUS.FORWARDED,
  ];

  if (!allowedNotesheetStatuses.includes(notesheet.status)) {
    const error = new Error(
      `Cannot create a memo from a notesheet with status: ${notesheet.status}`
    );
    error.statusCode = 400;
    throw error;
  }

  // Prevent creating a duplicate active memo for the same notesheet
  const existingActiveMemo = await Memo.findOne({
    notesheetRef: data.notesheetRef,
    status: { $in: [DOCUMENT_STATUS.SUBMITTED, DOCUMENT_STATUS.APPROVED] },
  });

  if (existingActiveMemo) {
    const error = new Error('An active memo already exists for this notesheet.');
    error.statusCode = 409;
    throw error;
  }

  const latestMemo = await Memo.findOne({ notesheetRef: data.notesheetRef })
    .sort({ revisionNumber: -1 });
  const revisionNumber = latestMemo ? latestMemo.revisionNumber + 1 : 1;

  const memo = await Memo.create({
    notesheetRef: data.notesheetRef,
    createdBy: director._id,
    summary: data.summary,
    recommendedVendor: data.recommendedVendor || '',
    status: DOCUMENT_STATUS.SUBMITTED,
    revisionNumber,
    timeline: [buildTimelineEntry(director, TIMELINE_ACTIONS.SUBMITTED)],
  });

  // Mark notesheet as FORWARDED and link this memo
  notesheet.status = DOCUMENT_STATUS.FORWARDED;
  notesheet.memoRef = memo._id;
  notesheet.timeline.push(
    buildTimelineEntry(director, TIMELINE_ACTIONS.FORWARDED, 'Memo created')
  );
  await notesheet.save();

  const chairpersons = await User.find({ role: ROLES.CHAIRPERSON, isActive: true });
  await notifyMany(chairpersons, {
    type: 'memo_pending_approval',
    title: 'Memo Pending Approval',
    message: `A memo has been submitted by ${director.name} and is awaiting your approval.`,
    documentType: 'Memo',
    documentId: memo._id,
    actionType: 'Submitted',
  });

  return memo;
};

// Public alias used by the controller
const createMemo = _createMemo;

/**
 * Director revises and resubmits a rejected memo.
 * Can optionally point to a new notesheet (if PO Office prepared revised quotations).
 * Per PRD: Chairperson rejects → PO Office revises notesheet → Director submits revised memo.
 */
const resubmitMemo = async (memoId, data, director) => {
  const originalMemo = await Memo.findById(memoId);

  if (!originalMemo) {
    const error = new Error('Memo not found.');
    error.statusCode = 404;
    throw error;
  }

  if (originalMemo.status !== DOCUMENT_STATUS.REJECTED) {
    const error = new Error('Only rejected memos can be resubmitted.');
    error.statusCode = 400;
    throw error;
  }

  if (originalMemo.createdBy.toString() !== director._id.toString()) {
    const error = new Error('You can only resubmit memos that you created.');
    error.statusCode = 403;
    throw error;
  }

  // Director can point to a new notesheet with updated quotations,
  // or reuse the original notesheet (which is in FORWARDED status and has the rejected memo linked)
  const notesheetId = data.notesheetRef || originalMemo.notesheetRef.toString();

  const revisedMemo = await _createMemo(
    {
      notesheetRef: notesheetId,
      summary: data.summary || originalMemo.summary,
      recommendedVendor: data.recommendedVendor ?? originalMemo.recommendedVendor,
    },
    director
  );

  return revisedMemo;
};

const decideMemo = async (memoId, action, note, chairperson) => {
  const memo = await Memo.findById(memoId)
    .populate('createdBy', 'name email')
    .populate({
      path: 'notesheetRef',
      populate: { path: 'createdBy', select: 'name email _id' },
    });

  if (!memo) {
    const error = new Error('Memo not found.');
    error.statusCode = 404;
    throw error;
  }

  if (
    memo.status !== DOCUMENT_STATUS.SUBMITTED &&
    memo.status !== DOCUMENT_STATUS.REVISED
  ) {
    const error = new Error(`Cannot review a memo with status: ${memo.status}`);
    error.statusCode = 400;
    throw error;
  }

  if (action === 'approve') {
    memo.status = DOCUMENT_STATUS.APPROVED;
    memo.decisionNote = note || '';
    memo.decidedBy = chairperson._id;
    memo.decidedAt = new Date();
    memo.timeline.push(buildTimelineEntry(chairperson, TIMELINE_ACTIONS.APPROVED, note || ''));

    const accountsUsers = await User.find({ role: ROLES.ACCOUNTS, isActive: true });
    await notifyMany(accountsUsers, {
      type: 'memo_approved_for_po',
      title: 'Memo Approved — Issue Purchase Order',
      message: `A memo has been approved by ${chairperson.name}. Please issue the Purchase Order.`,
      documentType: 'Memo',
      documentId: memo._id,
      actionType: 'Approved',
    });

    if (memo.createdBy?._id) {
      await createNotification({
        userId: memo.createdBy._id,
        userEmail: memo.createdBy.email,
        userName: memo.createdBy.name,
        type: 'memo_approved',
        title: 'Memo Approved by Chairperson',
        message: `Your memo has been approved by ${chairperson.name}.`,
        documentType: 'Memo',
        documentId: memo._id,
        actionType: 'Approved',
      });
    }
  } else {
    memo.status = DOCUMENT_STATUS.REJECTED;
    memo.decisionNote = note;
    memo.decidedBy = chairperson._id;
    memo.decidedAt = new Date();
    memo.timeline.push(buildTimelineEntry(chairperson, TIMELINE_ACTIONS.REJECTED, note));

    // Notify both Director (memo creator) and PO Office (notesheet creator) — PRD requirement
    const recipientIds = new Set();
    const recipients = [];

    if (memo.createdBy?._id) {
      const key = memo.createdBy._id.toString();
      if (!recipientIds.has(key)) {
        recipientIds.add(key);
        recipients.push(memo.createdBy);
      }
    }

    if (memo.notesheetRef?.createdBy?._id) {
      const key = memo.notesheetRef.createdBy._id.toString();
      if (!recipientIds.has(key)) {
        recipientIds.add(key);
        recipients.push(memo.notesheetRef.createdBy);
      }
    }

    for (const recipient of recipients) {
      await createNotification({
        userId: recipient._id,
        userEmail: recipient.email,
        userName: recipient.name,
        type: 'memo_rejected',
        title: 'Memo Rejected by Chairperson',
        message: `A memo has been rejected by ${chairperson.name}. Reason: ${note}. Please revise the notesheet and quotations.`,
        documentType: 'Memo',
        documentId: memo._id,
        actionType: 'Rejected',
        note,
      });
    }
  }

  await memo.save();
  return memo;
};

module.exports = { listMemos, getMemoById, createMemo, resubmitMemo, decideMemo };
