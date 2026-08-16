const express = require('express');
const router = express.Router();
const stockController = require('./stock.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize, requirePasswordChange } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { createStockItemSchema, updateStockItemSchema } = require('./stock.validation');
const { ROLES } = require('../../config/constants');

router.use(authenticate, requirePasswordChange);

router.get('/', stockController.listStockItems);
router.get('/:id', stockController.getStockItemById);

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
