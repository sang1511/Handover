const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const { enable2FA, disable2FA } = require('../controllers/userController');

// GET /api/users/check-id/:userID - Check if a userID exists and return the user's name
router.get('/check-id/:userID', async (req, res) => {
  try {
    const userID = req.params.userID;

    if (!userID) {
      return res.status(400).json({ message: 'UserID is required' });
    }

    const user = await User.findOne({ userID: userID }).select('name');

    if (user) {
      res.json({ name: user.name });
    } else {
      res.status(404).json({ message: 'Người dùng không tồn tại.' });
    }
  } catch (error) {
    console.error('Error checking UserID:', error);
    res.status(500).json({ 
      message: 'Lỗi máy chủ khi kiểm tra người dùng.',
      error: error.message
    });
  }
});

// Get all users (admin only)
router.get('/', authenticate, async (req, res) => {
  try {
    const query = {};
    if (req.query.role) {
      query.role = req.query.role;
    }
    if (req.query.userID) {
      query.userID = req.query.userID;
    }
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all registered emails
router.get('/emails', authenticate, async (req, res) => {
  try {
    const users = await User.find().select('email name role userID');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user by ID or userID
router.get('/:id', authenticate, async (req, res) => {
  try {
    let user;
    // Check if the id is a MongoDB ObjectId
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(req.params.id).select('-password');
    } else {
      // If not, search by userID
      user = await User.findOne({ userID: req.params.id }).select('-password');
    }
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user by ID
router.put('/:id', authenticate, async (req, res) => {
  // Chỉ cho phép chính user hoặc admin sửa
  if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
    return res.status(403).json({ message: 'Bạn không có quyền sửa thông tin user này.' });
  }
  try {
    let updateFields = {};
    const { name, role, gender, email, phoneNumber, companyName, status } = req.body;

    // Nếu là admin, cho phép cập nhật tất cả các trường
    if (req.user.role === 'admin') {
      updateFields = { name, gender, email, phoneNumber, companyName };
      // Chỉ cho phép admin đổi status
      if (typeof status !== 'undefined') {
        updateFields.status = status;
      }
      // Chỉ cho phép admin đổi role thành admin hoặc role khác (không cho user thường tự đổi role thành admin)
      if (typeof role !== 'undefined') {
        // Nếu cập nhật role thành admin, chỉ admin mới được phép
        if (role === 'admin') {
          updateFields.role = 'admin';
        } else {
          updateFields.role = role;
        }
      }
    } else {
      // User thường chỉ được đổi thông tin cá nhân
      updateFields = { name, gender, email, phoneNumber, companyName };
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/enable-2fa', authenticate, enable2FA);
router.post('/disable-2fa', authenticate, disable2FA);

module.exports = router; 