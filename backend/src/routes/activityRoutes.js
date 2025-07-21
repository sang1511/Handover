const express = require('express');
const { getUserActivity } = require('../controllers/activityController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/activities
// @desc    Lấy hoạt động gần đây của người dùng
// @access  Private
router.get('/', authenticate, getUserActivity);

module.exports = router; 