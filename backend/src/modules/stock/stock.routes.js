const express = require('express');
const router = express.Router();
const stockController = require('./stock.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize, requirePasswordChange } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { createStockItemSchema, updateStockItemSchema } = require('./stock.validation');
const { ROLES } = require('../../config/constants');

router.use(authenticate, requirePasswordChange);

// Stock is visible to every role except PO Office (not part of the approval chain for stock)
const STOCK_VIEW_ROLES = [
  ROLES.CENTER_HEAD,
  ROLES.CLUSTER_MANAGER,
  ROLES.DEPARTMENT_ADMIN,
  ROLES.DIRECTOR,
  ROLES.CHAIRPERSON,
  ROLES.ACCOUNTS,
];

router.get('/', authorize(...STOCK_VIEW_ROLES), stockController.listStockItems);
router.get('/:id', authorize(...STOCK_VIEW_ROLES), stockController.getStockItemById);

// Only Director, Chairperson, and Accounts can manually create/update stock records
// (stock is normally updated via goods receipt flow)
router.post(
  '/',
  authorize(ROLES.DIRECTOR, ROLES.CHAIRPERSON, ROLES.ACCOUNTS),
  validate(createStockItemSchema),
  stockController.createStockItem
);

router.patch(
  '/:id',
  authorize(ROLES.DIRECTOR, ROLES.CHAIRPERSON, ROLES.ACCOUNTS),
  validate(updateStockItemSchema),
  stockController.updateStockItem
);

module.exports = router;
