const express = require('express');
const router = express.Router();
const releaseController = require('../controllers/releaseController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// CRUD Release
router.post('/', authenticate, upload.array('docs'), releaseController.createRelease);
router.get('/by-module/:moduleId', authenticate, releaseController.getReleasesByModule);
router.get('/:id', authenticate, releaseController.getRelease);
router.put('/:id', authenticate, upload.array('docs'), releaseController.updateRelease);
router.delete('/:id', authenticate, releaseController.deleteRelease);
router.get('/', authenticate, releaseController.getReleases);
router.get('/:releaseId/files/:fileId/download', authenticate, releaseController.downloadReleaseFile);

module.exports = router;
