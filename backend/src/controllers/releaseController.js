const Release = require('../models/Release');
const Module = require('../models/Module');
const Sprint = require('../models/Sprint');
const User = require('../models/User');
const { createError } = require('../utils/error');
const cloudinary = require('../config/cloudinary');
const { createNotification } = require('../services/notificationService');
const axios = require('axios');

// Tạo release mới
exports.createRelease = async (req, res, next) => {
  try {
    const { releaseId, version, startDate, endDate, fromUser, toUser, approver, moduleId, repoLink, gitBranch } = req.body;
    if (!releaseId || !moduleId || !fromUser || !toUser || !approver) {
      return next(createError(400, 'Vui lòng nhập đầy đủ mã release, moduleId, người bàn giao, người nhận bàn giao và người nghiệm thu.'));
    }
    const module = await Module.findById(moduleId);
    if (!module) return next(createError(404, 'Module not found'));
    // Xử lý fromUser, toUser, approver
    let fromUserObj = null, toUserObj = null, approverObj = null;
    if (fromUser) {
      fromUserObj = await User.findById(fromUser);
      if (!fromUserObj) return next(createError(404, 'Người bàn giao không tồn tại'));
    }
    if (toUser) {
      toUserObj = await User.findById(toUser);
      if (!toUserObj) return next(createError(404, 'Người nhận bàn giao không tồn tại'));
    }
    if (approver) {
      approverObj = await User.findById(approver);
      if (!approverObj) return next(createError(404, 'Người nghiệm thu không tồn tại'));
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
    // Tạo release
    const release = new Release({
      releaseId,
      version,
      startDate,
      endDate,
      status: 'Chưa bắt đầu',
      acceptanceStatus: 'Chưa',
      createdBy: req.user._id,
      fromUser: fromUserObj ? fromUserObj._id : undefined,
      toUser: toUserObj ? toUserObj._id : undefined,
      approver: approverObj ? approverObj._id : undefined,
      docs,
      repoLink,
      gitBranch,
      module: module._id,
      sprints: [],
      history: [{
        action: 'tạo release',
        oldValue: null,
        newValue: { version, startDate, endDate, repoLink, gitBranch },
        fromUser: req.user._id,
        timestamp: new Date(),
        comment: ''
      }]
    });
    await release.save();
    // Thêm log lịch sử vào module
    module.history.push({
      action: 'tạo release',
      release: release._id,
      oldValue: null,
      newValue: { version, startDate, endDate, repoLink, gitBranch },
      fromUser: req.user._id,
      timestamp: new Date(),
      comment: `"${version}"`
    });
    await module.save();

    // --- Notification ---
    // Lấy thông tin project
    const populatedModule = await Module.findById(module._id).populate('project', 'name');
    const projectName = populatedModule.project?.name || '';
    const moduleName = populatedModule.name || '';
    // Người bàn giao
    if (fromUserObj) {
      await createNotification(
        fromUserObj._id,
        `Bạn được phân công bàn giao release "${version}" thuộc module "${moduleName}" của dự án "${projectName}"`,
        'release_handover',
        release._id.toString()
      );
    }
    // Người nhận bàn giao
    if (toUserObj) {
      await createNotification(
        toUserObj._id,
        `Bạn được phân công nhận bàn giao release "${version}" thuộc module "${moduleName}" của dự án "${projectName}"`,
        'release_receive',
        release._id.toString()
      );
    }
    // Người nghiệm thu
    if (approverObj) {
      await createNotification(
        approverObj._id,
        `Bạn được phân công nghiệm thu bàn giao release "${version}" thuộc module "${moduleName}" của dự án "${projectName}"`,
        'release_approve',
        release._id.toString()
      );
    }

    res.status(201).json(release);
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách release theo module
exports.getReleasesByModule = async (req, res, next) => {
  try {
    const { moduleId } = req.params;
    const releases = await Release.find({ module: moduleId })
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .populate('approver', 'name email')
      .populate('sprints');
    res.json(releases);
  } catch (error) {
    next(error);
  }
};

// Lấy chi tiết release
exports.getRelease = async (req, res, next) => {
  try {
    const release = await Release.findById(req.params.id)
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .populate('approver', 'name email')
      .populate('docs.uploadedBy', 'name email')
      .populate('history.fromUser', 'name email')
      .populate({ path: 'module', populate: { path: 'project', select: 'name' } });
    if (!release) return next(createError(404, 'Release not found'));
    res.json(release);
  } catch (error) {
    next(error);
  }
};

// Cập nhật release
exports.updateRelease = async (req, res, next) => {
  try {
    const { version, startDate, endDate, status, acceptanceStatus, acceptanceComment, fromUser, toUser, approver, repoLink, gitBranch, keepFiles } = req.body;
    const release = await Release.findById(req.params.id);
    if (!release) return next(createError(404, 'Release not found'));
    const now = new Date();
    // Lưu lại giá trị cũ để so sánh
    const oldRelease = {
      version: release.version,
      startDate: release.startDate,
      endDate: release.endDate,
      status: release.status,
      acceptanceStatus: release.acceptanceStatus,
      repoLink: release.repoLink,
      gitBranch: release.gitBranch,
      fromUser: release.fromUser,
      toUser: release.toUser,
      approver: release.approver
    };
    // So sánh và log từng trường thay đổi
    if (version && version !== release.version) {
      release.history.push({
        action: 'cập nhật',
        oldValue: release.version,
        newValue: version,
        fromUser: req.user._id,
        timestamp: now,
        comment: `phiên bản từ "${release.version || ''}" thành "${version}"`
      });
      release.version = version;
    }
    if (startDate && String(startDate) !== String(release.startDate?.toISOString()?.slice(0,10))) {
      release.history.push({
        action: 'cập nhật',
        oldValue: release.startDate,
        newValue: startDate,
        fromUser: req.user._id,
        timestamp: now,
        comment: `ngày bàn giao từ ${release.startDate ? new Date(release.startDate).toLocaleDateString('vi-VN') : ''} thành ${new Date(startDate).toLocaleDateString('vi-VN')}`
      });
      release.startDate = startDate;
    }
    if (endDate && String(endDate) !== String(release.endDate?.toISOString()?.slice(0,10))) {
      release.history.push({
        action: 'cập nhật',
        oldValue: release.endDate,
        newValue: endDate,
        fromUser: req.user._id,
        timestamp: now,
        comment: `ngày kết thúc từ ${release.endDate ? new Date(release.endDate).toLocaleDateString('vi-VN') : ''} thành ${new Date(endDate).toLocaleDateString('vi-VN')}`
      });
      release.endDate = endDate;
    }
    if (status && status !== release.status) {
      release.history.push({
        action: 'cập nhật',
        oldValue: release.status,
        newValue: status,
        fromUser: req.user._id,
        timestamp: now,
        comment: `trạng thái từ "${release.status}" thành "${status}"`
      });
      release.status = status;
    }
    if (acceptanceStatus && acceptanceStatus !== release.acceptanceStatus) {
      let comment = `trạng thái nghiệm thu từ "${release.acceptanceStatus}" thành "${acceptanceStatus}"`;
      if (acceptanceComment) comment += ` ${acceptanceComment}`;
      release.history.push({
        action: 'cập nhật',
        oldValue: release.acceptanceStatus,
        newValue: acceptanceStatus,
        fromUser: req.user._id,
        timestamp: now,
        comment
      });
      release.acceptanceStatus = acceptanceStatus;
    }
    if (repoLink && repoLink !== release.repoLink) {
      release.history.push({
        action: 'cập nhật',
        oldValue: release.repoLink,
        newValue: repoLink,
        fromUser: req.user._id,
        timestamp: now,
        comment: `link repo từ "${release.repoLink || ''}" thành "${repoLink}"`
      });
      release.repoLink = repoLink;
    }
    if (gitBranch && gitBranch !== release.gitBranch) {
      release.history.push({
        action: 'cập nhật',
        oldValue: release.gitBranch,
        newValue: gitBranch,
        fromUser: req.user._id,
        timestamp: now,
        comment: `git branch từ "${release.gitBranch || ''}" thành "${gitBranch}"`
      });
      release.gitBranch = gitBranch;
    }
    if (fromUser && String(fromUser) !== String(release.fromUser)) {
      const fromUserObj = await User.findById(fromUser);
      if (!fromUserObj) return next(createError(404, 'Người bàn giao không tồn tại'));
      release.history.push({
        action: 'cập nhật',
        oldValue: release.fromUser,
        newValue: fromUserObj._id,
        fromUser: req.user._id,
        timestamp: now,
        comment: `người bàn giao thành "${fromUserObj.name}"`
      });
      release.fromUser = fromUserObj._id;
    }
    if (toUser && String(toUser) !== String(release.toUser)) {
      const toUserObj = await User.findById(toUser);
      if (!toUserObj) return next(createError(404, 'Người nhận bàn giao không tồn tại'));
      release.history.push({
        action: 'cập nhật',
        oldValue: release.toUser,
        newValue: toUserObj._id,
        fromUser: req.user._id,
        timestamp: now,
        comment: `người nhận bàn giao thành "${toUserObj.name}"`
      });
      release.toUser = toUserObj._id;
    }
    if (approver && String(approver) !== String(release.approver)) {
      const approverObj = await User.findById(approver);
      if (!approverObj) return next(createError(404, 'Người nghiệm thu không tồn tại'));
      release.history.push({
        action: 'cập nhật',
        oldValue: release.approver,
        newValue: approverObj._id,
        fromUser: req.user._id,
        timestamp: now,
        comment: `người nghiệm thu thành "${approverObj.name}"`
      });
      release.approver = approverObj._id;
    }
    // Xử lý tài liệu docs
    let keepPublicIds = [];
    if (typeof keepFiles === 'string') {
      try { keepPublicIds = JSON.parse(keepFiles); } catch {}
    } else if (Array.isArray(keepFiles)) {
      keepPublicIds = keepFiles;
    }
    // Xóa file cũ không còn giữ
    if (release.docs && release.docs.length > 0) {
      const toDelete = release.docs.filter(f => !keepPublicIds.includes(f.publicId));
      for (const doc of toDelete) {
        if (doc.publicId) {
          try { await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'auto' }); } catch {}
        }
        release.history.push({
          action: `xóa file`,
          oldValue: doc.fileName,
          newValue: null,
          fromUser: req.user._id,
          timestamp: now,
          comment: `"${doc.fileName}"`
        });
      }
      release.docs = release.docs.filter(f => keepPublicIds.includes(f.publicId));
    }
    // Thêm file mới
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
          release.docs.push({
          url: file.path,
          publicId: file.filename,
            fileName: file.originalname,
            fileSize: file.size,
            contentType: file.mimetype,
            uploadedBy: req.user._id,
            uploadedAt: new Date()
          });
    release.history.push({
          action: `thêm file`,
            oldValue: null,
            newValue: file.originalname,
      fromUser: req.user._id,
            timestamp: now,
            comment: `"${file.originalname}"`
    });
      }
    }
    // --- Notification khi đổi người liên quan ---
    const populatedModule = await Module.findById(release.module).populate('project', 'name');
    const projectName = populatedModule.project?.name || '';
    const moduleName = populatedModule.name || '';
    if (fromUser && String(fromUser) !== String(oldRelease.fromUser)) {
      const fromUserObj = await User.findById(fromUser);
      if (fromUserObj) {
        await createNotification(
          fromUserObj._id,
          `Bạn được phân công bàn giao release "${release.version}" thuộc module "${moduleName}" của dự án "${projectName}"`,
          'release_handover',
          release._id.toString()
        );
      }
    }
    if (toUser && String(toUser) !== String(oldRelease.toUser)) {
      const toUserObj = await User.findById(toUser);
      if (toUserObj) {
        await createNotification(
          toUserObj._id,
          `Bạn được phân công nhận bàn giao release "${release.version}" thuộc module "${moduleName}" của dự án "${projectName}"`,
          'release_receive',
          release._id.toString()
        );
      }
    }
    if (approver && String(approver) !== String(oldRelease.approver)) {
      const approverObj = await User.findById(approver);
      if (approverObj) {
        await createNotification(
          approverObj._id,
          `Bạn được phân công nghiệm thu bàn giao release "${release.version}" thuộc module "${moduleName}" của dự án "${projectName}"`,
          'release_approve',
          release._id.toString()
        );
      }
    }
    // Gửi notification cho Người nghiệm thu khi release chuyển sang 'Hoàn thành'
    if (status && status !== oldRelease.status && status === 'Hoàn thành' && release.approver) {
      const approverObj = await User.findById(release.approver);
      if (approverObj) {
        await createNotification(
          approverObj._id,
          `Release "${release.version}" thuộc module "${moduleName}" của dự án "${projectName}" đã hoàn thành. Vui lòng nghiệm thu`,
          'release_ready_for_approval',
          release._id.toString()
        );
      }
    }
    // Gửi notification cho Người bàn giao và Người nhận bàn giao khi trạng thái nghiệm thu là 'Đạt' hoặc 'Không đạt'
    if (
      acceptanceStatus &&
      acceptanceStatus !== oldRelease.acceptanceStatus &&
      (acceptanceStatus === 'Đạt' || acceptanceStatus === 'Không đạt')
    ) {
      const commentText = acceptanceComment && acceptanceComment.trim() ? ` - ${acceptanceComment}` : '';
      const msg = `Release "${release.version}" thuộc module "${moduleName}" của dự án "${projectName}" được đánh giá ${acceptanceStatus}${commentText}`;
      if (release.fromUser) {
        await createNotification(
          release.fromUser,
          msg,
          'release_accepted',
          release._id.toString()
        );
      }
      if (release.toUser) {
        await createNotification(
          release.toUser,
          msg,
          'release_accepted',
          release._id.toString()
        );
      }
    }
    await release.save();
    res.json(release);
  } catch (error) {
    next(error);
  }
};

// Xóa release
exports.deleteRelease = async (req, res, next) => {
  try {
    const release = await Release.findById(req.params.id).populate('sprints').populate('docs.uploadedBy');
    if (!release) return next(createError(404, 'Release not found'));
    // Xóa docs khỏi Cloudinary
    if (release.docs && release.docs.length > 0) {
      for (const doc of release.docs) {
        if (doc.publicId) {
          try {
            await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'auto' });
          } catch (deleteError) {}
        }
      }
    }
    await release.deleteOne();
    res.json({ message: 'Release deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getReleases = async (req, res, next) => {
  try {
    const { moduleId } = req.query;
    let query = {};
    if (moduleId) query.module = moduleId;
    const releases = await Release.find(query)
      .populate('fromUser', 'name')
      .populate('toUser', 'name')
      .populate('approver', 'name');
    res.json(releases);
  } catch (error) {
    next(error);
  }
};

// Download file: trả về file stream với Content-Disposition đúng tên gốc
exports.downloadReleaseFile = async (req, res, next) => {
  try {
    const release = await Release.findById(req.params.releaseId);
    if (!release) return next(createError(404, 'Release not found'));
    const file = release.docs.find(f => f.publicId === req.params.fileId);
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
exports.deleteReleaseFile = async (req, res, next) => {
  try {
    const release = await Release.findById(req.params.releaseId);
    if (!release) return next(createError(404, 'Release not found'));
    const fileIdx = release.docs.findIndex(f => f.publicId === req.params.fileId);
    if (fileIdx === -1) return next(createError(404, 'File not found'));
    const file = release.docs[fileIdx];
    await cloudinary.uploader.destroy(file.publicId, { resource_type: 'auto' });
    release.docs.splice(fileIdx, 1);
    await release.save();
    res.json({ message: 'Đã xóa file thành công.' });
  } catch (error) {
    next(error);
  }
}; 