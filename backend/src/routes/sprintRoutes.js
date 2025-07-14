const express = require('express');
const router = express.Router();
const sprintController = require('../controllers/sprintController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// CRUD Sprint
router.post('/by-release/:releaseId', authenticate, upload.array('docs'), sprintController.createSprint);
router.get('/by-release/:releaseId', authenticate, sprintController.getSprintsByRelease);
router.get('/:id', authenticate, sprintController.getSprint);
router.put('/:id', authenticate, upload.array('docs'), sprintController.updateSprint);
router.delete('/:id', authenticate, sprintController.deleteSprint);
router.get('/:sprintId/files/:fileId', authenticate, sprintController.downloadSprintFile);
router.delete('/:sprintId/files/:fileId', authenticate, sprintController.deleteSprintFile);
router.post('/:id/add-members', authenticate, sprintController.addMembersToSprint);

module.exports = router; 