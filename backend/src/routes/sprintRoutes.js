const express = require('express');
const router = express.Router();
const sprintController = require('../controllers/sprintController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', authenticate, sprintController.getSprintsByProjectId);
router.get('/project-info', authenticate, sprintController.getProjectInfo);
router.post('/', authenticate, upload.array('deliverables'), sprintController.createSprint);
router.get('/:sprintId/deliverables/:fileId/download', authenticate, sprintController.downloadSprintDeliverable);
router.post('/:sprintId/upload-deliverable', authenticate, upload.array('deliverables'), sprintController.uploadSprintDeliverable);
router.post('/:sprintId/tasks', authenticate, sprintController.addTaskToSprint);
router.post('/:sprintId/tasks/bulk', authenticate, sprintController.addTasksBulkToSprint);
router.put('/tasks/:taskId/status', authenticate, sprintController.updateTaskStatus);
router.put('/tasks/:taskId/review', authenticate, sprintController.updateTaskReview);
router.post('/:sprintId/notes', authenticate, sprintController.addNoteToSprint);
router.delete('/:sprintId/deliverables/:fileId', authenticate, sprintController.deleteSprintDeliverable);
router.put('/:sprintId/acceptance-status', authenticate, sprintController.updateAcceptanceStatus);

module.exports = router; 