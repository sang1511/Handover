require('dotenv').config();
const app = require('./app');
const http = require('http');
const socketManager = require('./socket');

// Start server
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Khởi tạo socket
socketManager.setupSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running`);
  console.log(`API is available`);
}); 