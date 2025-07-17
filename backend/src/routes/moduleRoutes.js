const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/cloudinaryUpload');

// CRUD Module
router.post('/', authenticate, upload.array('docs'), moduleController.createModule);
router.get('/by-project/:projectId', authenticate, moduleController.getModulesByProject);
router.get('/:id', authenticate, moduleController.getModule);
router.put('/:id', authenticate, upload.array('docs'), moduleController.updateModule);
router.delete('/:id', authenticate, moduleController.deleteModule);

// Lấy tất cả module (toàn hệ thống)
router.get('/', authenticate, moduleController.getAllModules);
// Download file
router.get('/:moduleId/files/:fileId(*)/download', authenticate, moduleController.downloadModuleFile);

module.exports = router; 