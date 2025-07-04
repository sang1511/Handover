const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    unique: true,
  },
  name: { type: String, required: true },
  description: { type: String, required: true },
  deadline: { type: Date, required: true },
  files: [{
    fileId: { type: mongoose.Schema.Types.ObjectId },
    fileName: { type: String },
    fileSize: { type: Number },
    contentType: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  repoLink: String,
  gitBranch: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  handedOverTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  status: { 
    type: String, 
    enum: ['Khởi tạo', 'Đang thực hiện', 'Đã bàn giao', 'Hoàn thành'],
    default: 'Khởi tạo'
  },
  history: [{
    action: String, 
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);