const Project = require('../models/Project');
const { createError } = require('../utils/error');
const User = require('../models/User');
const Sprint = require('../models/Sprint');
const mongoose = require('mongoose');
const { uploadFile, deleteFile, createDownloadStream, getFileInfo } = require('../utils/gridfs');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const Notification = require('../models/Notification');
const socketManager = require('../socket');

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
    const files = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const uploadResult = await uploadFile(file, {
            uploadedBy: req.user._id,
            projectId: projectId
          });
          
          const fileData = {
            fileId: uploadResult.fileId,
            fileName: file.originalname,
            fileSize: file.size,
            contentType: file.mimetype,
            uploadedBy: req.user._id,
            uploadedAt: new Date()
          };
          files.push(fileData);
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          return next(createError(500, 'Lỗi khi tải lên file'));
        }
      }
    }

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
      ...(files.length > 0 && { files }),
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

    // Gửi notification cho người nhận dự án
    if (project.handedOverTo && project.handedOverTo._id.toString() !== req.user._id.toString()) {
      const notifMsg = `Bạn vừa được bàn giao dự án "${project.name}".`;
      const notif = await Notification.create({
        user: project.handedOverTo._id,
        type: 'project',
        refId: project._id.toString(),
        message: notifMsg
      });
      socketManager.sendNotification(project.handedOverTo._id, notif);
    }

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

    const projects = await Project.find(query)
      .populate('createdBy', 'name email')
      .populate('handedOverTo', 'name email')
      .populate('files.uploadedBy', 'name email')
      .sort({ createdAt: -1 });

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
      .populate('createdBy', 'name email')
      .populate('handedOverTo', 'name email')
      .populate('files.uploadedBy', 'name email');

    if (!project) {
      return next(createError(404, 'Project not found'));
    }

    // Check if user has permission to view
    const isAdmin = req.user.role === 'admin';
    const isCreator = project.createdBy._id.toString() === req.user._id.toString();
    const isHandedOverTo = project.handedOverTo?._id.toString() === req.user._id.toString();

    // Check if user is a member of any sprint in the project
    const sprints = await Sprint.find({ project: project._id })
      .populate({
        path: 'tasks',
        populate: [
          { path: 'assigner', select: 'name email' },
          { path: 'assignee', select: 'name email' },
          { path: 'reviewer', select: 'name email' },
          { path: 'receiver', select: 'name email' }
        ]
      });

    const isSprintMember = sprints.some(sprint => {
      const hasTask = sprint.tasks?.some(task => {
        const isTaskMember = 
          task.assigner?._id.toString() === req.user._id.toString() ||
          task.assignee?._id.toString() === req.user._id.toString() ||
          task.reviewer?._id.toString() === req.user._id.toString() ||
          task.receiver?._id.toString() === req.user._id.toString();
        
        return isTaskMember;
      });
      return hasTask;
    });

    if (!isAdmin && !isCreator && !isHandedOverTo && !isSprintMember) {
      return next(createError(403, 'Not authorized to view this project'));
    }

    res.json(project);
  } catch (error) {
    console.error('Error in getProject:', error);
    next(error);
  }
};

// Update project status
exports.updateProjectStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return next(createError(404, 'Project not found'));
    }

    // Check if user has permission to update status
    if (req.user.role !== 'admin' && 
        project.createdBy._id.toString() !== req.user._id.toString() && 
        project.handedOverTo?._id.toString() !== req.user._id.toString()) {
      return next(createError(403, 'Not authorized to update this project'));
    }

    // Update status and add to history
    const oldStatus = project.status;
    project.status = status;
    project.history.push({
      action: 'update',
      field: 'status',
      oldValue: oldStatus,
      newValue: status,
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    await project.save();

    // Gửi notification cho người nhận và người tạo project
    const notifMsg = `Trạng thái dự án "${project.name}" đã đổi thành: ${status}`;
    const userIds = [project.createdBy, project.handedOverTo].filter(Boolean).map(u => u._id ? u._id : u);
    for (const userId of userIds) {
      const notif = await Notification.create({
        user: userId,
        type: 'project',
        refId: project._id.toString(),
        message: notifMsg
      });
      socketManager.sendNotification(userId, notif);
    }

    // Populate necessary fields
    await project.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'handedOverTo', select: 'name email' },
      { path: 'files.uploadedBy', select: 'name email' }
    ]);

    res.json(project);
  } catch (error) {
    console.error('Error in updateProjectStatus:', error);
    if (error.name === 'ValidationError') {
      return next(createError(400, error.message));
    }
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
        project.createdBy._id.toString() !== req.user._id.toString()) {
      return next(createError(403, 'Not authorized to delete this project'));
    }

    // Delete associated files from GridFS
    if (project.files && project.files.length > 0) {
      for (const file of project.files) {
        if (file.fileId) {
          try {
            await deleteFile(file.fileId);
          } catch (deleteError) {
            console.error('Error deleting file from GridFS:', deleteError);
            // Continue with deletion even if file deletion fails
          }
        }
      }
    }

    await project.deleteOne();
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error in deleteProject:', error);
    next(error);
  }
};

// Download project files
exports.downloadProjectFiles = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('files.uploadedBy', 'name email');

    if (!project) {
      return next(createError(404, 'Project not found'));
    }

    // Check if user has permission to download
    if (req.user.role !== 'admin' && 
        project.createdBy._id.toString() !== req.user._id.toString() && 
        project.handedOverTo?._id.toString() !== req.user._id.toString()) {
      return next(createError(403, 'Not authorized to download files from this project'));
    }

    if (!project.files || project.files.length === 0) {
      return next(createError(404, 'No files found for this project'));
    }

    // Create a zip file containing all project files
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // Encode project name to handle special characters
    const encodedProjectName = encodeURIComponent(project.name).replace(/['()]/g, escape);
    res.attachment(`${encodedProjectName}_files.zip`);
    archive.pipe(res);

    for (const file of project.files) {
      if (file.fileId) {
        try {
          const downloadStream = createDownloadStream(file.fileId);
          archive.append(downloadStream, { name: file.fileName });
        } catch (streamError) {
          console.error('Error streaming file from GridFS:', streamError);
          // Continue with other files even if one fails
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error in downloadProjectFiles:', error);
    next(error);
  }
};

// Download individual file
exports.downloadFile = async (req, res, next) => {
  try {
    const { id: projectId, fileId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return next(createError(400, 'Invalid file ID'));
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(createError(400, 'Invalid project ID'));
    }
    // Find the project
    const project = await Project.findById(projectId)
      .populate('files.uploadedBy', 'name email');
    if (!project) {
      return next(createError(404, 'Project not found'));
    }
    // Find the specific file in this project
    const file = project.files.find(f => f.fileId && f.fileId.toString() === fileId);
    if (!file) {
      return next(createError(404, 'File not found in this project'));
    }
    // Check if user has permission to download
    if (req.user.role !== 'admin' && 
        project.createdBy._id.toString() !== req.user._id.toString() && 
        project.handedOverTo?._id.toString() !== req.user._id.toString()) {
      return next(createError(403, 'Not authorized to download this file'));
    }
    try {
      // Check if file exists in GridFS
      try {
        await getFileInfo(fileId);
      } catch (gridfsError) {
        return next(createError(404, 'File not found in storage'));
      }
      const downloadStream = createDownloadStream(fileId);
      // Set headers for file download
      res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
      // Encode filename to handle special characters
      const encodedFileName = encodeURIComponent(file.fileName).replace(/['()]/g, escape);
      res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`);
      // Pipe the stream to response
      downloadStream.pipe(res);
      downloadStream.on('error', (error) => {
        if (!res.headersSent) {
          next(createError(500, 'Error streaming file'));
        }
      });
      downloadStream.on('end', () => {});
    } catch (streamError) {
      next(createError(500, 'Error downloading file'));
    }
  } catch (error) {
    next(error);
  }
};

// Complete project
exports.completeProject = async (req, res, next) => {
  try {
    if (!['admin', 'pm'].includes(req.user.role)) {
      return next(createError(403, 'Bạn không có quyền thực hiện hành động này.'));
    }
    const project = await Project.findById(req.params.id);
    if (!project) {
      return next(createError(404, 'Dự án không tồn tại.'));
    }
    if (project.status !== 'Đã bàn giao') {
      return next(createError(400, `Chỉ có thể hoàn thành dự án đã ở trạng thái "Đã bàn giao". Trạng thái hiện tại: "${project.status}"`));
    }
    project.status = 'Hoàn thành';
    project.history.push({
      action: 'update',
      field: 'status',
      oldValue: 'Đã bàn giao',
      newValue: 'Hoàn thành',
      updatedBy: req.user._id,
      updatedAt: new Date()
    });
    await project.save();
    res.status(200).json({ message: 'Dự án đã được đánh dấu hoàn thành.', project });
  } catch (error) {
    next(error);
  }
};
