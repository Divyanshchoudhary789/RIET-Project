const express = require('express');
const router = express.Router();
const purchaseOrderController = require('./purchaseOrder.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize, requirePasswordChange } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { createPurchaseOrderSchema, goodsReceivedSchema } = require('./purchaseOrder.validation');
const { ROLES } = require('../../config/constants');
const { createUploadMiddleware, handleUploadError } = require('../../middleware/upload');

const piUpload = createUploadMiddleware('performa-invoices', 1);

router.use(authenticate, requirePasswordChange);

router.get(
  '/',
  authorize(ROLES.ACCOUNTS, ROLES.DIRECTOR, ROLES.CHAIRPERSON),
  purchaseOrderController.listPurchaseOrders
);

router.get(
  '/:id',
  authorize(ROLES.ACCOUNTS, ROLES.DIRECTOR, ROLES.CHAIRPERSON),
  purchaseOrderController.getPurchaseOrderById
);

router.get(
  '/:id/chain',
  authorize(ROLES.ACCOUNTS, ROLES.DIRECTOR, ROLES.CHAIRPERSON),
  purchaseOrderController.getPurchaseOrderChain
);

router.post(
  '/',
  authorize(ROLES.ACCOUNTS),
  validate(createPurchaseOrderSchema),
  purchaseOrderController.createPurchaseOrder
);

router.patch(
  '/:id/upload-pi',
  authorize(ROLES.ACCOUNTS),
  piUpload.single('piFile'),
  handleUploadError,
  purchaseOrderController.uploadPerformaInvoice
);

router.patch(
  '/:id/goods-received',
  authorize(ROLES.ACCOUNTS),
  validate(goodsReceivedSchema),
  purchaseOrderController.markGoodsReceived
);

module.exports = router;
