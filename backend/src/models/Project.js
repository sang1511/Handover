const mongoose = require('mongoose');

const ProjectHistorySchema = new mongoose.Schema({
  action: { type: String, required: false }, // Giữ lại để tương thích, nhưng không ghi mới
  description: { type: String, required: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  isPrimary: { type: Boolean, default: false }, // Cờ đánh dấu log chính
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
  release: { type: mongoose.Schema.Types.ObjectId, ref: 'Release' },
  sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
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