const Sprint = require('../models/Sprint');
const Release = require('../models/Release');
const Project = require('../models/Project');
const User = require('../models/User');
const { createError } = require('../utils/error');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');

// Tạo sprint mới
exports.createSprint = async (req, res, next) => {
  try {
    const { name, goal, startDate, endDate, members, repoLink, gitBranch } = req.body;
    const { releaseId } = req.params;
    
    if (!name || !startDate || !endDate) {
      return next(createError(400, 'Vui lòng nhập đầy đủ tên, ngày bắt đầu/kết thúc.'));
    }
    
    const release = await Release.findById(releaseId).populate('module');
    if (!release) return next(createError(404, 'Release not found'));
    
    // Lấy danh sách thành viên từ project
    let memberList = [];
    if (members) {
      let membersArray;
      // Nếu members là string (JSON), parse nó
      if (typeof members === 'string') {
        try {
          membersArray = JSON.parse(members);
        } catch (error) {
          console.error('Error parsing members JSON:', error);
          membersArray = [];
        }
      } else {
        membersArray = members;
      }
      
      if (Array.isArray(membersArray)) {
        for (const m of membersArray) {
        const user = await User.findById(m.user);
        if (user) {
          memberList.push({ user: user._id, role: m.role || 'member' });
          }
    }
      }
    } else {
      // Nếu không truyền members, lấy toàn bộ thành viên project
      const project = await Project.findById(release.module.project);
      if (project && project.members) {
        memberList = project.members.map(m => ({ user: m.user, role: m.role }));
      }
    }
    
    // Handle docs upload (Cloudinary)
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
    // Tạo sprint
    const sprint = new Sprint({
      name,
      goal,
      createdBy: req.user._id,
      startDate,
      endDate,
      status: 'Chưa bắt đầu',
      members: memberList,
      release: release._id,
      tasks: [],
      docs,
      repoLink,
      gitBranch,
      history: [{
        action: 'tạo sprint',
        oldValue: null,
        newValue: { name, goal, startDate, endDate },
        fromUser: req.user._id,
        timestamp: new Date(),
        comment: ''
      }]
    });
    await sprint.save();
    
    // Thêm lịch sử tạo sprint vào release
    release.history.push({
      action: 'tạo sprint',
      sprint: sprint._id,
      oldValue: null,
      newValue: { name, goal, startDate, endDate },
      fromUser: req.user._id,
      timestamp: new Date(),
      comment: `"${name}"`
    });
    await release.save();
    
    // Notification cho các thành viên (nếu cần)
    res.status(201).json(sprint);
  } catch (error) {
    next(error);
  }
};

exports.getSprintsByRelease = async (req, res, next) => {
  try {
    const { releaseId } = req.params;
    const sprints = await Sprint.find({ release: releaseId })
      .populate('members.user', 'userID name email role phoneNumber companyName')
      .populate('history.fromUser', 'name email');
    res.json(sprints);
  } catch (error) {
    next(error);
  }
};

// Lấy chi tiết sprint
exports.getSprint = async (req, res, next) => {
  try {
    const sprint = await Sprint.findById(req.params.id)
      .populate('members.user', 'name email role')
      .populate('history.fromUser', 'name email');
    if (!sprint) return next(createError(404, 'Sprint not found'));
    // Phân quyền: chỉ thành viên hoặc admin mới xem được
    if (
      req.user.role !== 'admin' &&
      !sprint.members.some(m => m.user.toString() === req.user._id.toString())
    ) {
      return next(createError(403, 'Bạn không có quyền truy cập sprint này.'));
    }
    res.json(sprint);
  } catch (error) {
    next(error);
  }
};

// Cập nhật sprint
exports.updateSprint = async (req, res, next) => {
  try {
    const { name, goal, startDate, endDate, status, members, keepFiles, repoLink, gitBranch } = req.body;
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return next(createError(404, 'Sprint not found'));
    // Xử lý keepFiles
    let keepPublicIds = [];
    if (typeof keepFiles === 'string') {
      try { keepPublicIds = JSON.parse(keepFiles); } catch {}
    } else if (Array.isArray(keepFiles)) {
      keepPublicIds = keepFiles;
    }
    // Xóa file cũ không còn giữ
    if (sprint.docs && sprint.docs.length > 0) {
      const toDelete = sprint.docs.filter(f => !keepPublicIds.includes(f.publicId));
      for (const doc of toDelete) {
        if (doc.publicId) {
          try { await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'auto' }); } catch {}
        }
        // Thêm lịch sử xóa file
        sprint.history.push({
          action: 'xóa file',
          oldValue: doc.fileName,
          newValue: null,
          fromUser: req.user._id,
          timestamp: new Date(),
          comment: `"${doc.fileName}"`
        });
      }
      sprint.docs = sprint.docs.filter(f => keepPublicIds.includes(f.publicId));
    }
    // Thêm file mới
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
          sprint.docs.push({
          url: file.path,
          publicId: file.filename,
            fileName: file.originalname,
            fileSize: file.size,
            contentType: file.mimetype,
            uploadedBy: req.user._id,
            uploadedAt: new Date()
          });
          // Thêm lịch sử thêm file
          sprint.history.push({
            action: 'thêm file',
            oldValue: null,
            newValue: file.originalname,
            fromUser: req.user._id,
            timestamp: new Date(),
            comment: `"${file.originalname}"`
          });
      }
    }
    // Ghi log từng trường thay đổi
    const now = new Date();
    if (name && name !== sprint.name) {
      sprint.history.push({
        action: 'cập nhật',
        oldValue: sprint.name,
        newValue: name,
        fromUser: req.user._id,
        timestamp: now,
        comment: `tên sprint từ "${sprint.name}" thành "${name}"`
      });
      sprint.name = name;
    }
    if (goal && goal !== sprint.goal) {
      sprint.history.push({
        action: 'cập nhật',
        oldValue: sprint.goal,
        newValue: goal,
        fromUser: req.user._id,
        timestamp: now,
        comment: 'mục tiêu sprint'
      });
      sprint.goal = goal;
    }
    if (startDate && String(startDate) !== String(sprint.startDate?.toISOString()?.slice(0,10))) {
      sprint.history.push({
        action: 'cập nhật',
        oldValue: sprint.startDate,
        newValue: startDate,
        fromUser: req.user._id,
        timestamp: now,
        comment: `ngày bắt đầu từ ${sprint.startDate ? new Date(sprint.startDate).toLocaleDateString('vi-VN') : ''} thành ${new Date(startDate).toLocaleDateString('vi-VN')}`
      });
      sprint.startDate = startDate;
    }
    if (endDate && String(endDate) !== String(sprint.endDate?.toISOString()?.slice(0,10))) {
      sprint.history.push({
        action: 'cập nhật',
        oldValue: sprint.endDate,
        newValue: endDate,
        fromUser: req.user._id,
        timestamp: now,
        comment: `ngày kết thúc từ ${sprint.endDate ? new Date(sprint.endDate).toLocaleDateString('vi-VN') : ''} thành ${new Date(endDate).toLocaleDateString('vi-VN')}`
      });
      sprint.endDate = endDate;
    }
    if (repoLink && repoLink !== sprint.repoLink) {
      sprint.history.push({
        action: 'cập nhật',
        oldValue: sprint.repoLink,
        newValue: repoLink,
        fromUser: req.user._id,
        timestamp: now,
        comment: `link repo từ "${sprint.repoLink || ''}" thành "${repoLink}"`
      });
      sprint.repoLink = repoLink;
    }
    if (gitBranch && gitBranch !== sprint.gitBranch) {
      sprint.history.push({
        action: 'cập nhật',
        oldValue: sprint.gitBranch,
        newValue: gitBranch,
        fromUser: req.user._id,
        timestamp: now,
        comment: `git branch từ "${sprint.gitBranch || ''}" thành "${gitBranch}"`
      });
      sprint.gitBranch = gitBranch;
    }
    if (Array.isArray(members)) {
      // So sánh danh sách thành viên cũ/mới
      const oldMemberIds = sprint.members.map(m => String(m.user));
      const newMemberIds = members.map(m => String(m.user));
      if (JSON.stringify(oldMemberIds.sort()) !== JSON.stringify(newMemberIds.sort())) {
        sprint.history.push({
          action: 'cập nhật',
          oldValue: oldMemberIds,
          newValue: newMemberIds,
          fromUser: req.user._id,
          timestamp: now,
          comment: 'danh sách thành viên sprint'
        });
      }
      let memberList = [];
      for (const m of members) {
        const user = await User.findById(m.user);
        if (user) {
          memberList.push({ user: user._id, role: m.role || 'member' });
        }
      }
      sprint.members = memberList;
    }
    await sprint.save();
    res.json(sprint);
  } catch (error) {
    next(error);
  }
};

// Xóa sprint
exports.deleteSprint = async (req, res, next) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return next(createError(404, 'Sprint not found'));
    // Phân quyền: chỉ thành viên hoặc admin mới xóa được
    if (
      req.user.role !== 'admin' &&
      !sprint.members.some(m => m.user.toString() === req.user._id.toString())
    ) {
      return next(createError(403, 'Bạn không có quyền xóa sprint này.'));
    }
    
    // Lưu thông tin sprint trước khi xóa để ghi lịch sử
    const sprintName = sprint.name;
    const releaseId = sprint.release;
    
    await sprint.deleteOne();
    
    // Thêm lịch sử xóa sprint vào release
    if (releaseId) {
      const release = await Release.findById(releaseId);
      if (release) {
        release.history.push({
          action: 'xóa sprint',
          sprint: null,
          oldValue: { name: sprintName },
          newValue: null,
          fromUser: req.user._id,
          timestamp: new Date(),
          comment: `"${sprintName}"`
        });
        await release.save();
      }
    }
    
    res.json({ message: 'Sprint deleted successfully' });
  } catch (error) {
    next(error);
  }
}; 

// Download file: trả về file stream với Content-Disposition đúng tên gốc
exports.downloadSprintFile = async (req, res, next) => {
  try {
    const sprint = await Sprint.findById(req.params.sprintId);
    if (!sprint) return next(createError(404, 'Sprint not found'));
    const file = sprint.docs.find(f => f.publicId === req.params.fileId);
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
exports.deleteSprintFile = async (req, res, next) => {
  try {
    const sprint = await Sprint.findById(req.params.sprintId);
    if (!sprint) return next(createError(404, 'Sprint not found'));
    const fileIdx = sprint.docs.findIndex(f => f.publicId === req.params.fileId);
    if (fileIdx === -1) return next(createError(404, 'File not found'));
    const file = sprint.docs[fileIdx];
    await cloudinary.uploader.destroy(file.publicId, { resource_type: 'auto' });
    sprint.docs.splice(fileIdx, 1);
    await sprint.save();
    res.json({ message: 'Đã xóa file thành công.' });
  } catch (error) {
    next(error);
  }
}; 

// Thêm nhân sự vào sprint
exports.addMembersToSprint = async (req, res, next) => {
  try {
    const sprintId = req.params.id;
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Danh sách userIds không hợp lệ.' });
    }
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });
    // Chỉ admin hoặc người tạo sprint mới được thêm
    if (
      req.user.role !== 'admin' &&
      (!sprint.createdBy || sprint.createdBy.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ message: 'Bạn không có quyền thêm nhân sự vào sprint này.' });
    }
    // Lấy danh sách user hợp lệ
    const User = require('../models/User');
    const users = await User.find({ _id: { $in: userIds } });
    const existingUserIds = sprint.members.map(m => m.user.toString());
    let added = 0;
    users.forEach(user => {
      if (!existingUserIds.includes(user._id.toString())) {
        sprint.members.push({ user: user._id, role: 'member' });
        added++;
      }
    });
    await sprint.save();
    res.json({ message: `Đã thêm ${added} nhân sự vào sprint.`, sprint });
  } catch (error) {
    next(error);
  }
}; 