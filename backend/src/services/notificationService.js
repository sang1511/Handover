const Notification = require('../models/Notification');
const socketManager = require('../socket');

/**
 * Creates and sends a notification.
 * @param {string} userId - The ID of the user to notify.
 * @param {string} message - The notification message.
 * @param {string} type - The type of notification ('project', 'sprint', 'task', etc.).
 * @param {string} refId - The reference ID (projectId, sprintId, taskId, etc.).
 */
const createNotification = async (userId, message, type = 'task', refId = null) => {
  try {
    // 1. Create notification in the database
    const notification = new Notification({
      user: userId,
      message,
      type,
      refId,
    });
    await notification.save();

    // 2. Send real-time notification if the user is online
    socketManager.sendNotification(userId, notification);
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    // Optionally handle error silently or rethrow
  }
};

module.exports = {
  createNotification,
}; 