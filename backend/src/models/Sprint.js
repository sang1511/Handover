const mongoose = require('mongoose');

const SprintHistorySchema = new mongoose.Schema({
  action: String, // create, update, delete, review, etc.
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' }, // liên quan task nào (nếu có)
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  comment: String
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
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
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