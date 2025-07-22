const mongoose = require('mongoose');

const SprintHistorySchema = new mongoose.Schema({
  action: { type: String, required: false },
  description: { type: String, required: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  isPrimary: { type: Boolean, default: false },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
});

const SprintSchema = new mongoose.Schema({
  name: { type: String, required: true },
  goal: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành'],
    default: 'Chưa bắt đầu'
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String }
  }],
  release: { type: mongoose.Schema.Types.ObjectId, ref: 'Release', required: true },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  docs: [{
    url: String, // Cloudinary url
    publicId: String, // Cloudinary public_id
    fileName: String,
    fileSize: Number,
    contentType: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  repoLink: { type: String },
  gitBranch: { type: String },
  history: [SprintHistorySchema]
}, { timestamps: true });

module.exports = mongoose.model('Sprint', SprintSchema);