const express = require('express');
const router = express.Router();
const stockController = require('./stock.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize, requirePasswordChange } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { createStockItemSchema, updateStockItemSchema, fulfilReceiptSchema } = require('./stock.validation');
const { ROLES } = require('../../config/constants');

router.use(authenticate, requirePasswordChange);

// Stock is visible to every role except PO Office (not part of the stock chain)
const STOCK_VIEW_ROLES = [
  ROLES.CENTER_HEAD,
  ROLES.CLUSTER_MANAGER,
  ROLES.DEPARTMENT_ADMIN,
  ROLES.DIRECTOR,
  ROLES.CHAIRPERSON,
  ROLES.ACCOUNTS,
];

// Roles that can create / edit stock records directly
const STOCK_WRITE_ROLES = [
  ROLES.CENTER_HEAD,
  ROLES.DEPARTMENT_ADMIN,
  ROLES.DIRECTOR,
  ROLES.CHAIRPERSON,
  ROLES.ACCOUNTS,
];

router.get('/pending-receipts', authorize(...STOCK_VIEW_ROLES), stockController.listPendingReceipts);

router.post(
  '/receipts/:id/fulfil',
  authorize(ROLES.CENTER_HEAD),
  validate(fulfilReceiptSchema),
  stockController.fulfilStockReceipt
);

router.get('/', authorize(...STOCK_VIEW_ROLES), stockController.listStockItems);
router.get('/:id', authorize(...STOCK_VIEW_ROLES), stockController.getStockItemById);

router.post(
  '/',
  authorize(...STOCK_WRITE_ROLES),
  validate(createStockItemSchema),
  stockController.createStockItem
);

router.patch(
  '/:id',
  authorize(...STOCK_WRITE_ROLES),
  validate(updateStockItemSchema),
  stockController.updateStockItem
);

module.exports = router;
