const mongoose = require('mongoose');
const PurchaseOrder = require('./purchaseOrder.model');
const Memo = require('../memos/memo.model');
const Requirement = require('../requirements/requirement.model');
const WorkProposal = require('../proposals/workProposal.model');
const Assessment = require('../assessments/assessment.model');
const Notesheet = require('../notesheets/notesheet.model');
const StockReceipt = require('../stock/stockReceipt.model');
const { buildTimelineEntry } = require('../../utils/timeline');
const { createNotification, notifyMany, emitDashboardRefresh } = require('../notifications/notification.service');
const { generatePoNumber } = require('../../utils/generatePoNumber');
const { DOCUMENT_STATUS, TIMELINE_ACTIONS, ROLES } = require('../../config/constants');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const User = require('../users/user.model');

const listPurchaseOrders = async (query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  // Support vendor name / PO number search
  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ vendorName: regex }, { poNumber: regex }];
  }
  const [orders, total] = await Promise.all([
    PurchaseOrder.find(filter)
      .populate('memoRef', 'summary status')
      .populate('createdBy', 'name email')
      .populate({ path: 'timeline.actor', select: 'name email role' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    PurchaseOrder.countDocuments(filter),
  ]);
  return { orders, meta: buildPaginationMeta(page, limit, total) };
};

const getPurchaseOrderById = async (orderId) => {
  const order = await PurchaseOrder.findById(orderId)
    .populate({
      path: 'memoRef',
      populate: [
        { path: 'createdBy', select: 'name email role' },
        { path: 'decidedBy', select: 'name email role' },
        {
          path: 'notesheetRef',
          populate: {
            path: 'assessmentRef',
            select: 'estimatedCost feasibilityNotes technicalRemarks recommendedAction workProposalRef',
            populate: {
              path: 'workProposalRef',
              select: 'title requirementRefs',
              populate: {
                path: 'requirementRefs',
                select: 'items campusRef',
                populate: { path: 'campusRef', select: 'name code' },
              },
            },
          },
        },
      ],
    })
    .populate('createdBy', 'name email role')
    .populate('receivedBy', 'name email role')
    .populate({ path: 'timeline.actor', select: 'name email role' });
  if (!order) {
    const error = new Error('Purchase order not found.');
    error.statusCode = 404;
    throw error;
  }
  return order;
};

const createPurchaseOrder = async (data, accountsUser) => {
  const memo = await Memo.findById(data.memoRef).populate('createdBy', 'name email');
  if (!memo) {
    const error = new Error('Memo not found.');
    error.statusCode = 404;
    throw error;
  }
  if (memo.status !== DOCUMENT_STATUS.APPROVED) {
    const error = new Error('Purchase orders can only be created against Chairperson-approved memos.');
    error.statusCode = 400;
    throw error;
  }
  const poNumber = await generatePoNumber();
  let order;
  try {
    // Relies on the unique index on memoRef to atomically prevent two concurrent
    // requests from both creating a PO for the same memo.
    order = await PurchaseOrder.create({
      memoRef: data.memoRef,
      poNumber,
      createdBy: accountsUser._id,
      vendorName: data.vendorName,
      totalAmount: data.totalAmount,
      status: 'issued',
      timeline: [buildTimelineEntry(accountsUser, TIMELINE_ACTIONS.CREATED, 'Purchase Order issued')],
    });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.memoRef) {
      const error = new Error('A Purchase Order already exists for this memo.');
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }

  memo.purchaseOrderRef = order._id;
  await memo.save();

  if (memo.createdBy?._id) {
    await createNotification({
      userId: memo.createdBy._id,
      userEmail: memo.createdBy.email,
      userName: memo.createdBy.name,
      type: 'po_issued',
      title: 'Purchase Order Issued',
      message: `Purchase Order ${poNumber} has been issued by Accounts.`,
      documentType: 'PurchaseOrder',
      documentId: order._id,
      actionType: 'Created',
    });
  }

  emitDashboardRefresh(
    [ROLES.ACCOUNTS, ROLES.DIRECTOR],
    'purchaseOrder',
    { action: 'created', id: order._id }
  );

  return order;
};

const uploadPerformaInvoice = async (orderId, piAttachmentUrl, accountsUser) => {
  const order = await PurchaseOrder.findById(orderId);
  if (!order) {
    const error = new Error('Purchase order not found.');
    error.statusCode = 404;
    throw error;
  }
  if (order.status === 'received' || order.status === 'closed') {
    const error = new Error('Cannot upload a Performa Invoice against a closed or received Purchase Order.');
    error.statusCode = 400;
    throw error;
  }

  order.piAttachmentUrl = piAttachmentUrl;
  order.status = 'pi_uploaded';
  order.timeline.push(buildTimelineEntry(accountsUser, TIMELINE_ACTIONS.FORWARDED, 'Performa Invoice uploaded'));
  await order.save();

  emitDashboardRefresh(ROLES.ACCOUNTS, 'purchaseOrder', { action: 'pi_uploaded', id: order._id });

  return order;
};

const populateGoodsReceiptChain = {
  path: 'memoRef',
  populate: {
    path: 'notesheetRef',
    populate: {
      path: 'assessmentRef',
      select: 'departmentRef items workProposalRef',
      populate: [
        { path: 'departmentRef', select: 'name code' },
        {
          path: 'workProposalRef',
          populate: { path: 'requirementRefs', select: 'items campusRef', populate: { path: 'campusRef', select: '_id name code' } },
        },
      ],
    },
  },
};

/**
 * Returns true if every OTHER assessment branch on the work proposal has already
 * had its purchase order received/closed (or has no PO path yet that matters).
 * The branch identified by `currentAssessmentId` is treated as complete.
 */
const areSiblingBranchesComplete = async (workProposal, currentAssessmentId, session) => {
  const assessmentIds = (workProposal?.assessmentRefs || []).map((a) => a.toString());
  const others = assessmentIds.filter((id) => id !== currentAssessmentId?.toString());
  if (others.length === 0) return true;

  for (const aId of others) {
    const a = await Assessment.findById(aId).select('notesheetRef status').session(session);
    if (!a) continue;
    // A branch still in review with no notesheet yet is definitely not complete.
    if (!a.notesheetRef) return false;
    const ns = await Notesheet.findById(a.notesheetRef).select('memoRef').session(session);
    const memo = ns?.memoRef ? await Memo.findById(ns.memoRef).select('purchaseOrderRef').session(session) : null;
    if (!memo?.purchaseOrderRef) return false;
    const po = await PurchaseOrder.findById(memo.purchaseOrderRef).select('status').session(session);
    if (!po || !['closed', 'received'].includes(po.status)) return false;
  }
  return true;
};

/**
 * Marks a PO as received: closes linked Requirements once all branches are done
 * and creates one pending StockReceipt per destination campus. Stock is NOT auto-incremented —
 * each campus Center Head must enter the goods into stock themselves. Wrapped in
 * a transaction so a mid-loop crash can't leave a half-fulfilled state.
 */
const markGoodsReceived = async (orderId, note, receivedByUser) => {
  const receivedNote = note || 'Goods received at destination';
  const session = await mongoose.startSession();
  let order;
  let createdReceipts = [];

  try {
    await session.withTransaction(async () => {
      createdReceipts = [];
      order = await PurchaseOrder.findOneAndUpdate(
        { _id: orderId, status: 'pi_uploaded' },
        {
          $set: {
            status: 'closed',
            receivedAt: new Date(),
            receivedBy: receivedByUser._id,
            stockEntryStatus: 'pending',
          },
          $push: { timeline: buildTimelineEntry(receivedByUser, TIMELINE_ACTIONS.RECEIVED, receivedNote) },
        },
        { new: true, session }
      ).populate(populateGoodsReceiptChain);

      if (!order) {
        const existing = await PurchaseOrder.findById(orderId).session(session);
        if (!existing) {
          const error = new Error('Purchase order not found.');
          error.statusCode = 404;
          throw error;
        }
        if (existing.status === 'closed') {
          const error = new Error('This purchase order has already been closed.');
          error.statusCode = 400;
          throw error;
        }
        const error = new Error('A Performa Invoice must be uploaded before goods can be marked as received.');
        error.statusCode = 400;
        throw error;
      }

      const assessment = order.memoRef?.notesheetRef?.assessmentRef;
      const departmentRef = assessment?.departmentRef?._id || assessment?.departmentRef || null;
      const departmentName = assessment?.departmentRef?.name || 'Received';
      const workProposal = assessment?.workProposalRef;
      const requirements = workProposal?.requirementRefs || [];
      const reqById = new Map(requirements.map((r) => [r._id.toString(), r]));
      // The items actually procured are the assessment's own (possibly edited) snapshot.
      const assessmentItems = assessment?.items || [];

      // Close linked requirements — but only once every fan-out branch of the
      // proposal has had its goods received (otherwise a multi-department
      // requirement would show "Closed" while another department is still procuring).
      const siblingsComplete = await areSiblingBranchesComplete(workProposal, assessment?._id, session);
      if (siblingsComplete) {
        for (const req of requirements) {
          await Requirement.findByIdAndUpdate(req._id, {
            $set: { status: DOCUMENT_STATUS.CLOSED },
            $push: { timeline: buildTimelineEntry(receivedByUser, TIMELINE_ACTIONS.CLOSED, 'Goods received — requirement fulfilled') },
          }, { session });
        }
        if (workProposal?._id) {
          await WorkProposal.updateOne(
            { _id: workProposal._id },
            { $set: { status: DOCUMENT_STATUS.CLOSED } },
            { session }
          );
        }
      }

      // Group the procured items by their originating campus.
      const byCampus = new Map();
      const pushItem = (campusId, item) => {
        if (!campusId) return;
        const key = campusId.toString();
        if (!byCampus.has(key)) byCampus.set(key, { campusRef: campusId, items: [] });
        byCampus.get(key).items.push(item);
      };

      if (assessmentItems.length) {
        for (const ai of assessmentItems) {
          const srcReq = ai.sourceRequirementRef ? reqById.get(ai.sourceRequirementRef.toString()) : null;
          const campusId = srcReq?.campusRef?._id || requirements[0]?.campusRef?._id;
          pushItem(campusId, {
            sourceItemId: ai.sourceItemId || null,
            name: ai.name,
            quantity: ai.quantity,
            unit: ai.unit || 'units',
            price: ai.price ?? 0,
            category: departmentName,
          });
        }
      } else {
        // Legacy assessments with no snapshot — fall back to the requirement items.
        for (const req of requirements) {
          for (const item of req.items || []) {
            pushItem(req.campusRef?._id, {
              sourceItemId: item._id || null,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit || 'units',
              price: item.price ?? 0,
              category: departmentName,
            });
          }
        }
      }

      for (const { campusRef, items } of byCampus.values()) {
        if (!items.length) continue;
        // Idempotent: a re-run (shouldn't happen — status guard above) upserts.
        const receipt = await StockReceipt.findOneAndUpdate(
          { purchaseOrderRef: order._id, campusRef },
          {
            $setOnInsert: {
              purchaseOrderRef: order._id,
              campusRef,
              departmentRef,
              items,
              status: 'pending',
              createdBy: receivedByUser._id,
            },
          },
          { upsert: true, new: true, session }
        );
        createdReceipts.push(receipt);
      }

      // Nothing to route to a campus — don't leave the PO stuck "pending" forever.
      if (createdReceipts.length === 0) {
        await PurchaseOrder.updateOne(
          { _id: order._id },
          { $set: { stockEntryStatus: 'not_required' } },
          { session }
        );
        order.stockEntryStatus = 'not_required';
      }
    });
  } finally {
    await session.endSession();
  }

  // Notifications are best-effort and happen outside the transaction.
  for (const receipt of createdReceipts) {
    const centerHeads = await User.find({ role: ROLES.CENTER_HEAD, scopeRef: receipt.campusRef, isActive: true });
    await notifyMany(centerHeads, {
      type: 'goods_received_pending_stock',
      title: 'Goods Received — Add to Stock',
      message: `Goods for ${order.poNumber} have been received. Please add the items into your campus stock.`,
      documentType: 'PurchaseOrder',
      documentId: order._id,
      actionType: 'Received',
    });
  }

  emitDashboardRefresh(
    [ROLES.ACCOUNTS, ROLES.CENTER_HEAD, ROLES.DIRECTOR, ROLES.CHAIRPERSON],
    'purchaseOrder',
    { action: 'goods_received', id: order._id }
  );
  emitDashboardRefresh(ROLES.CENTER_HEAD, 'stockReceipt', { action: 'created', id: order._id });

  return order;
};

module.exports = { listPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, uploadPerformaInvoice, markGoodsReceived };
