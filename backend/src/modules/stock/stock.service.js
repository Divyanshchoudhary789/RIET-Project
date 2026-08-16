const StockItem = require('./stockItem.model');
const { ROLES } = require('../../config/constants');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

/**
 * Builds a MongoDB stock filter based on the requesting user's role and scope.
 * Scoped roles (center_head, department_admin) are always locked to their own scope.
 * Org-wide roles can optionally filter by ownerType / ownerRef / category.
 */
const buildStockFilter = (user, query) => {
  const { role, scopeRef } = user;

  if (role === ROLES.CENTER_HEAD) {
    // Locked — cannot be overridden
    return { ownerType: 'campus', ownerRef: scopeRef };
  }

  if (role === ROLES.DEPARTMENT_ADMIN) {
    // Locked — cannot be overridden
    return { ownerType: 'department', ownerRef: scopeRef };
  }

  // Org-wide roles: Cluster Manager, Director, Chairperson, PO Office, Accounts
  const filter = {};
  if (query.ownerType) filter.ownerType = query.ownerType;
  if (query.ownerRef) filter.ownerRef = query.ownerRef;
  if (query.category) filter.category = query.category;
  return filter;
};

const listStockItems = async (user, query) => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter = buildStockFilter(user, query);

  const [items, total] = await Promise.all([
    StockItem.find(filter)
      .populate('ownerRef', 'name code')
      .populate('updatedBy', 'name email')
      .sort({ itemName: 1 })
      .skip(skip)
      .limit(limit),
    StockItem.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(page, limit, total) };
};

const getStockItemById = async (itemId) => {
  const item = await StockItem.findById(itemId)
    .populate('ownerRef', 'name code')
    .populate('updatedBy', 'name email');

  if (!item) {
    const error = new Error('Stock item not found.');
    error.statusCode = 404;
    throw error;
  }

  return item;
};

const createStockItem = async (data, userId) => {
  const ownerModel = data.ownerType === 'campus'
    ? 'Campus'
    : data.ownerType === 'department'
      ? 'Department'
      : null;

  const item = await StockItem.create({ ...data, ownerModel, updatedBy: userId });
  return item;
};

const updateStockItem = async (itemId, updates, userId) => {
  const allowedUpdates = ['quantityAvailable', 'quantityReserved', 'reorderThreshold', 'category', 'unit'];
  const safeUpdates = {};
  allowedUpdates.forEach((key) => {
    if (updates[key] !== undefined) safeUpdates[key] = updates[key];
  });
  safeUpdates.updatedBy = userId;

  const item = await StockItem.findByIdAndUpdate(
    itemId,
    { $set: safeUpdates },
    { new: true, runValidators: true }
  ).populate('ownerRef', 'name code');

  if (!item) {
    const error = new Error('Stock item not found.');
    error.statusCode = 404;
    throw error;
  }

  return item;
};

module.exports = {
  listStockItems,
  getStockItemById,
  createStockItem,
  updateStockItem,
};
