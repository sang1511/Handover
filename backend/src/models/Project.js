const mongoose = require('mongoose');

const ProjectHistorySchema = new mongoose.Schema({
  action: String, // create, update, handover, upload_doc, delete_doc, etc.
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' }, // liên quan module nào (nếu có)
  doc: { type: String }, // tên file tài liệu (nếu có)
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  comment: String
});

const ProjectSchema = new mongoose.Schema({
  projectId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  version: { type: String },
  status: { 
    type: String, 
    enum: ['Chờ xác nhận', 'Khởi tạo', 'Đang triển khai', 'Hoàn thành'],
    default: 'Chờ xác nhận'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  overviewDocs: [{
    url: String, // Cloudinary url
    publicId: String, // Cloudinary public_id
    fileName: String,
    fileSize: Number,
    contentType: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  history: [ProjectHistorySchema]
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);