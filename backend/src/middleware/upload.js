const multer = require('multer');

// Use memory storage for GridFS processing
const storage = multer.memoryStorage();

// Configure multer for file uploads
const upload = multer({
  storage: storage,
  // limits: {
  //   fileSize: 50 * 1024 * 1024, // 50MB limit
  //   files: 10 // Maximum 10 files at once
  // },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now, you can add restrictions here
    cb(null, true);
  }
});

module.exports = upload; 