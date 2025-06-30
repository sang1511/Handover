const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Notification = require('./models/Notification');
const User = require('./models/User');

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
    });
    
    return this.io;
  },
  
  sendNotification(userId, notification) {
    if (this.io) {
      const userIdStr = userId.toString();
      const socketId = onlineUsers.get(userIdStr);
      if (socketId) {
        // console.log('[Socket.IO] Sending notification:', notification);
        try {
          this.io.to(socketId).emit('notification', notification);
        } catch (err) {
          console.error(`[Socket.IO] Error sending notification to user ${userIdStr} (socketId: ${socketId}):`, err);
        }
      } else {
        // console.log(`[Socket.IO] User ${userIdStr} is offline, cannot send notification`, notification);
      }
    } else {
      console.error('[Socket.IO] this.io is not initialized when trying to send notification', { userId, notification });
    }
  },

  broadcastToProjectRoom(projectId, event, data) {
    if (this.io) {
      // console.log(`[Socket.IO] Broadcasting to room ${projectId}, event: ${event}, data:`, data);
      this.io.to(projectId).emit(event, data);
    }
  },
};

module.exports = socketManager; 