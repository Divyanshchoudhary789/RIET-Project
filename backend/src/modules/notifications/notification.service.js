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

/**
 * Creates an in-app notification and emits it via Socket.io if the user is online.
 * Also triggers an email notification.
 *
 * @param {object} params
 * @param {string} params.userId - Recipient's User _id
 * @param {string} params.userEmail - Recipient's email for email notification
 * @param {string} params.userName - Recipient's name for email greeting
 * @param {string} params.type - Notification type identifier
 * @param {string} params.title - Short notification title
 * @param {string} params.message - Full notification message
 * @param {string|null} params.documentType - Document model name (e.g. 'Requirement')
 * @param {string|null} params.documentId - Document _id
 * @param {string} [params.actionType] - e.g. 'Forwarded', 'Rejected', 'Approved'
 * @param {string} [params.note] - Reviewer note to include in email
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
 * @param {object} notificationData - Common notification data (type, title, message, etc.)
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

module.exports = { setSocketIO, createNotification, notifyMany };
