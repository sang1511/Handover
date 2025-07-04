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
const upload = require('../middleware/upload');

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
// Tải file đính kèm trong chat
router.get('/:conversationId/files/:fileId/download', authenticate, async (req, res) => {
  const { fileId } = req.params;
  const { getFileInfo, createDownloadStream } = require('../utils/gridfs');
  try {
    await getFileInfo(fileId); // Kiểm tra file tồn tại
    const downloadStream = createDownloadStream(fileId);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileId}"`);
    downloadStream.pipe(res);
    downloadStream.on('error', () => {
      if (!res.headersSent) res.status(500).end('Error streaming file');
    });
  } catch (err) {
    res.status(404).json({ message: 'Không tìm thấy file' });
  }
});
// Xóa group chat (chỉ admin)
router.delete('/:id', authenticate, deleteGroupChat);
// Thêm thành viên vào group chat (chỉ admin)
router.post('/:id/add-members', authenticate, addMembersToGroup);

module.exports = router; 