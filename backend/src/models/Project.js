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
    fileUrl: String,
    fileName: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  pullRequest: String,
  gitBranch: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  handedOverTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  status: { 
    type: String, 
    enum: ['Khởi tạo', 'Đã bàn giao(một phần)','Đã bàn giao', 'Đang thực hiện', 'Hoàn thành'],
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