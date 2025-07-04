const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');
const Project = require('../models/Project');
const upload = require('../middleware/upload');

// Create project 
router.post('/',
  authenticate,
  upload.array('files'),
  projectController.createProject
);

// Get all projects (filtered by role)
router.get('/', authenticate, projectController.getProjects);

// Get single project
router.get('/:id', authenticate, projectController.getProject);

// Download project files
router.get('/:id/download', authenticate, projectController.downloadProjectFiles);

// Download individual file
router.get('/:id/files/:fileId/download', authenticate, projectController.downloadFile);

// Delete project (sender and admin only)
router.delete('/:id',
  authenticate,
  projectController.deleteProject
);

// Thêm route cho completeProject
router.patch('/:id/complete', authenticate, projectController.completeProject);

module.exports = router; 