const Notification = require('../models/Notification');

// Lấy danh sách thông báo của user
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy thông báo.' });
  }
};

// Đánh dấu tất cả thông báo là đã đọc
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi đánh dấu đã đọc.' });
  }
};

// Đánh dấu một thông báo là đã đọc
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo.' });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi đánh dấu đã đọc.' });
  }
}; 