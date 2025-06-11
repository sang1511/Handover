const Project = require('../models/Project');
const { createError } = require('../utils/error');
const User = require('../models/User');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const archiver = require('archiver');

// Create a new project
exports.createProject = async (req, res, next) => {
  try {
    // Validate required fields
    const { name, description, deadline, handedOverTo, projectId } = req.body;
    if (!name || !description || !deadline || !handedOverTo || !projectId) {
      return next(createError(400, 'Vui lòng điền đầy đủ thông tin bắt buộc'));
    }

    // Check if handedOverTo user exists
    const recipient = await User.findOne({ userID: handedOverTo });
    if (!recipient) {
      return next(createError(400, 'Người nhận bàn giao không tồn tại'));
    }

    // Check if projectId already exists
    const existingProject = await Project.findOne({ projectId });
    if (existingProject) {
      return next(createError(400, 'Mã dự án đã tồn tại'));
    }

    // Process files if any
    const files = req.files ? req.files.map(file => ({
      fileUrl: file.path,
      fileName: file.originalname,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    })) : [];

    // Create project
    const project = new Project({
      name,
      projectId,
      description,
      deadline,
      pullRequest: req.body.pullRequest || '',
      gitBranch: req.body.gitBranch || '',
      createdBy: req.user._id,
      handedOverTo: recipient._id,
      status: 'Khởi tạo',
      files,
      history: [{
        action: 'create',
        field: 'status',
        oldValue: null,
        newValue: 'Khởi tạo',
        updatedBy: req.user._id,
        updatedAt: new Date()
      }]
    });

    await project.save();

    // Populate necessary fields
    await project.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'handedOverTo', select: 'name email' }
    ]);

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    if (error.name === 'ValidationError') {
      return next(createError(400, error.message));
    }
    next(error);
  }
};

// Get all projects (filtered by role)
exports.getProjects = async (req, res, next) => {
  try {
    let query = {};
    
    // Filter based on user role
    if (req.user.role === 'partner') {
      query.createdBy = req.user._id;
    } else if (req.user.role === 'staff') {
      query.assignedStaff = req.user._id;
    }
    
    // Filter by status if provided
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    console.log('Query:', query);
    console.log('User:', req.user);

    const projects = await Project.find(query)
      .populate('createdBy', 'name email')
      .populate('handedOverTo', 'name email')
      .populate('files')
      .sort({ createdAt: -1 });

    console.log('Found projects:', projects.length);

    res.json(projects);
  } catch (error) {
    console.error('Error in getProjects:', error);
    if (error.name === 'ValidationError') {
      return next(createError(400, error.message));
    }
    next(error);
  }
};

// Get a single project
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .populate('files')
      .populate('comments.user', 'name email');

    if (!project) {
      return next(createError(404, 'Project not found'));
    }

    // Check if user has permission to view
    if (req.user.role !== 'admin' && 
        project.sender._id.toString() !== req.user._id.toString() && 
        project.recipient?._id.toString() !== req.user._id.toString()) {
      return next(createError(403, 'Not authorized to view this project'));
    }

    res.json(project);
  } catch (error) {
    next(error);
  }
};

// Update project status
exports.updateProjectStatus = async (req, res, next) => {
  try {
    const { status, assignedStaff, recipient } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return next(createError(404, 'Project not found'));
    }

    // Check if user has permission to update status based on role and status transition
    const isAuthorized = (() => {
      // Admin can do everything
      if (req.user.role === 'admin') return true;

      // Partner can only update their own projects
      if (req.user.role === 'partner') {
        return project.sender._id.toString() === req.user._id.toString();
      }

      // Staff can only update their assigned projects
      if (req.user.role === 'staff') {
        return project.assignedStaff?.some(staff => staff._id.toString() === req.user._id.toString());
      }

      // Leader can:
      // 1. Update any project with status 'sent' (assign, reject, return)
      // 2. Update any project with status 'done' (approve, needfix)
      if (req.user.role === 'leader') {
        if (status === 'assigned' || status === 'rejected' || status === 'returned') {
          return project.status === 'sent';
        }
        if (status === 'approved' || status === 'needfix') {
          return project.status === 'done';
        }
      }

      return false;
    })();

    if (!isAuthorized) {
      return next(createError(403, 'Not authorized to update this project'));
    }

    // Handle staff assignment
    if (status === 'assigned' && assignedStaff && Array.isArray(assignedStaff)) {
      // Validate that all assignedStaff are valid staff users
      const staffUsers = await User.find({ _id: { $in: assignedStaff }, role: 'staff' });
      if (staffUsers.length !== assignedStaff.length) {
        return next(createError(400, 'Invalid staff IDs provided'));
      }
      
      // Update the project with assigned staff
      project.assignedStaff = assignedStaff;
      
      // If recipient is provided, update it
      if (recipient) {
        project.recipient = recipient;
      }
    }

    project.status = status;
    await project.save();

    // Populate all necessary fields before sending response
    await project.populate([
      { path: 'sender', select: 'name email' },
      { path: 'recipient', select: 'name email' },
      { path: 'files' },
      { path: 'assignedStaff', select: 'name email' }
    ]);

    res.json(project);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return next(createError(400, error.message));
    }
    next(error);
  }
};

// Add comment to project
exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return next(createError(404, 'Project not found'));
    }

    project.comments.push({
      user: req.user._id,
      text
    });

    await project.save();
    res.json(project);
  } catch (error) {
    next(error);
  }
};

// Delete project
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return next(createError(404, 'Project not found'));
    }

    // Check if user has permission to delete
    if (req.user.role !== 'admin' && 
        project.sender._id.toString() !== req.user._id.toString()) {
      return next(createError(403, 'Not authorized to delete this project'));
    }

    await project.remove();
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Download project files
exports.downloadProjectFiles = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('files');

    if (!project) {
      return next(createError(404, 'Project not found'));
    }

    // Check if user has permission to download
    if (req.user.role !== 'admin' && 
        project.sender._id.toString() !== req.user._id.toString() && 
        project.recipient?._id.toString() !== req.user._id.toString()) {
      return next(createError(403, 'Not authorized to download files from this project'));
    }

    // Create a zip file containing all project files
    const archiver = require('archiver');
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    res.attachment(`${project.projectName}_files.zip`);
    archive.pipe(res);

    for (const file of project.files) {
      archive.file(file.path, { name: file.originalName });
    }

    await archive.finalize();
  } catch (error) {
    next(error);
  }
};

// Create new handover
exports.createHandover = async (req, res, next) => {
  try {
    const { projectName, description, type, recipient, files } = req.body;

    // Validate required fields
    if (!projectName || !description || !type || !recipient) {
      return next(createError(400, 'Missing required fields'));
    }

    // Validate files array
    if (!files || !Array.isArray(files) || files.length === 0) {
      return next(createError(400, 'At least one file is required'));
    }

    const recipientUser = await User.findById(recipient);

    const handover = new Project({
      projectName,
      description,
      type,
      recipient,
      files,
      status: 'sent', // Default status for new handover
      sender: req.user._id
    });

    const savedHandover = await handover.save();
    
    // Populate sender and recipient information
    await savedHandover.populate([
      { path: 'sender', select: 'name email' },
      { path: 'recipient', select: 'name email' },
      { path: 'files' }
    ]);

    res.status(201).json(savedHandover);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return next(createError(400, error.message));
    }
    next(error);
  }
};

// Get all handovers
exports.getHandovers = async (req, res, next) => {
  try {
    let query = {};
    
    // Filter by role
    if (req.user.role === 'staff') {
      query.assignedStaff = req.user._id;
      query.status = { $in: ['assigned', 'in_progress', 'done', 'needfix'] };
    } else if (req.user.role === 'partner') {
      query.sender = req.user._id;
    } else if (req.user.role === 'leader') {
      query.$or = [
        { recipient: req.user._id },
        { status: 'sent' }
      ];
    }

    // Filter by status if provided
    if (req.query.status) {
      if (req.user.role === 'leader') {
        // Map display status back to actual status for Leader
        switch (req.query.status) {
          case 'received':
            query.status = 'sent';
            break;
          case 'reviewing':
            query.status = 'done';
            break;
          case 'in_progress':
            query.status = 'in_progress';
            break;
          case 'needfix':
            query.status = 'needfix';
            break;
          case 'approved':
            query.status = 'approved';
            break;
          case 'returned':
            query.status = 'returned';
            break;
          case 'rejected':
            query.status = 'rejected';
            break;
          case 'assigned':
            query.status = 'assigned';
            break;
          default:
            query.status = req.query.status;
        }
      } else if (req.user.role === 'partner') {
        // Map display status back to actual status for Partner
        switch (req.query.status) {
          case 'approved':
            query.status = 'assigned';
            break;
          case 'processing':
            query.status = { $in: ['in_progress', 'done', 'needfix'] };
            break;
          case 'completed':
            query.status = 'approved';
            break;
          default:
            query.status = req.query.status;
        }
      } else if (req.user.role === 'staff') {
        // Map display status back to actual status for Staff
        switch (req.query.status) {
          case 'returned':
            query.status = 'needfix';
            break;
          default:
            query.status = req.query.status;
        }
      }
    }

    const handovers = await Project.find(query)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .populate('files')
      .populate('assignedStaff', 'name email')
      .sort({ createdAt: -1 });
    
    // Map status for each role
    const mappedHandovers = handovers.map(handover => {
      const handoverObj = handover.toObject();
      
      // Map status based on role
      switch (req.user.role) {
        case 'leader':
          switch (handover.status) {
            case 'sent':
              handoverObj.displayStatus = 'received';
              break;
            case 'in_progress':
              handoverObj.displayStatus = 'in_progress';
              break;
            case 'done':
              handoverObj.displayStatus = 'reviewing';
              break;
            case 'needfix':
              handoverObj.displayStatus = 'needfix';
              break;
            case 'approved':
              handoverObj.displayStatus = 'approved';
              break;
            case 'returned':
              handoverObj.displayStatus = 'returned';
              break;
            case 'rejected':
              handoverObj.displayStatus = 'rejected';
              break;
            case 'assigned':
              handoverObj.displayStatus = 'assigned';
              break;
            default:
              handoverObj.displayStatus = handover.status;
          }
          break;
        
        case 'partner':
          switch (handover.status) {
            case 'sent':
              handoverObj.displayStatus = 'sent';
              break;
            case 'assigned':
              handoverObj.displayStatus = 'approved';
              break;
            case 'in_progress':
            case 'done':
            case 'needfix':
              handoverObj.displayStatus = 'processing';
              break;
            case 'approved':
              handoverObj.displayStatus = 'completed';
              break;
            case 'returned':
              handoverObj.displayStatus = 'returned';
              break;
            case 'rejected':
              handoverObj.displayStatus = 'rejected';
              break;
            default:
              handoverObj.displayStatus = handover.status;
          }
          break;
        
        case 'staff':
          switch (handover.status) {
            case 'assigned':
              handoverObj.displayStatus = 'assigned';
              break;
            case 'in_progress':
              handoverObj.displayStatus = 'in_progress';
              break;
            case 'done':
              handoverObj.displayStatus = 'done';
              break;
            case 'needfix':
              handoverObj.displayStatus = 'needfix';
              break;
            case 'returned':
              handoverObj.displayStatus = 'needfix';
              break;
            default:
              handoverObj.displayStatus = handover.status;
          }
          break;
        
        default:
          handoverObj.displayStatus = handover.status;
      }
      
      return handoverObj;
    });
    
    res.json(mappedHandovers);
  } catch (error) {
    next(error);
  }
};

// Get single handover
exports.getHandover = async (req, res, next) => {
  try {
    const handover = await Project.findById(req.params.id)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .populate('files')
      .populate('comments.user', 'name email');
      
    if (!handover) {
      return next(createError(404, 'Handover not found'));
    }

    // Check if user has permission to view this handover
    if (
      handover.sender._id.toString() !== req.user._id.toString() &&
      handover.recipient._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'leader'
    ) {
      return next(createError(403, 'Not authorized to view this handover'));
    }

    res.json(handover);
  } catch (error) {
    next(error);
  }
};

// Update handover status
exports.updateHandoverStatus = async (req, res, next) => {
  try {
    const { status, staffIds } = req.body;

    if (!status) {
      return next(createError(400, 'Status is required'));
    }

    const handover = await Project.findById(req.params.id);
    if (!handover) {
      return next(createError(404, 'Handover not found'));
    }

    // Validate status transition based on user role
    const isValidTransition = validateStatusTransition(
      req.user.role,
      handover.status,
      status
    );

    if (!isValidTransition) {
      return next(createError(400, 'Invalid status transition'));
    }

    // Handle staff assignment
    if (status === 'assigned' && staffIds && Array.isArray(staffIds)) {
      // Validate that all staffIds are valid staff users
      const staffUsers = await User.find({ _id: { $in: staffIds }, role: 'staff' });
      if (staffUsers.length !== staffIds.length) {
        return next(createError(400, 'Invalid staff IDs provided'));
      }
      
      // Update the handover with assigned staff
      handover.assignedStaff = staffIds;
    }

    // Update status
    handover.status = status;

    const updatedHandover = await handover.save();

    // Populate sender and recipient information
    await updatedHandover.populate([
      { path: 'sender', select: 'name email' },
      { path: 'recipient', select: 'name email' },
      { path: 'files' },
      { path: 'assignedStaff', select: 'name email' }
    ]);

    res.json(updatedHandover);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return next(createError(400, error.message));
    }
    next(error);
  }
};

// Helper function to validate status transitions
function validateStatusTransition(role, currentStatus, newStatus) {
  const validTransitions = {
    partner: {
      sent: [],
      rejected: [],
      returned: [],
      approved: [],
      completed: [],
    },
    leader: {
      sent: ['rejected', 'returned', 'assigned'],
      assigned: [],
      in_progress: [],
      done: ['approved', 'needfix'],
      needfix: [],
      approved: [],
      returned: [],
      rejected: [],
    },
    staff: {
      assigned: ['in_progress'],
      in_progress: ['done'],
      done: [],
      needfix: ['in_progress'],
    },
  };

  return validTransitions[role]?.[currentStatus]?.includes(newStatus) || false;
}

// Delete handover
exports.deleteHandover = async (req, res, next) => {
  try {
    const handover = await Project.findById(req.params.id);
    if (!handover) {
      return next(createError(404, 'Handover not found'));
    }

    // Check if user has permission to delete
    if (
      handover.sender.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'leader'
    ) {
      return next(createError(403, 'Not authorized to delete this handover'));
    }

    // Optionally delete associated files from GridFS if needed
    // This depends on your application logic. If files are meant to persist
    // independently of the handover, you might skip this.
    // Example (assuming files are linked by handover ID, which they are via the Handover model's files array)
    if (handover.files && handover.files.length > 0) {
      const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
      for (const fileId of handover.files) {
         const fileDoc = await File.findById(fileId);
         if(fileDoc) {
           const gridFiles = await bucket.find({ filename: fileDoc.filename }).toArray();
           if (gridFiles.length > 0) {
             await bucket.delete(gridFiles[0]._id).catch(err => console.error(`Error deleting gridfs file ${gridFiles[0]._id}:`, err));
           } else {
             console.warn(`GridFS file for ${fileDoc.filename} not found during handover deletion.`);
           }
           await fileDoc.remove().catch(err => console.error(`Error deleting file metadata ${fileDoc._id}:`, err));
         }
      }
    }

    await handover.remove();
    res.json({ message: 'Handover deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Download Handover Files (NEW FUNCTION)
exports.downloadHandoverFiles = async (req, res, next) => {
  try {
    const handoverId = req.params.id;
    const handover = await Project.findById(handoverId).populate('files');

    if (!handover) {
      return next(createError(404, 'Handover not found'));
    }

    const files = handover.files;

    if (!files || files.length === 0) {
      return next(createError(404, 'No files found for this handover'));
    }

    // Check authorization (similar logic as downloadFile)
    const isAuthorized =
      handover.sender?.toString() === req.user._id.toString() ||
      handover.recipient?.toString() === req.user._id.toString() ||
      req.user.role === 'admin' ||
      req.user.role === 'leader' ||
      (handover.assignedStaff && handover.assignedStaff.some(staffId => staffId.toString() === req.user._id.toString())); // Check if user is in assignedStaff

    if (!isAuthorized) {
       return next(createError(403, 'Not authorized to download files for this handover'));
    }

    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });

    if (files.length === 1) {
      // If only one file, return that file directly
      const fileDoc = files[0];
      const gridFiles = await bucket.find({ filename: fileDoc.filename }).toArray();
      if (!gridFiles.length) {
        return next(createError(404, 'File not found in storage'));
      }
      const gridFile = gridFiles[0];

      res.writeHead(200, {
        'Content-Type': gridFile.contentType || fileDoc.mimeType,
        'Content-Length': gridFile.length,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileDoc.originalName)}`
      });

      bucket.openDownloadStream(gridFile._id).pipe(res);

    } else {
      // If multiple files, zip them
      const archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
      });

      archive.on('error', (err) => {
        next(err);
      });

      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(handover.projectName + '.zip')}`
      });

      archive.pipe(res);

      for (const fileDoc of files) {
        const gridFiles = await bucket.find({ filename: fileDoc.filename }).toArray();
        if (gridFiles.length > 0) {
          const gridFile = gridFiles[0];
          const downloadStream = bucket.openDownloadStream(gridFile._id);
          archive.append(downloadStream, { name: fileDoc.originalName });
        }
      }

      archive.finalize();
    }

  } catch (error) {
    next(createError(500, 'Error downloading handover files: ' + error.message));
  }
}; 