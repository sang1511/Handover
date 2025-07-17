const mongoose = require('mongoose');

const ModuleHistorySchema = new mongoose.Schema({
  action: String, // create, update, handover, upload_doc, delete_doc, acceptance, etc.
  release: { type: mongoose.Schema.Types.ObjectId, ref: 'Release' }, // liên quan release nào (nếu có)
  doc: { type: String }, // tên file tài liệu (nếu có)
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  comment: String
});

const ModuleSchema = new mongoose.Schema({
  moduleId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  docs: [{
    url: String, // Cloudinary url
    publicId: String, // Cloudinary public_id
    fileName: String,
    fileSize: Number,
    contentType: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  version: { type: String },
  status: { 
    type: String, 
    enum: ['Chưa phát triển', 'Đang phát triển', 'Hoàn thành'],
    default: 'Chưa phát triển'
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  history: [ModuleHistorySchema]
}, { timestamps: true });

module.exports = mongoose.model('Module', ModuleSchema); 