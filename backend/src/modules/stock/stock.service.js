const mongoose = require('mongoose');
const StockItem = require('./stockItem.model');
const StockReceipt = require('./stockReceipt.model');
const PurchaseOrder = require('../purchaseOrders/purchaseOrder.model');
const User = require('../users/user.model');
const { ROLES } = require('../../config/constants');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');
const { notifyMany, emitDashboardRefresh } = require('../notifications/notification.service');

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v);

/**
 * Builds a MongoDB stock filter based on the requesting user's role and scope.
 *  - center_head: locked to their own campus.
 *  - department_admin: campus-held stock tagged with their department (their
 *    "category"), optionally narrowed to one campus.
 *  - cluster_manager: campus stock only (no head-office / department stock),
 *    optionally narrowed to one campus.
 *  - director / chairperson / accounts: everything, with optional filters.
 */
const buildStockFilter = (user, query) => {
  const { role, scopeRef } = user;

  if (role === ROLES.CENTER_HEAD) {
    return { ownerType: 'campus', ownerRef: scopeRef };
  }

  if (role === ROLES.DEPARTMENT_ADMIN) {
    const filter = { ownerType: 'campus', relatedDepartmentRef: scopeRef };
    if (query.ownerRef && isObjectId(query.ownerRef)) filter.ownerRef = query.ownerRef;
    return filter;
  }

  if (role === ROLES.CLUSTER_MANAGER) {
    const filter = { ownerType: 'campus' };
    if (query.ownerRef && isObjectId(query.ownerRef)) filter.ownerRef = query.ownerRef;
    if (query.category) filter.category = query.category;
    return filter;
  }

  // Org-wide roles
  const filter = {};
  if (query.ownerType) filter.ownerType = query.ownerType;
  if (query.ownerRef && isObjectId(query.ownerRef)) filter.ownerRef = query.ownerRef;
  if (query.category) filter.category = query.category;
  return filter;
};

const listStockItems = async (user, query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = buildStockFilter(user, query);

  if (query.search) {
    const regex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ itemName: regex }, { category: regex }];
  }

  const [items, total] = await Promise.all([
    StockItem.find(filter)
      .populate('ownerRef', 'name code')
      .populate('relatedDepartmentRef', 'name code')
      .populate('updatedBy', 'name email')
      .sort({ itemName: 1 })
      .skip(skip)
      .limit(limit),
    StockItem.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(page, limit, total) };
};

const getStockItemById = async (itemId, user) => {
  const item = await StockItem.findById(itemId)
    .populate('ownerRef', 'name code')
    .populate('relatedDepartmentRef', 'name code')
    .populate('updatedBy', 'name email');

  if (!item) {
    const error = new Error('Stock item not found.');
    error.statusCode = 404;
    throw error;
  }

  assertStockScope(item, user);
  return item;
};

/** Throws 403 if a scoped role tries to touch a stock item outside its scope. */
const assertStockScope = (item, user) => {
  const { role, scopeRef } = user;
  const ownerId = item.ownerRef?._id?.toString() || item.ownerRef?.toString();

  if (role === ROLES.CENTER_HEAD && (item.ownerType !== 'campus' || ownerId !== scopeRef.toString())) {
    const error = new Error('You can only access stock items for your own campus.');
    error.statusCode = 403;
    throw error;
  }
  if (role === ROLES.DEPARTMENT_ADMIN) {
    const relDeptId = item.relatedDepartmentRef?._id?.toString() || item.relatedDepartmentRef?.toString();
    if (item.ownerType !== 'campus' || relDeptId !== scopeRef.toString()) {
      const error = new Error('You can only access stock items for your own department.');
      error.statusCode = 403;
      throw error;
    }
  }
};

const createStockItem = async (data, user) => {
  let { ownerType, ownerRef, relatedDepartmentRef } = data;

  if (user.role === ROLES.CENTER_HEAD) {
    ownerType = 'campus';
    ownerRef = user.scopeRef.toString();
  }
  if (user.role === ROLES.DEPARTMENT_ADMIN) {
    // A department admin can only add campus stock in their own category.
    ownerType = 'campus';
    relatedDepartmentRef = user.scopeRef.toString();
    if (!ownerRef) {
      const error = new Error('Please select a campus for this stock item.');
      error.statusCode = 400;
      throw error;
    }
  }

  const ownerModel = ownerType === 'campus' ? 'Campus' : ownerType === 'department' ? 'Department' : null;

  const item = await StockItem.create({
    ...data,
    ownerType,
    ownerRef: ownerType === 'headOffice' ? null : ownerRef,
    ownerModel,
    relatedDepartmentRef: relatedDepartmentRef || null,
    updatedBy: user._id,
  });
  return item;
};

const updateStockItem = async (itemId, updates, user) => {
  const existing = await StockItem.findById(itemId);
  if (!existing) {
    const error = new Error('Stock item not found.');
    error.statusCode = 404;
    throw error;
  }
  assertStockScope(existing, user);

  const allowedUpdates = ['quantityAvailable', 'quantityReserved', 'reorderThreshold', 'category', 'unit', 'itemName'];
  // Only org-wide roles may re-tag a stock item's department.
  if ([ROLES.DIRECTOR, ROLES.CHAIRPERSON, ROLES.ACCOUNTS].includes(user.role)) {
    allowedUpdates.push('relatedDepartmentRef');
  }
  const safeUpdates = {};
  allowedUpdates.forEach((key) => {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  });
  safeUpdates.updatedBy = user._id;

  const item = await StockItem.findByIdAndUpdate(
    itemId,
    { $set: safeUpdates },
    { new: true, runValidators: true }
  ).populate('ownerRef', 'name code').populate('relatedDepartmentRef', 'name code');

  return item;
};

// ─── Pending stock receipts (goods received → manual campus entry) ─────────────

const listPendingReceipts = async (user) => {
  const filter = { status: 'pending' };
  if (user.role === ROLES.CENTER_HEAD) {
    filter.campusRef = user.scopeRef;
  }
  const receipts = await StockReceipt.find(filter)
    .populate('campusRef', 'name code')
    .populate('departmentRef', 'name code')
    .populate({ path: 'purchaseOrderRef', select: 'poNumber vendorName totalAmount' })
    .sort({ createdAt: -1 });
  return receipts;
};

const fulfilStockReceipt = async (receiptId, entries, user) => {
  const receipt = await StockReceipt.findById(receiptId);
  if (!receipt) {
    const error = new Error('Stock receipt not found.');
    error.statusCode = 404;
    throw error;
  }
  if (user.role === ROLES.CENTER_HEAD && receipt.campusRef.toString() !== user.scopeRef.toString()) {
    const error = new Error('You can only add stock for your own campus.');
    error.statusCode = 403;
    throw error;
  }
  if (receipt.status === 'completed') {
    const error = new Error('This stock receipt has already been completed.');
    error.statusCode = 400;
    throw error;
  }

  const lines = Array.isArray(entries) && entries.length ? entries : receipt.items;

  for (const line of lines) {
    const qty = Number(line.quantity) || 0;
    if (qty <= 0) continue;
    await StockItem.findOneAndUpdate(
      {
        ownerType: 'campus',
        ownerRef: receipt.campusRef,
        itemName: (line.name || '').trim(),
        relatedDepartmentRef: receipt.departmentRef || null,
      },
      {
        $inc: { quantityAvailable: qty },
        $set: { updatedBy: user._id, unit: line.unit || 'units', category: line.category || 'Received' },
        $setOnInsert: { quantityReserved: 0, reorderThreshold: 0 },
      },
      { upsert: true, new: true, runValidators: true }
    );
  }

  receipt.status = 'completed';
  receipt.completedBy = user._id;
  receipt.completedAt = new Date();
  await receipt.save();

  // If every receipt for this PO is done, flip the PO's stock-entry status.
  const remaining = await StockReceipt.countDocuments({
    purchaseOrderRef: receipt.purchaseOrderRef,
    status: 'pending',
  });
  if (remaining === 0) {
    await PurchaseOrder.updateOne(
      { _id: receipt.purchaseOrderRef },
      { $set: { stockEntryStatus: 'completed' } }
    );
    const accounts = await User.find({ role: { $in: [ROLES.ACCOUNTS, ROLES.DIRECTOR] }, isActive: true });
    await notifyMany(accounts, {
      type: 'stock_entry_completed',
      title: 'Stock Entry Completed',
      message: 'All received goods for a purchase order have been entered into campus stock.',
      documentType: 'PurchaseOrder',
      documentId: receipt.purchaseOrderRef,
      actionType: 'Received',
    });
  }

  emitDashboardRefresh([ROLES.CENTER_HEAD, ROLES.ACCOUNTS, ROLES.DIRECTOR], 'stockReceipt', {
    action: 'completed',
    id: receipt._id,
  });

  return receipt;
};

module.exports = {
  listStockItems,
  getStockItemById,
  createStockItem,
  updateStockItem,
  listPendingReceipts,
  fulfilStockReceipt,
};
