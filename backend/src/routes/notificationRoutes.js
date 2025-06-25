const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// Lấy danh sách thông báo
router.get('/', authenticate, notificationController.getNotifications);

// Đánh dấu tất cả là đã đọc
router.patch('/read', authenticate, notificationController.markAllAsRead);

// Đánh dấu một thông báo là đã đọc
router.patch('/:id/read', authenticate, notificationController.markAsRead);

module.exports = router; 