const mongoose = require('mongoose');

const TaskHistorySchema = new mongoose.Schema({
  action: { type: String, required: false },
  description: { type: String, required: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  isPrimary: { type: Boolean, default: false },
});

const TaskSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  goal: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { 
    type: String, 
    enum: ['Chưa làm', 'Đang làm', 'Đã xong'],
    default: 'Chưa làm'
  },
  reviewStatus: {
    type: String,
    enum: ['Chưa', 'Đạt', 'Không đạt'],
    default: 'Chưa'
  },
  sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint', required: true },
  history: [TaskHistorySchema]
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema); 