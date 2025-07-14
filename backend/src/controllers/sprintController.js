const Sprint = require('../models/Sprint');
const Release = require('../models/Release');
const Project = require('../models/Project');
const User = require('../models/User');
const { createError } = require('../utils/error');
const { uploadFile, getFileStream } = require('../utils/gridfs');

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
    
    // Handle docs upload
    let docs = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await uploadFile(file, {
          uploadedBy: req.user._id,
          sprintId: undefined // can add sprintId after creation if needed
        });
        docs.push({
          fileId: uploadResult.fileId,
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
      .populate('members.user', 'userID name email role phoneNumber companyName');
    res.json(sprints);
  } catch (error) {
    next(error);
  }
};

// Lấy chi tiết sprint
exports.getSprint = async (req, res, next) => {
  try {
    const sprint = await Sprint.findById(req.params.id)
      .populate('members.user', 'name email role');
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
    let keepFileIds = [];
    if (typeof keepFiles === 'string') {
      try { keepFileIds = JSON.parse(keepFiles); } catch {}
    } else if (Array.isArray(keepFiles)) {
      keepFileIds = keepFiles;
    }
    // Xóa file cũ không còn giữ
    if (sprint.docs && sprint.docs.length > 0) {
      const toDelete = sprint.docs.filter(f => !keepFileIds.includes(f.fileId.toString()));
      for (const doc of toDelete) {
        if (doc.fileId) {
          try { await require('../utils/gridfs').deleteFile(doc.fileId); } catch {}
        }
        // (Optional) Add file delete history here if needed
      }
      sprint.docs = sprint.docs.filter(f => keepFileIds.includes(f.fileId.toString()));
    }
    // Thêm file mới
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const uploadResult = await require('../utils/gridfs').uploadFile(file, {
            uploadedBy: req.user._id,
            sprintId: sprint._id
          });
          sprint.docs.push({
            fileId: uploadResult.fileId,
            fileName: file.originalname,
            fileSize: file.size,
            contentType: file.mimetype,
            uploadedBy: req.user._id,
            uploadedAt: new Date()
          });
          // (Optional) Add file upload history here if needed
        } catch {}
      }
    }
    // Cập nhật các trường khác (trừ status - chỉ cập nhật tự động)
    if (name) sprint.name = name;
    if (goal) sprint.goal = goal;
    if (startDate) sprint.startDate = startDate;
    if (endDate) sprint.endDate = endDate;
    // Không cho phép cập nhật status thủ công - chỉ cập nhật tự động
    // if (status) sprint.status = status;
    if (repoLink !== undefined) sprint.repoLink = repoLink;
    if (gitBranch !== undefined) sprint.gitBranch = gitBranch;
    if (Array.isArray(members)) {
      let memberList = [];
      for (const m of members) {
        const user = await User.findById(m.user);
        if (user) {
          memberList.push({ user: user._id, role: m.role || 'member' });
        }
      }
      sprint.members = memberList;
    }
    sprint.history.push({
      action: 'update',
      oldValue: null,
      newValue: { name, goal, startDate, endDate, repoLink, gitBranch },
      fromUser: req.user._id,
      timestamp: new Date(),
      comment: 'Cập nhật sprint (trạng thái được cập nhật tự động)'
    });
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

exports.downloadSprintFile = async (req, res, next) => {
  try {
    const { sprintId, fileId } = req.params;
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return next(createError(404, 'Sprint not found'));
    }

    // Kiểm tra quyền truy cập
    if (
      req.user.role !== 'admin' &&
      !sprint.members.some(m => m.user.toString() === req.user._id.toString())
    ) {
      return next(createError(403, 'Bạn không có quyền tải file này.'));
    }

    const fileMeta = sprint.docs.find(doc => doc.fileId.toString() === fileId);
    if (!fileMeta) {
      return next(createError(404, 'File not found in sprint'));
    }

    // Lấy stream từ GridFS
    const { createDownloadStream } = require('../utils/gridfs');
    let fileStream;
    try {
      fileStream = createDownloadStream(fileId);
    } catch (err) {
      return next(createError(404, 'File not found in storage'));
    }

    res.set('Content-Type', fileMeta.contentType || 'application/octet-stream');
    const fileName = fileMeta.fileName || 'download';
    const encodedFileName = encodeURIComponent(fileName);
    res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

exports.deleteSprintFile = async (req, res, next) => {
  try {
    const { sprintId, fileId } = req.params;
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return next(createError(404, 'Sprint not found'));
    }

    // Kiểm tra quyền truy cập
    if (
      req.user.role !== 'admin' &&
      !sprint.members.some(m => m.user.toString() === req.user._id.toString())
    ) {
      return next(createError(403, 'Bạn không có quyền xóa file này.'));
    }

    const fileMeta = sprint.docs.find(doc => doc.fileId.toString() === fileId);
    if (!fileMeta) {
      return next(createError(404, 'File not found in sprint'));
    }

    // Xóa file khỏi GridFS
    try {
      await require('../utils/gridfs').deleteFile(fileId);
    } catch (err) {
      console.error('Error deleting file from GridFS:', err);
    }

    // Xóa file khỏi sprint docs
    sprint.docs = sprint.docs.filter(doc => doc.fileId.toString() !== fileId);
    await sprint.save();

    res.json({ message: 'File deleted successfully' });
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