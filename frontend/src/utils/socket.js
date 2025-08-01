import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;

class SocketManager {
  socket;

  connect(accessToken, onErrorCallback) {
    
    if (this.socket && this.socket.connected) {
      return;
    }
    
    this.socket = io(SOCKET_URL, {
      auth: {
        token: accessToken,
      },
    });
    this.socket.on('connect', () => {
      this.socket.emit('test', { message: 'Frontend connected' });
    });
    this.socket.on('disconnect', (reason) => {
    });
    this.socket.on('connect_error', (err) => {
      console.error('[SocketManager] Socket connect error:', err);
      if (onErrorCallback) {
        onErrorCallback(err);
      }
    });
    this.socket.on('notification', (data) => {

    });

    this.socket.on('test_response', (data) => {
    });
    // Log khi nhận event newMessage
    this.socket.on('newMessage', (msg) => {
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }


  joinProjectRoom(projectId) {
    if (this.socket) {
      this.socket.emit('joinProjectRoom', projectId);
    }
  }

  leaveProjectRoom(projectId) {
    if (this.socket) {
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

  joinSprintRoom(sprintId) {
    if (this.socket) {
      this.socket.emit('joinSprintRoom', sprintId);
    }
  }

  leaveSprintRoom(sprintId) {
    if (this.socket) {
      this.socket.emit('leaveSprintRoom', sprintId);
    }
  }
}

const socketManager = new SocketManager();
export default socketManager;