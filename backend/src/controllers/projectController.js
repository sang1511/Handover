const Project = require('../models/Project');
const Module = require('../models/Module');
const { createError } = require('../utils/error');
const User = require('../models/User');
const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary');
const Notification = require('../models/Notification');
const socketManager = require('../socket');
const axios = require('axios');
const { formatVNDate } = require('../utils/dateFormatter');

// Create a new project
exports.createProject = async (req, res, next) => {
  // Chỉ cho phép admin hoặc PM tạo dự án
  if (req.user.role !== 'admin' && req.user.role !== 'pm') {
    return next(createError(403, 'Chỉ admin hoặc PM mới có quyền tạo dự án mới.'));
  }
  try {
    const { projectId, name, description, startDate, endDate, version, members } = req.body;
    if (!projectId || !name) {
      return next(createError(400, 'Vui lòng nhập đầy đủ mã dự án và tên dự án.'));
    }
    // Check if projectId already exists
    const existingProject = await Project.findOne({ projectId });
    if (existingProject) {
      return next(createError(400, 'Mã dự án đã tồn tại'));
    }
    // Xử lý members
    let memberList = [];
    let membersArr = [];
    if (typeof members === 'string') {
      try {
        membersArr = JSON.parse(members);
      } catch {}
    } else if (Array.isArray(members)) {
      membersArr = members;
    }
    for (const m of membersArr) {
      const user = await User.findById(m.user);
      if (user) {
        memberList.push({ user: user._id });
      }
    }
    // Xử lý overviewDocs (Cloudinary)
    let overviewDocs = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
          overviewDocs.push({
          url: file.path,
          publicId: file.filename,
            fileName: file.originalname,
            fileSize: file.size,
            contentType: file.mimetype,
            uploadedBy: req.user._id,
            uploadedAt: new Date()
          });
      }
    }
    // Tạo project
    const project = new Project({
      projectId,
      name,
      description,
      startDate,
      endDate,
      version,
      status: 'Chờ xác nhận',
      createdBy: req.user._id,
      members: memberList,
      overviewDocs,
      history: [{
        action: 'tạo dự án',
        fromUser: req.user._id,
        timestamp: new Date(),
        description: `đã tạo dự án "${name}"`,
        isPrimary: true // Đây là hành động gốc, phải là primary
      }]
    });
    await project.save();
    // Gửi notification cho admin
    const admins = await User.find({ role: 'admin' });
    const message = `Dự án mới "${project.name}" vừa được tạo, cần xác nhận.`;
    for (const admin of admins) {
      const notification = await Notification.create({
        user: admin._id,
        type: 'project',
        refId: project._id.toString(),
        message: message
      });
      socketManager.sendNotification(admin._id, notification);
    }
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

// Get all projects
exports.getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find()
      .populate('createdBy', 'name email role')
      .populate('members.user', 'userID name email phoneNumber role')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    next(error);
  }
};

// Get a single project
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('members.user', 'userID name email phoneNumber role')
      .populate('overviewDocs.uploadedBy', 'name email')
      .populate('history.fromUser', 'name email');
    if (!project) {
      return next(createError(404, 'Project not found'));
    }
    res.json(project);
  } catch (error) {
    next(error);
  }
};

// Update project
exports.updateProject = async (req, res, next) => {
  try {
    const { name, description, startDate, endDate, version, members, keepFiles } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return next(createError(404, 'Project not found'));
    }
    const oldValue = {
      name: project.name,
      description: project.description,
      startDate: project.startDate,
      endDate: project.endDate,
      version: project.version,
      overviewDocs: project.overviewDocs.map(f => ({ fileId: f.fileId, fileName: f.fileName }))
    };

    // Update members
    if (Array.isArray(members)) {
      let memberList = [];
      for (const m of members) {
        const user = await User.findById(m.user);
        if (user) {
          memberList.push({ user: user._id });
        }
      }
      project.members = memberList;
    }
    
    // Handle overviewDocs (file upload/delete) only if keepFiles is provided
    if (keepFiles !== undefined) {
      let keepPublicIds = [];
      if (typeof keepFiles === 'string') {
        try { keepPublicIds = JSON.parse(keepFiles); } catch {}
      } else if (Array.isArray(keepFiles)) {
        keepPublicIds = keepFiles;
      }
      // Xóa file không còn giữ lại
      if (project.overviewDocs && project.overviewDocs.length > 0) {
        const toDelete = project.overviewDocs.filter(f => !keepPublicIds.includes(f.publicId));
        for (const doc of toDelete) {
          if (doc.publicId) {
            try { await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'auto' }); } catch {}
          }
          project.history.push({
            action: `xóa file`,
            fromUser: req.user._id,
            timestamp: new Date(),
            description: `đã xóa file "${doc.fileName}" khỏi dự án "${project.name}"`,
            isPrimary: true
          });
        }
        project.overviewDocs = project.overviewDocs.filter(f => keepPublicIds.includes(f.publicId));
      }
    }

    // Thêm file mới
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
          project.overviewDocs.push({
          url: file.path,
          publicId: file.filename,
            fileName: file.originalname,
            fileSize: file.size,
            contentType: file.mimetype,
            uploadedBy: req.user._id,
            uploadedAt: new Date()
          });
          project.history.push({
            action: `thêm file`,
            fromUser: req.user._id,
            timestamp: new Date(),
            description: `đã thêm file "${file.originalname}" vào dự án "${project.name}"`,
            isPrimary: true
          });
      }
    }
    // Ghi lịch sử chi tiết cho từng trường thay đổi
    const now = new Date();
    if (name && name !== project.name) {
      project.history.push({
        action: 'cập nhật',
        fromUser: req.user._id,
        timestamp: now,
        description: `đã đổi tên dự án từ "${project.name}" thành "${name}"`,
        isPrimary: true
      });
      project.name = name;
    }
    if (description && description !== project.description) {
      project.history.push({
        action: 'cập nhật',
        fromUser: req.user._id,
        timestamp: now,
        description: `đã cập nhật mô tả của dự án "${name}"`,
        isPrimary: true
      });
      project.description = description;
    }
    if (startDate && startDate !== String(project.startDate?.toISOString()?.slice(0,10))) {
      project.history.push({
        action: `cập nhật`,
        fromUser: req.user._id,
        timestamp: now,
        description: `đã thay đổi ngày bắt đầu dự án "${name}" từ ${formatVNDate(project.startDate)} thành ${formatVNDate(startDate)}`,
        isPrimary: true
      });
      project.startDate = startDate;
    }
    if (endDate && endDate !== String(project.endDate?.toISOString()?.slice(0,10))) {
      project.history.push({
        action: `cập nhật`,
        fromUser: req.user._id,
        timestamp: now,
        description: `đã thay đổi ngày kết thúc dự án "${name}" từ ${formatVNDate(project.endDate)} thành ${formatVNDate(endDate)}`,
        isPrimary: true
      });
      project.endDate = endDate;
    }
    if (version && version !== project.version) {
      project.history.push({
        action: `cập nhật`,
        fromUser: req.user._id,
        timestamp: now,
        description: `đã thay đổi phiên bản dự án "${name}" từ ${project.version || ''} thành ${version}`,
        isPrimary: true
      });
      project.version = version;
    }
    await project.save();
    res.json(project);
  } catch (error) {
    next(error);
  }
};

// Delete project
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).populate('overviewDocs.uploadedBy');
    if (!project) {
      return next(createError(404, 'Project not found'));
    }
    // Xóa overviewDocs khỏi Cloudinary
    if (project.overviewDocs && project.overviewDocs.length > 0) {
      for (const doc of project.overviewDocs) {
        if (doc.publicId) {
        try {
            await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'auto' });
          } catch (deleteError) {
            // Bỏ qua lỗi xóa file
          }
        }
  }
    }
    // Xóa các module liên kết
    const modules = await Module.find({ project: project._id });
    if (modules.length > 0) {
      for (const module of modules) {
        await Module.findByIdAndDelete(module._id);
      }
    }
    await project.deleteOne();
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Confirm project (admin only)
exports.confirmProject = async (req, res, next) => {
  try {
    // Kiểm tra quyền admin
    if (req.user.role !== 'admin') {
      return next(createError(403, 'Chỉ admin mới có quyền xác nhận dự án'));
    }

    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('members.user', 'userID name email phoneNumber role');

    if (!project) {
      return next(createError(404, 'Project not found'));
    }

    // Kiểm tra trạng thái hiện tại
    if (project.status !== 'Chờ xác nhận') {
      return next(createError(400, 'Chỉ có thể xác nhận dự án ở trạng thái "Chờ xác nhận"'));
    }

    // Cập nhật trạng thái
    const oldStatus = project.status;
    project.status = 'Khởi tạo';

    // Thêm vào lịch sử
    project.history.push({
      action: 'xác nhận dự án',
      fromUser: req.user._id,
      timestamp: new Date(),
      description: `đã xác nhận dự án "${project.name}"`,
      isPrimary: true
    });

    await project.save();

    // Gửi thông báo cho người tạo dự án
    if (project.createdBy) {
      const message = `Dự án "${project.name}" đã được xác nhận và chuyển sang trạng thái "Khởi tạo".`;
      const notification = await Notification.create({
        user: project.createdBy._id,
        type: 'project_confirmed',
        refId: project._id.toString(),
        message: message
      });
      // Gửi thông báo realtime
      socketManager.sendNotification(project.createdBy._id, notification);
    }

    res.json({
      message: 'Dự án đã được xác nhận thành công',
      project
    });

  } catch (error) {
    next(error);
  }
};

// Download file: trả về file stream với Content-Disposition đúng tên gốc
exports.downloadProjectFile = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return next(createError(404, 'Project not found'));
    const file = project.overviewDocs.find(f => f.publicId === req.params.fileId);
    if (!file) return next(createError(404, 'File not found'));
    // Lấy file từ Cloudinary
    const fileResponse = await axios.get(file.url, { responseType: 'stream' });
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    fileResponse.data.pipe(res);
  } catch (error) {
    next(error);
  }
};

// Xóa file riêng lẻ (nếu có route)
exports.deleteProjectFile = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return next(createError(404, 'Project not found'));
    const fileIdx = project.overviewDocs.findIndex(f => f.publicId === req.params.fileId);
    if (fileIdx === -1) return next(createError(404, 'File not found'));
    const file = project.overviewDocs[fileIdx];
    await cloudinary.uploader.destroy(file.publicId, { resource_type: 'auto' });
    project.overviewDocs.splice(fileIdx, 1);
    await project.save();
    res.json({ message: 'Đã xóa file thành công.' });
  } catch (error) {
    next(error);
  }
};

