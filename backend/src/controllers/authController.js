const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { createError } = require('../utils/error');

// Register new user
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phoneNumber, gender, companyName, status } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(createError(400, 'Email đã được đăng ký'));
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'partner',
      phoneNumber,
      gender,
      companyName,
      status,
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { _id: user._id, userID: user.userID, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: 'Đăng ký thành công',
      token,
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

// Login user
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return next(createError(401, 'Email hoặc mật khẩu không đúng'));
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(createError(401, 'Email hoặc mật khẩu không đúng'));
    }

    // Generate JWT token
    const token = jwt.sign(
      { _id: user._id, userID: user.userID, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

// Get current user
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return next(createError(404, 'Không tìm thấy người dùng'));
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
}; 