const express = require('express');
const router = express.Router();
const sprintController = require('../controllers/sprintController');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.get('/', authenticate, sprintController.getSprintsByProjectId);
router.post('/', authenticate, upload.array('deliverables'), sprintController.createSprint);
router.get('/:sprintId/download-deliverable', authenticate, sprintController.downloadSprintDeliverable);
router.post('/:sprintId/upload-deliverable', authenticate, upload.array('deliverables'), sprintController.uploadSprintDeliverable);
router.post('/:sprintId/tasks', authenticate, sprintController.addTaskToSprint);
router.put('/tasks/:taskId/status', authenticate, sprintController.updateTaskStatus);
router.put('/tasks/:taskId/review', authenticate, sprintController.updateTaskReview);
router.post('/:sprintId/notes', authenticate, sprintController.addNoteToSprint);

module.exports = router; 