const mongoose = require('mongoose');

const ReleaseHistorySchema = new mongoose.Schema({
  action: { type: String, required: false },
  description: { type: String, required: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  isPrimary: { type: Boolean, default: false },
  sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
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
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Người bàn giao
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },   // Người nhận bàn giao
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Người nghiệm thu
  docs: [{
    url: String, // Cloudinary url
    publicId: String, // Cloudinary public_id
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