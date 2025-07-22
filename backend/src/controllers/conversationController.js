const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

// Tạo hoặc lấy cuộc trò chuyện 1-1
const createOrGetConversation = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;
    // Chỉ cho phép nhập ObjectId hợp lệ
    if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: 'receiverId phải là ObjectId hợp lệ' });
    }
    // Không cho phép tự chat với chính mình
    if (req.user._id.toString() === receiverId) {
      return res.status(400).json({ message: 'Không thể chat với chính mình' });
    }
    // Tìm user theo _id
    const receiverUser = await User.findById(receiverId);
    if (!receiverUser) {
      return res.status(404).json({ message: 'Không tìm thấy user với _id này' });
    }
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverUser._id], $size: 2 },
      isGroupChat: false,
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverUser._id],
      });
    }
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi tạo/lấy conversation' });
  }
};

// Lấy danh sách cuộc trò chuyện của user
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'name email')
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'name email' } })
      .sort({ updatedAt: -1 });
    // Tính số tin nhắn chưa đọc cho từng conversation
    const conversationsWithUnread = await Promise.all(conversations.map(async (conv) => {
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        sender: { $ne: userId },
        readBy: { $ne: userId }
      });
      return { ...conv.toObject(), unreadCount };
    }));
    res.json(conversationsWithUnread);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách conversation' });
  }
};

// Lấy tin nhắn của 1 cuộc trò chuyện
const getMessages = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const messages = await Message.find({ conversationId })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi lấy messages' });
  }
};

// Gửi tin nhắn (text/file)
const sendMessage = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    let { text, type } = req.body;
    let fileUrl, fileName, fileSize, fileType, publicId, contentType, uploadedBy, uploadedAt;

    // Nếu có file upload (Cloudinary)
    if (req.file) {
      fileUrl = req.file.path;
      publicId = req.file.filename;
      fileName = req.file.originalname;
      fileSize = req.file.size;
      fileType = req.file.mimetype;
      contentType = req.file.mimetype;
      uploadedBy = req.user._id;
      uploadedAt = new Date();
      type = 'file';
    } else {
      fileUrl = req.body.fileUrl;
      fileName = req.body.fileName;
      fileSize = req.body.fileSize;
      fileType = req.body.fileType;
      publicId = req.body.publicId;
      contentType = req.body.contentType;
      uploadedBy = req.body.uploadedBy;
      uploadedAt = req.body.uploadedAt;
    }

    if (!text && !fileUrl) {
      return res.status(400).json({ message: 'Thiếu nội dung tin nhắn hoặc file' });
    }
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    const message = new Message({
      conversationId,
      sender: req.user._id,
      text: text || '',
      type: type || (fileUrl ? 'file' : 'text'),
      fileUrl,
      fileName,
      fileSize,
      fileType,
      publicId,
      contentType,
      uploadedBy,
      uploadedAt,
    });
    await message.save();
    await message.populate('sender', 'name email userID');
    await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message._id });
    // Emit socket newMessage cho tất cả user trong room
    try {
      const io = require('../socket').io;
      if (io) {
        const clients = await io.in(conversationId).allSockets();
        io.to(conversationId).emit('newMessage', message);
      } else {
        console.error('[Controller] io is null when trying to emit newMessage');
      }
    } catch (e) { /* ignore */ }
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi gửi message' });
  }
};

// Tạo group chat
const createGroupChat = async (req, res) => {
  try {
    const { name, participants } = req.body;
    if (!name || !participants || !Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({ message: 'Thiếu tên nhóm hoặc thành viên' });
    }
    const allParticipants = [...participants, req.user._id];
    const group = await Conversation.create({
      name,
      participants: allParticipants,
      isGroupChat: true,
      groupAdmin: req.user._id,
    });
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi tạo group chat' });
  }
};

// Xóa group chat (chỉ admin)
const deleteGroupChat = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.isGroupChat) {
      return res.status(404).json({ message: 'Không tìm thấy nhóm chat' });
    }
    if (!conversation.groupAdmin || conversation.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Chỉ admin mới được xóa nhóm' });
    }
    // Xóa tất cả messages liên quan
    await Message.deleteMany({ conversationId: id });
    await Conversation.findByIdAndDelete(id);
    res.json({ message: 'Đã xóa nhóm chat' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi xóa nhóm chat' });
  }
};

// Thêm thành viên vào group chat (chỉ admin)
const addMembersToGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body; // mảng userId
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Thiếu danh sách user cần thêm' });
    }
    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.isGroupChat) {
      return res.status(404).json({ message: 'Không tìm thấy nhóm chat' });
    }
    if (!conversation.groupAdmin || conversation.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Chỉ admin mới được thêm thành viên' });
    }
    // Thêm các user chưa có vào participants
    const newParticipants = userIds.filter(uid => !conversation.participants.map(p=>p.toString()).includes(uid));
    conversation.participants.push(...newParticipants);
    await conversation.save();
    res.json({ message: 'Đã thêm thành viên', conversation });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi thêm thành viên' });
  }
};

module.exports = {
  createOrGetConversation,
  getConversations,
  getMessages,
  sendMessage,
  createGroupChat,
  deleteGroupChat,
  addMembersToGroup,
}; 