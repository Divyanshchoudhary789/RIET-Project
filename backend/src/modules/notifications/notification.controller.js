const Notification = require('./notification.model');
const { sendSuccess, sendError } = require('../../utils/response');
const { getPaginationParams, buildPaginationMeta } = require('../../utils/pagination');

const getMyNotifications = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { userRef: req.user._id };

    if (req.query.isRead !== undefined) {
      filter.isRead = req.query.isRead === 'true';
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userRef: req.user._id, isRead: false }),
    ]);

    return sendSuccess(
      res,
      200,
      'Notifications retrieved.',
      notifications,
      { ...buildPaginationMeta(page, limit, total), unreadCount }
    );
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userRef: req.user._id,
    });

    if (!notification) {
      return sendError(res, 404, 'Notification not found.');
    }

    notification.isRead = true;
    await notification.save();

    return sendSuccess(res, 200, 'Notification marked as read.', notification);
  } catch (err) {
    next(err);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userRef: req.user._id, isRead: false },
      { isRead: true }
    );

    return sendSuccess(res, 200, 'All notifications marked as read.');
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      userRef: req.user._id,
      isRead: false,
    });

    return sendSuccess(res, 200, 'Unread count retrieved.', { unreadCount: count });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead, getUnreadCount };
