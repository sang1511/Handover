const mongoose = require('mongoose');
const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  type: { type: String, default: 'text' },
  fileUrl: String,
  fileName: String,
  fileSize: Number,
  fileType: String,
  publicId: String, // Cloudinary publicId
  contentType: String, // Cloudinary contentType
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });
module.exports = mongoose.model('Message', MessageSchema); 