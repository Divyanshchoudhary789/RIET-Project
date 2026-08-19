const Notification = require('./notification.model');
const { sendEmail } = require('../../utils/email/emailService');
const { documentActionEmail } = require('../../utils/email/emailTemplates');

let io = null;

/**
 * Injects the Socket.io instance so the service can emit real-time events.
 * Called once during server startup.
 */
const setSocketIO = (socketInstance) => {
  io = socketInstance;
};

/** Expose raw io for domain event emission from services */
const getIO = () => io;

/**
 * Emit a dashboard:refresh event to every member of a role-based room.
 * Services call this after any state mutation so dashboards re-fetch.
 *
 * @param {string|string[]} roles  - e.g. 'center_head' or ['director','po_office']
 * @param {string}          entity - e.g. 'requirement', 'assessment', 'memo'
 * @param {object}          [meta] - optional payload (documentId, action, etc.)
 */
const emitDashboardRefresh = (roles, entity, meta = {}) => {
  if (!io) return;
  const roleList = Array.isArray(roles) ? roles : [roles];
  roleList.forEach((role) => {
    io.to(`role:${role}`).emit('dashboard:refresh', { entity, ...meta });
  });
};

/**
 * Creates an in-app notification and emits it via Socket.io if the user is online.
 * Also triggers an email notification.
 *
 * @param {object} params
 * @param {string} params.userId        - Recipient's User _id
 * @param {string} params.userEmail     - Recipient's email
 * @param {string} params.userName      - Recipient's name
 * @param {string} params.type          - Notification type identifier
 * @param {string} params.title         - Short notification title
 * @param {string} params.message       - Full notification message
 * @param {string|null} params.documentType
 * @param {string|null} params.documentId
 * @param {string} [params.actionType]
 * @param {string} [params.note]
 */
const createNotification = async ({
  userId,
  userEmail,
  userName,
  type,
  title,
  message,
  documentType = null,
  documentId = null,
  actionType = '',
  note = '',
}) => {
  try {
    const notification = await Notification.create({
      userRef: userId,
      type,
      title,
      message,
      documentType,
      documentId,
      isRead: false,
    });

    if (io) {
      io.to(`user:${userId}`).emit('notification:new', {
        _id: notification._id,
        type,
        title,
        message,
        documentType,
        documentId,
        isRead: false,
        createdAt: notification.createdAt,
      });
    }

    if (userEmail && actionType && documentType) {
      const emailContent = documentActionEmail(userName, actionType, documentType, documentId, note);
      await sendEmail(userEmail, emailContent.subject, emailContent.html);
    }
  } catch (err) {
    // Notifications are non-critical — log and continue
    console.error('Notification creation failed:', err.message);
  }
};

/**
 * Creates notifications for multiple recipients at once.
 * @param {Array<object>} recipients - Array of user objects with _id, email, name
 * @param {object} notificationData  - Common notification data
 */
const notifyMany = async (recipients, notificationData) => {
  const tasks = recipients.map((user) =>
    createNotification({
      ...notificationData,
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
    })
  );
  await Promise.allSettled(tasks);
};

module.exports = { setSocketIO, getIO, emitDashboardRefresh, createNotification, notifyMany };
