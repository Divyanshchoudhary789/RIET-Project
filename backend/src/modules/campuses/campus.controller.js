const campusService = require('./campus.service');
const { sendSuccess } = require('../../utils/response');

const listCampuses = async (req, res, next) => {
  try {
    const { campuses, meta } = await campusService.listCampuses(req.query);
    return sendSuccess(res, 200, 'Campuses retrieved.', campuses, meta);
  } catch (err) {
    next(err);
  }
};

const getCampusById = async (req, res, next) => {
  try {
    const campus = await campusService.getCampusById(req.params.id);
    return sendSuccess(res, 200, 'Campus retrieved.', campus);
  } catch (err) {
    next(err);
  }
};

const createCampus = async (req, res, next) => {
  try {
    const campus = await campusService.createCampus({ ...req.body, createdBy: req.user._id });
    return sendSuccess(res, 201, 'Campus created successfully.', campus);
  } catch (err) {
    next(err);
  }
};

const updateCampus = async (req, res, next) => {
  try {
    const campus = await campusService.updateCampus(req.params.id, { ...req.body, updatedBy: req.user._id });
    return sendSuccess(res, 200, 'Campus updated.', campus);
  } catch (err) {
    next(err);
  }
};

module.exports = { listCampuses, getCampusById, createCampus, updateCampus };
