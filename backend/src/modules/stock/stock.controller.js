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
    const item = await stockService.createStockItem(req.body, req.user._id);
    return sendSuccess(res, 201, 'Stock item created.', item);
  } catch (err) {
    next(err);
  }
};

const updateStockItem = async (req, res, next) => {
  try {
    const item = await stockService.updateStockItem(req.params.id, req.body, req.user._id);
    return sendSuccess(res, 200, 'Stock item updated.', item);
  } catch (err) {
    next(err);
  }
};

module.exports = { listStockItems, getStockItemById, createStockItem, updateStockItem };
