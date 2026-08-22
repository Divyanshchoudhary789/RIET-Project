const mongoose = require('mongoose');
const PurchaseOrder = require('./purchaseOrder.model');
const Memo = require('../memos/memo.model');
const Requirement = require('../requirements/requirement.model');
const StockItem = require('../stock/stockItem.model');
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
      populate: {
        path: 'workProposalRef',
        populate: { path: 'requirementRefs', select: 'items campusRef', populate: { path: 'campusRef', select: '_id name code' } },
      },
    },
  },
};

/**
 * Marks a PO as received and, atomically within a single DB transaction, closes every
 * linked Requirement and increments campus stock. Wrapped in a transaction because a
 * crash partway through the per-requirement loop would otherwise leave the PO closed
 * with only some requirements/stock updated — a silent partial-fulfillment state.
 */
const markGoodsReceived = async (orderId, note, receivedByUser) => {
  const receivedNote = note || 'Goods received at destination';
  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
      order = await PurchaseOrder.findOneAndUpdate(
        { _id: orderId, status: 'pi_uploaded' },
        {
          $set: { status: 'closed', receivedAt: new Date(), receivedBy: receivedByUser._id },
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

      const requirements = order.memoRef?.notesheetRef?.assessmentRef?.workProposalRef?.requirementRefs || [];
      for (const req of requirements) {
        await Requirement.findByIdAndUpdate(req._id, {
          $set: { status: DOCUMENT_STATUS.CLOSED },
          $push: { timeline: buildTimelineEntry(receivedByUser, TIMELINE_ACTIONS.CLOSED, 'Goods received — requirement fulfilled') },
        }, { session });

        if (req.campusRef?._id) {
          for (const item of req.items || []) {
            await StockItem.findOneAndUpdate(
              { ownerType: 'campus', ownerRef: req.campusRef._id, itemName: item.name },
              { $inc: { quantityAvailable: item.quantity }, $set: { updatedBy: receivedByUser._id } },
              {
                upsert: true, new: true, session,
                setOnInsert: { ownerModel: 'Campus', category: 'Received', unit: item.unit || 'units', quantityReserved: 0, reorderThreshold: 0 },
              }
            );
          }
        }
      }
    });
  } finally {
    await session.endSession();
  }

  // Notifications are best-effort and happen outside the transaction.
  const requirements = order.memoRef?.notesheetRef?.assessmentRef?.workProposalRef?.requirementRefs || [];
  const campusIds = [...new Set(requirements.map((r) => r.campusRef?._id?.toString()).filter(Boolean))];
  for (const campusId of campusIds) {
    const centerHeads = await User.find({ role: ROLES.CENTER_HEAD, scopeRef: campusId, isActive: true });
    await notifyMany(centerHeads, {
      type: 'goods_received',
      title: 'Goods Received',
      message: 'Your requirement has been fulfilled. Goods have been received and stock has been updated.',
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

  return order;
};

module.exports = { listPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, uploadPerformaInvoice, markGoodsReceived };
