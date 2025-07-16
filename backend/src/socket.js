const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Notification = require('./models/Notification');
const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

// Lưu userId <-> socketId mapping
const onlineUsers = new Map();

const socketManager = {
  io: null,
  
  setupSocket(server) {
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication error'));
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      // Đảm bảo userId luôn là string
      const userId = socket.user._id.toString();
      // Lưu mapping userId <-> socketId
      onlineUsers.set(userId, socket.id);

      socket.on('joinProjectRoom', (projectId) => {
        // console.log(`[Socket.IO] User ${userId} joined room ${projectId}`);
        socket.join(projectId);
      });

      socket.on('leaveProjectRoom', (projectId) => {
        socket.leave(projectId);
      });

      socket.on('disconnect', () => {
        onlineUsers.delete(userId);
      });

      // Test event để kiểm tra kết nối
      socket.on('test', (data) => {
        // console.log('[Socket.IO] Test event received from frontend:', data);
        socket.emit('test_response', { message: 'Backend received test' });
      });

      // --- CHAT EVENTS ---
      // Join chat room (theo conversationId)
      socket.on('joinChatRoom', (conversationId) => {
        socket.join(conversationId);
      });

      // Gửi tin nhắn realtime
      socket.on('sendMessage', async (data) => {
        const { conversationId, text, type = 'text', fileUrl, fileName, fileSize, fileType } = data;
        if (!conversationId || (!text && !fileUrl)) return;
        try {
          const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: socket.user._id,
          });
          if (!conversation) return;
          const messageData = {
            conversationId,
            sender: socket.user._id,
            text: text ? text.trim() : '',
            type,
            fileUrl, fileName, fileSize, fileType,
          };
          const newMessage = new Message(messageData);
          const savedMessage = await newMessage.save();
          await savedMessage.populate('sender', 'username avatar');
          await Conversation.findByIdAndUpdate(conversationId, { lastMessage: savedMessage._id });
          // Gửi message cho tất cả user trong room
          socketManager.io.to(conversationId).emit('newMessage', savedMessage);
        } catch (err) {
          socket.emit('messageError', { error: 'Không thể gửi tin nhắn.' });
        }
      });

      // Typing
      socket.on('typing', (conversationId) => {
        socket.to(conversationId).emit('typing', socket.user.username);
      });
      socket.on('stopTyping', (conversationId) => {
        socket.to(conversationId).emit('stopTyping');
      });

      // Đánh dấu đã đọc
      socket.on('markAsRead', async (conversationId) => {
        try {
          await Message.updateMany(
            { conversationId, sender: { $ne: socket.user._id }, readBy: { $ne: socket.user._id } },
            { $addToSet: { readBy: socket.user._id } }
          );
          socketManager.io.to(conversationId).emit('messagesRead', { conversationId, readerId: socket.user._id });
        } catch (err) {
          socket.emit('error', { message: 'Could not mark messages as read' });
        }
      });
    });
    
    return this.io;
  },
  
  sendNotification(userId, notification) {
    if (this.io) {
      const userIdStr = userId.toString();
      const socketId = onlineUsers.get(userIdStr);
      if (socketId) {
        try {
          this.io.to(socketId).emit('notification', notification);
        } catch (err) {
          // giữ lại log lỗi thực sự nếu cần
          console.error(`[Socket.IO] Error sending notification to user ${userIdStr} (socketId: ${socketId}):`, err);
        }
      }
    } else {
      // giữ lại log lỗi thực sự nếu cần
      console.error('[Socket.IO] this.io is not initialized when trying to send notification', { userId, notification });
    }
  },

  broadcastToProjectRoom(projectId, event, data) {
    if (this.io) {
      // console.log(`[Socket.IO] Broadcasting to room ${projectId}, event: ${event}, data:`, data);
      this.io.to(projectId).emit(event, data);
    }
  },

  /**
   * Gửi một sự kiện và dữ liệu trực tiếp đến một người dùng cụ thể qua socketId của họ.
   * @param {string} userId - ID của người dùng nhận.
   * @param {string} event - Tên của sự kiện.
   * @param {object} data - Dữ liệu cần gửi.
   */
  sendMessageToUser(userId, event, data) {
    if (this.io) {
      const userIdStr = userId.toString();
      const socketId = onlineUsers.get(userIdStr);
      if (socketId) {
        this.io.to(socketId).emit(event, data);
      }
    }
  },
};

module.exports = socketManager; 