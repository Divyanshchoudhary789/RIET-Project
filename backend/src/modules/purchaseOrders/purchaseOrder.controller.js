const purchaseOrderService = require('./purchaseOrder.service');
const { uploadBufferToCloudinary } = require('../../middleware/upload');
const { sendSuccess } = require('../../utils/response');

const listPurchaseOrders = async (req, res, next) => {
  try {
    const { orders, meta } = await purchaseOrderService.listPurchaseOrders(req.query);
    return sendSuccess(res, 200, 'Purchase orders retrieved.', orders, meta);
  } catch (err) {
    next(err);
  }
};

const getPurchaseOrderById = async (req, res, next) => {
  try {
    const order = await purchaseOrderService.getPurchaseOrderById(req.params.id);
    return sendSuccess(res, 200, 'Purchase order retrieved.', order);
  } catch (err) {
    next(err);
  }
};

const createPurchaseOrder = async (req, res, next) => {
  try {
    const order = await purchaseOrderService.createPurchaseOrder(req.body, req.user);
    return sendSuccess(res, 201, 'Purchase Order issued successfully.', order);
  } catch (err) {
    next(err);
  }
};

const uploadPerformaInvoice = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Performa invoice file is required.' });
    }
    const piAttachmentUrl = await uploadBufferToCloudinary(
      req.file.buffer,
      'performa-invoices',
      req.file.originalname
    );
    const order = await purchaseOrderService.uploadPerformaInvoice(req.params.id, piAttachmentUrl, req.user);
    return sendSuccess(res, 200, 'Performa Invoice uploaded.', order);
  } catch (err) {
    next(err);
  }
};

const markGoodsReceived = async (req, res, next) => {
  try {
    const order = await purchaseOrderService.markGoodsReceived(req.params.id, req.body.note, req.user);
    return sendSuccess(res, 200, 'Goods received confirmed. Requirement is now fulfilled.', order);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  uploadPerformaInvoice,
  markGoodsReceived,
};
