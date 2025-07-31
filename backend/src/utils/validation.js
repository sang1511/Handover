const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid('user', 'admin', 'pm', 'ba', 'developer', 'tester', 'other').optional(),
  phoneNumber: Joi.string().optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  companyName: Joi.string().optional(),
  status: Joi.string().valid('active', 'pending', 'locked').optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const otpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required()
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).max(128).required()
});

module.exports = {
  registerSchema,
  loginSchema,
  otpSchema,
  changePasswordSchema
};
