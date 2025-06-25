const User = require('../models/User');
const { createError } = require('../utils/error');

// Bật xác thực 2 lớp
exports.enable2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(createError(404, 'User not found'));
    if (user.is_mfa_enabled) return res.status(200).json({ message: '2FA đã được bật.' });
    user.is_mfa_enabled = true;
    await user.save();
    res.status(200).json({ message: 'Đã bật xác thực 2 lớp (2FA).' });
  } catch (error) {
    next(error);
  }
};

// Tắt xác thực 2 lớp
exports.disable2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(createError(404, 'User not found'));
    if (!user.is_mfa_enabled) return res.status(200).json({ message: '2FA đã tắt sẵn.' });
    user.is_mfa_enabled = false;
    await user.save();
    res.status(200).json({ message: 'Đã tắt xác thực 2 lớp (2FA).' });
  } catch (error) {
    next(error);
  }
}; 