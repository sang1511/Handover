const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createError } = require('../utils/error');

// Authentication middleware
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(createError(401, 'Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get full user information from database
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
};

// Role-based authorization middleware
exports.authorize = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(createError(403, 'Not authorized to access this resource'));
    }
    next();
  };
}; 