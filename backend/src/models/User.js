const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Function to generate random 8-digit number
const generateUserID = async () => {
  let userID;
  let isUnique = false;
  
  while (!isUnique) {
    // Generate random 8-digit number
    userID = Math.floor(10000000 + Math.random() * 90000000).toString();
    
    // Check if userID already exists
    const existingUser = await mongoose.model('User').findOne({ userID });
    if (!existingUser) {
      isUnique = true;
    }
  }
  
  return userID;
};

const userSchema = new mongoose.Schema(
  {
    userID: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'pm', 'ba', 'developer', 'tester', 'other'],
      default: 'other',
    },
    phoneNumber: {
      type: String,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    companyName: {
      type: String,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'locked', 'pending'],
      default: 'active',
    },
    is_mfa_enabled: {
      type: Boolean,
      default: false,
    },
    mfa_type: {
      type: String,
      enum: ['email'],
    },
    otp_code: {
      type: String,
    },
    otp_expired: {
      type: Date,
    },
    otp_attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Generate userID before validation
userSchema.pre('validate', async function (next) {
  if (this.isNew && !this.userID) {
    this.userID = await generateUserID();
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 