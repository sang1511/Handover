const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');

let bucket;

// Initialize GridFS bucket when MongoDB connection is ready
mongoose.connection.once('open', () => {
  bucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads'
  });
});

// Upload file to GridFS
const uploadFile = async (file, metadata = {}) => {
  if (!bucket) {
    throw new Error('GridFS bucket not initialized');
  }

  const uploadStream = bucket.openUploadStream(file.originalname, {
    metadata: {
      ...metadata,
      originalName: file.originalname,
      contentType: file.mimetype,
      size: file.size,
      uploadedAt: new Date()
    }
  });

  return new Promise((resolve, reject) => {
    const readable = new Readable();
    readable._read = () => {}; // Required for Readable streams
    readable.push(file.buffer);
    readable.push(null);

    readable.pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => {
        resolve({
          fileId: uploadStream.id,
          filename: uploadStream.filename,
          metadata: uploadStream.options.metadata
        });
      });
  });
};

// Download file from GridFS
const downloadFile = async (fileId) => {
  if (!bucket) {
    throw new Error('GridFS bucket not initialized');
  }

  const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
  
  return new Promise((resolve, reject) => {
    const chunks = [];
    
    downloadStream.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    downloadStream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve({
        buffer,
        metadata: downloadStream.options.metadata
      });
    });
    
    downloadStream.on('error', reject);
  });
};

// Get file info from GridFS
const getFileInfo = async (fileId) => {
  if (!bucket) {
    throw new Error('GridFS bucket not initialized');
  }

  const files = bucket.find({ _id: new mongoose.Types.ObjectId(fileId) });
  const fileArray = await files.toArray();
  
  if (fileArray.length === 0) {
    throw new Error('File not found');
  }
  
  return fileArray[0];
};

// Delete file from GridFS
const deleteFile = async (fileId) => {
  if (!bucket) {
    throw new Error('GridFS bucket not initialized');
  }

  await bucket.delete(new mongoose.Types.ObjectId(fileId));
};

// Create download stream for serving files
const createDownloadStream = (fileId) => {
  if (!bucket) {
    throw new Error('GridFS bucket not initialized');
  }

  return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
};

module.exports = {
  uploadFile,
  downloadFile,
  getFileInfo,
  deleteFile,
  createDownloadStream,
  bucket: () => bucket
}; 