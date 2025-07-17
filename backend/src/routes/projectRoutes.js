const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/cloudinaryUpload');

// Create project 
router.post('/',
  authenticate,
  upload.array('overviewDocs'),
  projectController.createProject
);

// Get all projects
router.get('/', authenticate, projectController.getProjects);

// Get single project
router.get('/:id', authenticate, projectController.getProject);

// Update project
router.put('/:id', authenticate, upload.array('overviewDocs'), projectController.updateProject);

// Confirm project (admin only)
router.patch('/:id/confirm', authenticate, projectController.confirmProject);

// Delete project
router.delete('/:id', authenticate, projectController.deleteProject);

// Download overview file
router.get('/:projectId/files/:fileId(*)/download', authenticate, projectController.downloadProjectFile);

module.exports = router; 