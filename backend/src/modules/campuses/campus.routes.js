const express = require('express');
const router = express.Router();
const campusController = require('./campus.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize, requirePasswordChange } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { createCampusSchema, updateCampusSchema } = require('./campus.validation');
const { ROLES } = require('../../config/constants');

router.use(authenticate, requirePasswordChange);

// All authenticated users can view campuses (e.g., Cluster Manager needs campus list)
router.get('/', campusController.listCampuses);
router.get('/:id', campusController.getCampusById);

// Only Director can create/update campuses
router.post('/', authorize(ROLES.DIRECTOR), validate(createCampusSchema), campusController.createCampus);
router.patch('/:id', authorize(ROLES.DIRECTOR), validate(updateCampusSchema), campusController.updateCampus);

module.exports = router;
