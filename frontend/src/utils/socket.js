import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketManager {
  socket;

  connect(token) {
    if (this.socket && this.socket.connected) {
      return;
    }
    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
    });

    this.socket.on('connect', () => {});
    this.socket.on('disconnect', () => {});
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

  off(event) {
    if (this.socket) {
      this.socket.off(event);
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
}

const socketManager = new SocketManager();
export default socketManager; 