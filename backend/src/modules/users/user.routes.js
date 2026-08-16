const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize, requirePasswordChange } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { createUserSchema, updateUserSchema } = require('./user.validation');
const { ROLES } = require('../../config/constants');

router.use(authenticate, requirePasswordChange);

router.get('/', authorize(ROLES.DIRECTOR, ROLES.CHAIRPERSON), userController.listUsers);

router.get('/:id', authorize(ROLES.DIRECTOR, ROLES.CHAIRPERSON), userController.getUserById);

router.post(
  '/',
  authorize(ROLES.DIRECTOR, ROLES.CHAIRPERSON),
  validate(createUserSchema),
  userController.createUser
);

router.patch(
  '/:id',
  authorize(ROLES.DIRECTOR, ROLES.CHAIRPERSON),
  validate(updateUserSchema),
  userController.updateUser
);

module.exports = router;
