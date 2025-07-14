const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');

// CRUD Task
router.post('/', authenticate, taskController.createTask);
router.get('/by-sprint/:sprintId', authenticate, taskController.getTasksBySprint);
router.get('/:id', authenticate, taskController.getTask);
router.put('/:id', authenticate, taskController.updateTask);
router.delete('/:id', authenticate, taskController.deleteTask);

// Update status/review
router.put('/:id/status', authenticate, taskController.updateTaskStatus);
router.put('/:id/review-status', authenticate, taskController.updateTaskReviewStatus);

module.exports = router; 