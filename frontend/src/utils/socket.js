import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;

class SocketManager {
  socket;

  connect(token) {
    if (this.socket && this.socket.connected) {
      // console.log('[SocketManager] Socket already connected:', this.socket.id);
      return;
    }
    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
    });

    this.socket.on('connect', () => {
      // console.log('[SocketManager] Socket connected:', this.socket.id);
    });
    this.socket.on('disconnect', (reason) => {
      // console.log('[SocketManager] Socket disconnected. Reason:', reason);
    });
    this.socket.on('connect_error', (err) => {
      console.error('[SocketManager] Socket connect error:', err.message);
    });
    this.socket.on('notification', (data) => {
      // console.log('[Socket] Received notification:', data);
    });
  }

  disconnect() {
    if (this.socket) {
      // console.log('[SocketManager] Disconnecting socket:', this.socket.id);
      this.socket.disconnect();
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      // console.log(`[SocketManager] Registered event listener for: ${event}`);
    }
  }

  off(event) {
    if (this.socket) {
      this.socket.off(event);
      // console.log(`[SocketManager] Removed event listener for: ${event}`);
    }
  }

  joinProjectRoom(projectId) {
    if (this.socket) {
      // console.log('[SocketManager] Joining project room:', projectId);
      this.socket.emit('joinProjectRoom', projectId);
    }
  }

  leaveProjectRoom(projectId) {
    if (this.socket) {
      // console.log('[SocketManager] Leaving project room:', projectId);
      this.socket.emit('leaveProjectRoom', projectId);
    }
  }

  // --- CHAT EVENTS ---
  joinChatRoom(conversationId) {
    if (this.socket) {
      this.socket.emit('joinChatRoom', conversationId);
    }
  }

  sendChatMessage(data) {
    if (this.socket) {
      this.socket.emit('sendMessage', data);
    }
  }

  typing(conversationId) {
    if (this.socket) {
      this.socket.emit('typing', conversationId);
    }
  }

  stopTyping(conversationId) {
    if (this.socket) {
      this.socket.emit('stopTyping', conversationId);
    }
  }

  markAsRead(conversationId) {
    if (this.socket) {
      this.socket.emit('markAsRead', conversationId);
    }
  }
}

const socketManager = new SocketManager();
export default socketManager; 