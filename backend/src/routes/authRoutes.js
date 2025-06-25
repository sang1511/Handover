const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Register new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Get current user
router.get('/me', authenticate, authController.getCurrentUser);

// Xác thực OTP
router.post('/verify-otp', authController.verifyOTP);

// Gửi lại OTP
router.post('/resend-otp', authController.resendOTP);

// Bật 2FA
router.post('/enable-2fa', authenticate, authController.enable2FA);

// Tắt 2FA
router.post('/disable-2fa', authenticate, authController.disable2FA);

module.exports = router; 