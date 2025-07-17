const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'project_files',
    // allowed_formats: ['jpg', 'png', 'pdf', 'doc', 'docx', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', 'txt', 'csv'],
    resource_type: 'raw',
  },
});

const upload = multer({ storage });

module.exports = upload; 