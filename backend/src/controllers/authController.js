const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { createError } = require('../utils/error');
const { sendOTP } = require('../utils/email');
const { registerSchema, loginSchema, otpSchema, changePasswordSchema } = require('../utils/validation');

// Helper: sinh OTP 6 số
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: kiểm tra số lần nhập OTP
const MAX_OTP_ATTEMPTS = 5;
async function handleOTPAttempts(user) {
  user.otp_attempts = (user.otp_attempts || 0) + 1;
  if (user.otp_attempts >= MAX_OTP_ATTEMPTS) {
    user.status = 'locked';
  }
  await user.save();
}

// Helper: sinh accessToken và refreshToken
function createAccessToken(user) {
  return jwt.sign(
    { _id: user._id, userID: user.userID, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );
}
function createRefreshToken(user) {
  return jwt.sign(
    { _id: user._id, userID: user.userID, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Register new user
exports.register = async (req, res, next) => {
  // Joi validate
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return next(createError(400, 'Dữ liệu không hợp lệ: ' + error.details.map(d => d.message).join(', ')));
  }
  try {
    const { name, email, password, role, phoneNumber, gender, companyName, status } = req.body;

    // Check if user already exists with active status
    const existingUser = await User.findOne({ email, status: 'active' });
    if (existingUser) {
      return next(createError(400, 'Email đã được đăng ký'));
    }

    // Nếu có user pending, xóa và tạo lại
    const pendingUser = await User.findOne({ email, status: 'pending' });
    if (pendingUser) {
      await User.findByIdAndDelete(pendingUser._id);
    }

    // Tạo OTP trước
    const otp = generateOTP();
    const otp_expired = new Date(Date.now() + 5 * 60 * 1000);

    // Tạo user mới với status pending
    const user = new User({
      name,
      email,
      password,
      role: role || 'other',
      phoneNumber,
      gender,
      companyName,
      status: 'pending', // Chưa active
      is_mfa_enabled: true,
      mfa_type: 'email',
      otp_code: otp,
      otp_expired: otp_expired,
      otp_attempts: 0,
    });

    await user.save();

    // Gửi OTP
    try {
      await sendOTP(user.email, otp);
    } catch (emailError) {
      // Nếu gửi email thất bại, xóa user tạm thời
      await User.findByIdAndDelete(user._id);
      return next(createError(500, 'Không thể gửi email OTP. Vui lòng thử lại.'));
    }

    res.status(201).json({
      message: 'Vui lòng kiểm tra email để lấy mã OTP xác thực.',
      mfa: true,
      userId: user._id
    });
  } catch (error) {
    next(error);
  }
};

// Login user
exports.login = async (req, res, next) => {
  // Joi validate
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return next(createError(400, 'Dữ liệu không hợp lệ: ' + error.details.map(d => d.message).join(', ')));
  }
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return next(createError(400, 'Email hoặc mật khẩu không đúng'));
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(createError(400, 'Email hoặc mật khẩu không đúng'));
    }

    // Nếu tài khoản bị khóa
    if (user.status === 'locked') {
      return next(createError(403, 'Tài khoản đã bị khóa do nhập sai OTP quá nhiều lần'));
    }

    // Nếu bật 2FA
    if (user.is_mfa_enabled) {
      const otp = generateOTP();
      const otp_expired = new Date(Date.now() + 5 * 60 * 1000);
      user.otp_code = otp;
      user.otp_expired = otp_expired;
      user.otp_attempts = 0;
      await user.save();
      await sendOTP(user.email, otp);
      return res.status(200).json({
        message: 'MFA đã được bật, vui lòng nhập mã OTP đã gửi qua email để hoàn tất đăng nhập.',
        mfa: true,
        userId: user._id
      });
    }

    // Nếu không bật 2FA, đăng nhập bình thường
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    res.json({
      message: 'Đăng nhập thành công',
      accessToken,
      refreshToken,
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

// Xác thực OTP khi đăng nhập
exports.verifyOTP = async (req, res, next) => {
  // Joi validate
  const { error } = otpSchema.validate(req.body);
  if (error) {
    return next(createError(400, 'Dữ liệu không hợp lệ: ' + error.details.map(d => d.message).join(', ')));
  }
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);
    if (!user) return next(createError(404, 'Không tìm thấy user'));
    
    // Cleanup users pending quá 10 phút
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    await User.deleteMany({ 
      status: 'pending', 
      createdAt: { $lt: tenMinutesAgo } 
    });
    
    if (user.status === 'locked') {
      return next(createError(403, 'Tài khoản đã bị khóa do nhập sai OTP quá nhiều lần'));
    }
    if (!user.is_mfa_enabled || user.mfa_type !== 'email') {
      return next(createError(400, 'Sai loại xác thực hoặc chưa bật xác thực 2 lớp'));
    }
    if (!user.otp_code || !user.otp_expired) {
      return next(createError(400, 'OTP chưa được gửi hoặc đã hết hạn'));
    }
    if (user.otp_code !== otp || new Date() > user.otp_expired) {
      await handleOTPAttempts(user);
      return next(createError(400, 'OTP không đúng hoặc đã hết hạn'));
    }
    
    // Xác thực thành công - kích hoạt tài khoản
    user.status = 'active'; // Kích hoạt tài khoản
    user.otp_code = null;
    user.otp_expired = null;
    user.otp_attempts = 0;
    await user.save();
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    const userResponse = user.toObject();
    delete userResponse.password;
    res.json({
      message: 'Xác thực OTP thành công',
      accessToken,
      refreshToken,
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

// Bật 2FA
exports.enable2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(createError(404, 'Không tìm thấy user'));
    user.is_mfa_enabled = true;
    user.mfa_type = 'email';
    await user.save();
    res.json({ message: 'Đã bật xác minh 2 lớp (2FA) qua email.' });
  } catch (error) {
    next(error);
  }
};

// Tắt 2FA
exports.disable2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(createError(404, 'Không tìm thấy user'));
    user.is_mfa_enabled = false;
    user.mfa_type = undefined;
    user.otp_code = undefined;
    user.otp_expired = undefined;
    user.otp_attempts = 0;
    await user.save();
    res.json({ message: 'Đã tắt xác minh 2 lớp (2FA).' });
  } catch (error) {
    next(error);
  }
};

// Gửi lại OTP (cho cả user pending và user active có 2FA)
exports.resendOTP = async (req, res, next) => {
  // Joi validate (chỉ cần email, dùng loginSchema)
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return next(createError(400, 'Dữ liệu không hợp lệ: ' + error.details.map(d => d.message).join(', ')));
  }
  try {
    const { email } = req.body;
    // Tìm user pending
    let user = await User.findOne({ email, status: 'pending' });
    if (!user) {
      // Nếu không có user pending, tìm user active có 2FA
      user = await User.findOne({ email, status: 'active', is_mfa_enabled: true });
    }
    if (!user) {
      return next(createError(404, 'Không tìm thấy tài khoản đang chờ xác thực hoặc đang bật 2FA'));
    }
    // Tạo OTP mới
    const otp = generateOTP();
    const otp_expired = new Date(Date.now() + 5 * 60 * 1000);
    user.otp_code = otp;
    user.otp_expired = otp_expired;
    user.otp_attempts = 0;
    await user.save();
    // Gửi OTP mới
    try {
      await sendOTP(user.email, otp);
    } catch (emailError) {
      return next(createError(500, 'Không thể gửi email OTP. Vui lòng thử lại.'));
    }
    res.json({
      message: 'Đã gửi lại mã OTP, vui lòng kiểm tra email.',
      userId: user._id
    });
  } catch (error) {
    next(error);
  }
};

// Endpoint: refresh token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Thiếu refreshToken' });
    }
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Refresh token không hợp lệ hoặc đã hết hạn' });
    }
    // Có thể kiểm tra thêm user tồn tại, trạng thái active...
    const user = await require('../models/User').findById(decoded._id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy user' });
    }
    const accessToken = createAccessToken(user);
    res.json({ accessToken });
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