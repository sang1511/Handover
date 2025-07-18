const express = require('express');
const router = express.Router();
const {
  createOrGetConversation,
  getConversations,
  getMessages,
  sendMessage,
  createGroupChat,
  deleteGroupChat,
  addMembersToGroup,
} = require('../controllers/conversationController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/cloudinaryUpload');
const mongoose = require('mongoose');

// Tải file đính kèm trong chat (ĐƯA LÊN TRƯỚC)
router.get('/:conversationId/files/:publicId(*)/download', authenticate, async (req, res) => {
  let convId;
  try {
    convId = new mongoose.Types.ObjectId(req.params.conversationId);
  } catch (e) {
    return res.status(400).json({ message: 'Invalid conversationId', error: e?.message });
  }
  try {
    const Message = require('../models/Message');
    const axios = require('axios');
    const message = await Message.findOne({
      conversationId: convId,
      publicId: req.params.publicId
    });
    if (!message || !message.fileUrl) {
      return res.status(404).json({ message: 'Không tìm thấy file' });
    }
    // Lấy file từ Cloudinary
    const fileResponse = await axios.get(message.fileUrl, { responseType: 'stream' });
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(message.fileName || 'file')}"`);
    res.setHeader('Content-Type', message.contentType || message.fileType || 'application/octet-stream');
    fileResponse.data.pipe(res);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err?.message });
  }
});
// Tạo hoặc lấy cuộc trò chuyện 1-1
router.post('/', authenticate, createOrGetConversation);
// Lấy danh sách cuộc trò chuyện
router.get('/', authenticate, getConversations);
// Lấy tin nhắn của 1 cuộc trò chuyện
router.get('/:id/messages', authenticate, getMessages);
// Gửi tin nhắn
router.post('/:id/messages', authenticate, upload.single('file'), sendMessage);
// Tạo group chat
router.post('/group', authenticate, createGroupChat);
// Xóa group chat (chỉ admin)
router.delete('/:id', authenticate, deleteGroupChat);
// Thêm thành viên vào group chat (chỉ admin)
router.post('/:id/add-members', authenticate, addMembersToGroup);

module.exports = router; 