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
      const userId = socket.user._id;
      onlineUsers.set(userId, socket.id);
      console.log('User connected:', userId);

      socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        console.log('User disconnected:', userId);
      });
    });
    
    return this.io;
  },
  
  sendNotification(userId, notification) {
    if (this.io) {
      const socketId = onlineUsers.get(userId.toString());
      if (socketId) {
        this.io.to(socketId).emit('notification', notification);
      }
    }
  },
};

module.exports = socketManager; 