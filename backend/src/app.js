require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Source Code Management API' });
});

// API info route
app.get('/api', (req, res) => {
  res.json({
    message: 'API Endpoints',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      projects: '/api/projects',
      modules: '/api/modules',
      releases: '/api/releases',
      sprints: '/api/sprints',
      tasks: '/api/tasks',
      notifications: '/api/notifications',
    }
  });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/modules', require('./routes/moduleRoutes'));
app.use('/api/releases', require('./routes/releaseRoutes'));
app.use('/api/sprints', require('./routes/sprintRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/conversations', require('./routes/conversationRoutes'));
app.use('/api/activities', require('./routes/activityRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: err.status || 'error',
    message: err.message || 'Internal server error',
  });
});

module.exports = app; 