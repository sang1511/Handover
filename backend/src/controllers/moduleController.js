const Module = require('../models/Module');
const Project = require('../models/Project');
const Release = require('../models/Release');
const User = require('../models/User');
const Notification = require('../models/Notification');
const socketManager = require('../socket');
const { createError } = require('../utils/error');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');

// Tạo module mới
exports.createModule = async (req, res, next) => {
  try {
    const { moduleId, name, description, version, status, owner, projectId, startDate, endDate } = req.body;
    if (!moduleId || !name || !projectId) {
      return next(createError(400, 'Vui lòng nhập đầy đủ mã module, tên module và projectId.'));
    }
    const project = await Project.findById(projectId);
    if (!project) return next(createError(404, 'Project not found'));
    // Xử lý owner
    let ownerUser = null;
    if (owner) {
      ownerUser = await User.findById(owner);
      if (!ownerUser) return next(createError(404, 'Owner user not found'));
    }
    // Xử lý docs (Cloudinary)
    let docs = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        docs.push({
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
    // Tạo module
    const module = new Module({
      moduleId,
      name,
      description,
      version,
      status: status || 'Chưa phát triển',
      createdBy: req.user._id,
      owner: ownerUser ? ownerUser._id : undefined,
      project: project._id,
      docs,
      startDate,
      endDate,
      history: [{
        action: 'tạo module',
        oldValue: null,
        newValue: { name, description, version, status, startDate, endDate },
        fromUser: req.user._id,
        timestamp: new Date(),
        comment: ''
      }]
    });
    await module.save();
    // Ghi lịch sử tạo module vào project
    project.history.push({
      action: 'tạo module',
      module: module._id,
      fromUser: req.user._id,
      timestamp: new Date(),
      comment: `"${name}"`
    });
    await project.save();
    // Gửi realtime cập nhật project
    socketManager.broadcastToProjectRoom(project._id, 'project_updated', { project });
    // Gửi thông báo cho người phụ trách nếu có
    if (ownerUser) {
      const notif = await Notification.create({
        user: ownerUser._id,
        type: 'module_assigned',
        refId: module._id.toString(),
        message: `Bạn được giao phụ trách module "${name}" trong dự án "${project.name}".`
      });
      socketManager.sendNotification(ownerUser._id, {
        type: 'module_assigned',
        refId: module._id.toString(),
        message: notif.message,
        createdAt: notif.createdAt
      });
    }
    res.status(201).json(module);
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách module theo project
exports.getModulesByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const modules = await Module.find({ project: projectId })
      .populate('owner', 'name email');
    res.json(modules);
  } catch (error) {
    next(error);
  }
};

// Lấy chi tiết module
exports.getModule = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('docs.uploadedBy', 'name email')
      .populate({
        path: 'project',
        populate: { path: 'members.user', select: 'userID name email phoneNumber role' }
      })
      .populate('history.fromUser', 'name email');
    if (!module) return next(createError(404, 'Module not found'));
    res.json(module);
  } catch (error) {
    next(error);
  }
};

// Cập nhật module
exports.updateModule = async (req, res, next) => {
  try {
    const { name, description, version, status, owner, startDate, endDate, keepFiles } = req.body;
    const module = await Module.findById(req.params.id);
    if (!module) return next(createError(404, 'Module not found'));

    function formatVNDate(date) {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('vi-VN');
    }

    // Xử lý tài liệu docs
    let keepPublicIds = [];
    if (typeof keepFiles === 'string') {
      try { keepPublicIds = JSON.parse(keepFiles); } catch {}
    } else if (Array.isArray(keepFiles)) {
      keepPublicIds = keepFiles;
    }

    // Xóa file cũ không còn giữ
    if (module.docs && module.docs.length > 0) {
      const toDelete = module.docs.filter(f => !keepPublicIds.includes(f.publicId));
      for (const doc of toDelete) {
        if (doc.publicId) {
          try { await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'auto' }); } catch {}
        }
        // Ghi lịch sử xóa file
        module.history.push({
          action: `xóa file`,
          oldValue: doc.fileName,
          newValue: null,
          fromUser: req.user._id,
          timestamp: new Date(),
          comment: `"${doc.fileName}"`
        });
      }
      // Chỉ giữ lại file còn trong keepPublicIds
      module.docs = module.docs.filter(f => keepPublicIds.includes(f.publicId));
    }

    // Thêm file mới
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        module.docs.push({
          url: file.path,
          publicId: file.filename,
          fileName: file.originalname,
          fileSize: file.size,
          contentType: file.mimetype,
          uploadedBy: req.user._id,
          uploadedAt: new Date()
        });
        // Ghi lịch sử thêm file
        module.history.push({
          action: `thêm file`,
          oldValue: null,
          newValue: file.originalname,
          fromUser: req.user._id,
          timestamp: new Date(),
          comment: `"${file.originalname}"`
        });
      }
    }

    // Ghi lịch sử chi tiết cho từng trường thay đổi
    const now = new Date();

    // Cập nhật tên module
    if (name && name !== module.name) {
      module.history.push({
        action: 'cập nhật',
        oldValue: module.name,
        newValue: name,
        fromUser: req.user._id,
        timestamp: now,
        comment: `tên module từ "${module.name}" thành "${name}"`
      });
      module.name = name;
    }

    // Cập nhật mô tả
    if (description && description !== module.description) {
      module.history.push({
        action: 'cập nhật',
        oldValue: module.description,
        newValue: description,
        fromUser: req.user._id,
        timestamp: now,
        comment: 'mô tả module'
      });
      module.description = description;
    }

    // Cập nhật phiên bản
    if (version && version !== module.version) {
      module.history.push({
        action: 'cập nhật',
        oldValue: module.version,
        newValue: version,
        fromUser: req.user._id,
        timestamp: now,
        comment: `phiên bản từ ${module.version || ''} thành ${version}`
      });
      module.version = version;
    }

    // Cập nhật trạng thái
    if (status && status !== module.status) {
      module.history.push({
        action: 'cập nhật',
        oldValue: module.status,
        newValue: status,
        fromUser: req.user._id,
        timestamp: now,
        comment: `trạng thái từ "${module.status}" thành "${status}"`
      });
      module.status = status;
    }

    // Cập nhật người phụ trách
    if (owner && owner !== String(module.owner)) {
      const ownerUser = await User.findById(owner);
      if (!ownerUser) return next(createError(404, 'Owner user not found'));
      
      const oldOwner = module.owner;
      module.owner = ownerUser._id;
      
      module.history.push({
        action: 'cập nhật',
        oldValue: oldOwner,
        newValue: ownerUser._id,
        fromUser: req.user._id,
        timestamp: now,
        comment: `người phụ trách thành "${ownerUser.name}"`
      });
    }

    // Cập nhật ngày bắt đầu
    if (startDate && startDate !== String(module.startDate?.toISOString()?.slice(0,10))) {
      module.history.push({
        action: 'cập nhật',
        oldValue: module.startDate,
        newValue: startDate,
        fromUser: req.user._id,
        timestamp: now,
        comment: `ngày bắt đầu từ ${formatVNDate(module.startDate)} thành ${formatVNDate(startDate)}`
      });
      module.startDate = startDate;
    }

    // Cập nhật ngày kết thúc
    if (endDate && endDate !== String(module.endDate?.toISOString()?.slice(0,10))) {
      module.history.push({
        action: 'cập nhật',
        oldValue: module.endDate,
        newValue: endDate,
        fromUser: req.user._id,
        timestamp: now,
        comment: `ngày kết thúc từ ${formatVNDate(module.endDate)} thành ${formatVNDate(endDate)}`
      });
      module.endDate = endDate;
    }

    await module.save();
    res.json(module);
  } catch (error) {
    next(error);
  }
};

// Xóa module
exports.deleteModule = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.id).populate('docs.uploadedBy');
    if (!module) return next(createError(404, 'Module not found'));
    // Xóa docs khỏi Cloudinary
    if (module.docs && module.docs.length > 0) {
      for (const doc of module.docs) {
        if (doc.publicId) {
          try {
            await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'auto' });
          } catch (deleteError) {}
        }
      }
    }
    await module.deleteOne();
    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Lấy tất cả module (toàn hệ thống)
exports.getAllModules = async (req, res, next) => {
  try {
    const modules = await Module.find()
      .populate('project', 'name')
      .populate('owner', 'name email');
    res.json(modules);
  } catch (error) {
    next(error);
  }
};

// Download file: trả về file stream với Content-Disposition đúng tên gốc
exports.downloadModuleFile = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.moduleId);
    if (!module) return next(createError(404, 'Module not found'));
    const file = module.docs.find(f => f.publicId === req.params.fileId);
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
exports.deleteModuleFile = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.moduleId);
    if (!module) return next(createError(404, 'Module not found'));
    const fileIdx = module.docs.findIndex(f => f.publicId === req.params.fileId);
    if (fileIdx === -1) return next(createError(404, 'File not found'));
    const file = module.docs[fileIdx];
    await cloudinary.uploader.destroy(file.publicId, { resource_type: 'auto' });
    module.docs.splice(fileIdx, 1);
    await module.save();
    res.json({ message: 'Đã xóa file thành công.' });
  } catch (error) {
    next(error);
  }
}; 