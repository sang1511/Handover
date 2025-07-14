const mongoose = require('mongoose');

const ReleaseHistorySchema = new mongoose.Schema({
  action: String, // create, update, delete, acceptance, upload_doc, etc.
  sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' }, // liên quan sprint nào (nếu có)
  doc: { type: String }, // tên file tài liệu (nếu có)
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  comment: String
});

const ReleaseSchema = new mongoose.Schema({
  releaseId: { type: String, required: true, unique: true },
  version: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  status: { 
    type: String, 
    enum: ['Chưa bắt đầu', 'Đang chuẩn bị', 'Hoàn thành'],
    default: 'Chưa bắt đầu'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  acceptanceStatus: {
    type: String,
    enum: ['Chưa', 'Đạt', 'Không đạt'],
    default: 'Chưa'
  },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Người bàn giao
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },   // Người nhận bàn giao
  docs: [{
    fileId: { type: mongoose.Schema.Types.ObjectId },
    fileName: String,
    fileSize: Number,
    contentType: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  repoLink: String,
  gitBranch: String,
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
  history: [ReleaseHistorySchema]
}, { timestamps: true });

module.exports = mongoose.model('Release', ReleaseSchema); 