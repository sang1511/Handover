const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createError } = require('../utils/error');
const { verifyToken } = require('../utils/token');

// Authentication middleware
// Chỉ xác thực accessToken (không dùng refreshToken)
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return next(createError(401, 'Authentication required'));
    }
    // Sử dụng verifyToken util để kiểm tra token, audience, issuer
    const decoded = verifyToken(token, process.env.JWT_SECRET, {
      audience: process.env.JWT_AUDIENCE,
      issuer: process.env.JWT_ISSUER
    });
    const user = await User.findById(decoded.id || decoded._id);
    if (!user) {
      return next(createError(401, 'User not found'));
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(createError(401, 'Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(createError(401, 'Token expired'));
    }
    next(error);
  }
}

// Role-based authorization middleware
exports.authorize = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(createError(403, 'Not authorized to access this resource'));
    }
    next();
  };
}; 