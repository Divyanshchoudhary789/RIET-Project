const stockService = require('./stock.service');
const { sendSuccess } = require('../../utils/response');

const listStockItems = async (req, res, next) => {
  try {
    const { items, meta } = await stockService.listStockItems(req.user, req.query);
    return sendSuccess(res, 200, 'Stock items retrieved.', items, meta);
  } catch (err) {
    next(err);
  }
};

const getStockItemById = async (req, res, next) => {
  try {
    const item = await stockService.getStockItemById(req.params.id, req.user);
    return sendSuccess(res, 200, 'Stock item retrieved.', item);
  } catch (err) {
    next(err);
  }
};

const createStockItem = async (req, res, next) => {
  try {
    const item = await stockService.createStockItem(req.body, req.user);
    return sendSuccess(res, 201, 'Stock item created.', item);
  } catch (err) {
    next(err);
  }
};

const updateStockItem = async (req, res, next) => {
  try {
    const item = await stockService.updateStockItem(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Stock item updated.', item);
  } catch (err) {
    next(err);
  }
};

const listPendingReceipts = async (req, res, next) => {
  try {
    const receipts = await stockService.listPendingReceipts(req.user);
    return sendSuccess(res, 200, 'Pending stock receipts retrieved.', receipts);
  } catch (err) {
    next(err);
  }
};

const fulfilStockReceipt = async (req, res, next) => {
  try {
    const receipt = await stockService.fulfilStockReceipt(req.params.id, req.body.entries, req.user);
    return sendSuccess(res, 200, 'Goods added to stock.', receipt);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listStockItems,
  getStockItemById,
  createStockItem,
  updateStockItem,
  listPendingReceipts,
  fulfilStockReceipt,
};
