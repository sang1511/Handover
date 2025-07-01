const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  taskId: { type: String, required: true }, 
  name: { type: String, required: true }, 
  assigner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  status: { 
    type: String, 
    enum: ['Chưa làm', 'Đang làm', 'Đã xong'], 
    default: 'Chưa làm' 
  },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  reviewResult: { 
    type: String, 
    enum: ['Đạt', 'Không đạt', 'Chưa duyệt'], 
    default: 'Chưa duyệt' 
  }, 
  description: String,
  history: [{
    action: String, 
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now }
  }]
});

const SprintSchema = new mongoose.Schema({
  name: { type: String, required: true },
  goal: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  gitBranch: { type: String },
  repoLink: { type: String },
  status: { type: String, enum: ['Chưa bắt đầu', 'Đang chạy', 'Đã kết thúc'], default: 'Chưa bắt đầu' },
  acceptanceStatus: { type: String, enum: ['Chưa nghiệm thu', 'Đã nghiệm thu'], default: 'Chưa nghiệm thu' },
  notes: [{ 
    content: String, 
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    createdAt: { type: Date, default: Date.now } 
  }],
  deliverables: [{
    fileId: { type: mongoose.Schema.Types.ObjectId },
    fileName: { type: String },
    fileSize: { type: Number },
    contentType: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  tasks: [TaskSchema],
  history: [{
    action: String,
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Sprint', SprintSchema);