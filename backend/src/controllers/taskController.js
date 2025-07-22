const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const Release = require('../models/Release');
const Module = require('../models/Module');
const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const socketManager = require('../socket');
const { createError } = require('../utils/error');
const { createNotification } = require('../services/notificationService');

// Helper: cập nhật trạng thái tự động cho Sprint, Release, Module, Project
async function updateStatusAfterTaskChange(sprintId) {
  // Cập nhật trạng thái Sprint
  const sprint = await Sprint.findById(sprintId).populate('tasks');
  if (!sprint) return;
  const tasks = await Task.find({ sprint: sprint._id });
  // Mapping trạng thái Sprint
  let sprintStatus = 'Chưa bắt đầu';
  if (tasks.length === 0 || tasks.every(t => t.status === 'Chưa làm')) {
    sprintStatus = 'Chưa bắt đầu';
  } else if (tasks.some(t => t.status === 'Đang làm' || t.status === 'Đã xong')) {
    sprintStatus = 'Đang thực hiện';
  }
  // Sprint chỉ hoàn thành khi TẤT CẢ task đều được review "Đạt"
  if (tasks.length > 0 && tasks.every(t => t.reviewStatus === 'Đạt')) {
    sprintStatus = 'Hoàn thành';
  }
  sprint.status = sprintStatus;
  await sprint.save();
  // Cập nhật Release
  const release = await Release.findById(sprint.release);
  if (release) {
    const sprints = await Sprint.find({ release: release._id });
    let releaseStatus = 'Chưa bắt đầu';
    if (sprints.length === 0 || sprints.every(s => s.status === 'Chưa bắt đầu')) {
      releaseStatus = 'Chưa bắt đầu';
    } else if (sprints.some(s => s.status === 'Đang thực hiện' || s.status === 'Hoàn thành')) {
      releaseStatus = 'Đang chuẩn bị';
    }
    const oldStatus = release.status;
    if (sprints.length > 0 && sprints.every(s => s.status === 'Hoàn thành')) {
      releaseStatus = 'Hoàn thành';
      // Nếu trạng thái cũ khác 'Hoàn thành', gửi notification cho approver
      if (oldStatus !== 'Hoàn thành' && release.approver) {
        // Lấy thông tin module và project
        const populatedModule = await Module.findById(release.module).populate('project', 'name');
        const projectName = populatedModule.project?.name || '';
        const moduleName = populatedModule.name || '';
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
    }
    release.status = releaseStatus;
    await release.save();
    // Cập nhật Module
    const module = await Module.findById(release.module);
    if (module) {
      const releases = await Release.find({ module: module._id });
      let moduleStatus = 'Chưa phát triển';
      if (releases.length === 0 || releases[releases.length-1].status === 'Chưa bắt đầu') {
        moduleStatus = 'Chưa phát triển';
      } else if (releases[releases.length-1].status === 'Đang chuẩn bị' || releases[releases.length-1].status === 'Hoàn thành') {
        moduleStatus = 'Đang phát triển';
      }
      if (releases[releases.length-1].acceptanceStatus === 'Đạt') {
        moduleStatus = 'Hoàn thành';
      }
      module.status = moduleStatus;
      await module.save();
      // Cập nhật Project
      const project = await Project.findById(module.project);
      if (project) {
        const modules = await Module.find({ project: project._id });
        let projectStatus = 'Khởi tạo';
        if (modules.length === 0 || modules.every(m => m.status === 'Chưa phát triển')) {
          projectStatus = 'Khởi tạo';
        } else if (modules.some(m => m.status === 'Đang phát triển')) {
          projectStatus = 'Đang triển khai';
        }
        if (modules.length > 0 && modules.every(m => m.status === 'Hoàn thành')) {
          projectStatus = 'Hoàn thành';
        }
        project.status = projectStatus;
        await project.save();
      }
    }
  }
}

// Tạo task mới
exports.createTask = async (req, res, next) => {
  try {
    const { taskId, name, goal, assignee, reviewer, sprint } = req.body;
    if (!taskId || !name || !assignee || !reviewer || !sprint) {
      return next(createError(400, 'Vui lòng nhập đầy đủ taskId, name, assignee, reviewer, sprint.'));
    }
    const sprintDoc = await Sprint.findById(sprint);
    if (!sprintDoc) return next(createError(404, 'Sprint not found'));
    const task = new Task({
      taskId,
      name,
      goal,
      createdBy: req.user._id,
      assignee,
      reviewer,
      sprint: sprintDoc._id,
      status: 'Chưa làm',
      reviewStatus: 'Chưa',
      history: [{
        action: 'tạo task',
        fromUser: req.user._id,
        timestamp: new Date(),
        description: `đã tạo task "${name}"`,
        isPrimary: false
      }],
    });
    await task.save();
    sprintDoc.tasks.push(task._id);
    
    // Thêm lịch sử tạo task vào sprint
    sprintDoc.history.push({
      action: 'tạo task',
      task: task._id,
      fromUser: req.user._id,
      timestamp: new Date(),
      description: `đã tạo task "${task.name}" trong sprint "${sprintDoc.name}"`,
      isPrimary: true
    });
    await sprintDoc.save();
    await updateStatusAfterTaskChange(sprintDoc._id);
    
    // Lấy thông tin cần thiết cho notification
    const populatedTask = await Task.findById(task._id)
      .populate('assignee', 'name email')
      .populate('reviewer', 'name email');
    
    const sprintWithRelease = await Sprint.findById(sprintDoc._id)
      .populate({
        path: 'release',
        populate: {
          path: 'module',
          populate: {
            path: 'project',
            select: 'name'
          }
        }
      });
    
    const projectName = sprintWithRelease.release.module.project.name;
    const moduleName = sprintWithRelease.release.module.name;
    const endDate = sprintWithRelease.endDate;
    
    // Notification cho assignee
    if (populatedTask.assignee) {
      const assigneeMessage = `Bạn được phân công thực hiện task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}". Hạn chót: ${new Date(endDate).toLocaleDateString('vi-VN')}.`;
      
      const notification = await Notification.create({
        user: populatedTask.assignee._id,
        type: 'task_assigned',
        refId: task._id.toString(),
        message: assigneeMessage
      });
      
      socketManager.sendNotification(populatedTask.assignee._id, notification);
    }
    
    // Notification cho reviewer
    if (populatedTask.reviewer) {
      const reviewerMessage = `Bạn được phân công đánh giá kết quả task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}". Hạn chót: ${new Date(endDate).toLocaleDateString('vi-VN')}.`;
      
      const notification = await Notification.create({
        user: populatedTask.reviewer._id,
        type: 'task_review_assigned',
        refId: task._id.toString(),
        message: reviewerMessage
      });
      
      socketManager.sendNotification(populatedTask.reviewer._id, notification);
    }
    
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách task theo sprint
exports.getTasksBySprint = async (req, res, next) => {
  try {
    const { sprintId } = req.params;
    const tasks = await Task.find({ sprint: sprintId })
      .populate('assignee', 'name email')
      .populate('reviewer', 'name email');
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

// Lấy chi tiết task
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email')
      .populate('reviewer', 'name email');
    if (!task) return next(createError(404, 'Task not found'));
    res.json(task);
  } catch (error) {
    next(error);
  }
};

// Cập nhật task
exports.updateTask = async (req, res, next) => {
  try {
    const { name, goal, assignee, reviewer } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return next(createError(404, 'Task not found'));
    const oldValue = { name: task.name, goal: task.goal, assignee: task.assignee, reviewer: task.reviewer };
    if (name) task.name = name;
    if (goal) task.goal = goal;
    if (assignee) task.assignee = assignee;
    if (reviewer) task.reviewer = reviewer;
    task.history.push({
      action: 'cập nhật thông tin task',
      fromUser: req.user._id,
      timestamp: new Date(),
      description: `đã cập nhật thông tin task "${task.name}"`,
      isPrimary: true
    });
    await task.save();
    res.json(task);
  } catch (error) {
    next(error);
  }
};

// Xóa task
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return next(createError(404, 'Task not found'));
    const sprint = await Sprint.findById(task.sprint);
    if (sprint) {
      sprint.tasks = sprint.tasks.filter(tid => tid.toString() !== task._id.toString());
      
      // Thêm lịch sử xóa task vào sprint
      sprint.history.push({
        action: 'xóa task',
        task: null,
        fromUser: req.user._id,
        timestamp: new Date(),
        description: `đã xóa task "${task.name}" khỏi sprint "${sprint.name}"`
      });
      await sprint.save();
    }
    await task.deleteOne();
    await updateStatusAfterTaskChange(task.sprint);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Cập nhật trạng thái task
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return next(createError(404, 'Task not found'));
    const oldStatus = task.status;
    if (status && ['Chưa làm', 'Đang làm', 'Đã xong'].includes(status)) {
      task.status = status;
      
      // Nếu task được cập nhật thành "Đã xong" => reset reviewStatus về "Chưa"
      if (status === 'Đã xong') {
        task.reviewStatus = 'Chưa';
      }
      
      task.history.push({
        action: 'cập nhật trạng thái',
        fromUser: req.user._id,
        timestamp: new Date(),
        description: `đã cập nhật trạng thái của task "${task.name}" từ "${oldStatus}" thành "${status}"`,
        isPrimary: false
      });
      await task.save();

      // Thêm lịch sử vào sprint cha
      const sprint = await Sprint.findById(task.sprint);
      if (sprint) {
        sprint.history.push({
          action: 'cập nhật trạng thái',
          task: task._id,
          fromUser: req.user._id,
          timestamp: new Date(),
          description: `đã cập nhật trạng thái của task "${task.name}" trong sprint "${sprint.name}" từ "${oldStatus}" thành "${status}"`,
          isPrimary: true
        });
        await sprint.save();
      }

      await updateStatusAfterTaskChange(task.sprint);
      
      // Notification cho reviewer nếu task Đã xong
      if (status === 'Đã xong') {
        // Lấy thông tin module và project cho thông báo
        const sprintDoc = await Sprint.findById(task.sprint)
          .populate({
            path: 'release',
            populate: {
              path: 'module',
              populate: {
                path: 'project',
                select: 'name'
              }
            }
          });
        let moduleName = '';
        let projectName = '';
        if (
          sprintDoc &&
          sprintDoc.release &&
          sprintDoc.release.module &&
          sprintDoc.release.module.project
        ) {
          moduleName = sprintDoc.release.module.name;
          projectName = sprintDoc.release.module.project.name;
        }
        const populatedTask = await Task.findById(task._id)
          .populate('reviewer', 'name email');
        if (populatedTask.reviewer) {
          const reviewerMessage = `Task "${task.name}" thuộc module "${moduleName}" của dự án "${projectName}" đã thực hiện xong. Vui lòng nhận xét, đánh giá kết quả.`;
          const notification = await Notification.create({
            user: populatedTask.reviewer._id,
            type: 'task_completed',
            refId: task._id.toString(),
            message: reviewerMessage
          });
          socketManager.sendNotification(populatedTask.reviewer._id, notification);
        }
      }
      
      res.json(task);
    } else {
      return next(createError(400, 'Trạng thái không hợp lệ'));
    }
  } catch (error) {
    next(error);
  }
};

// Cập nhật reviewStatus task
exports.updateTaskReviewStatus = async (req, res, next) => {
  try {
    const { reviewStatus, comment } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return next(createError(404, 'Task not found'));
    const oldReviewStatus = task.reviewStatus;

    // Lấy thông tin module và project cho thông báo
    const sprintDoc = await Sprint.findById(task.sprint)
      .populate({
        path: 'release',
        populate: {
          path: 'module',
          populate: {
            path: 'project',
            select: 'name'
          }
        }
      });
    let moduleName = '';
    let projectName = '';
    if (
      sprintDoc &&
      sprintDoc.release &&
      sprintDoc.release.module &&
      sprintDoc.release.module.project
    ) {
      moduleName = sprintDoc.release.module.name;
      projectName = sprintDoc.release.module.project.name;
    }
    if (reviewStatus && ['Chưa', 'Đạt', 'Không đạt'].includes(reviewStatus)) {
      const oldReviewStatus = task.reviewStatus;
      task.reviewStatus = reviewStatus;
      task.history.push({
        action: 'cập nhật đánh giá',
        fromUser: req.user._id,
        timestamp: new Date(),
        description: `đã cập nhật đánh giá cho task "${task.name}" thành "${reviewStatus}"`,
        isPrimary: false
      });
      if (reviewStatus === 'Không đạt') {
        task.status = 'Đang làm';
      }
      await task.save();

      // Thêm lịch sử vào sprint cha
      const sprint = await Sprint.findById(task.sprint);
      if (sprint) {
        sprint.history.push({
          action: 'cập nhật đánh giá',
          task: task._id,
          fromUser: req.user._id,
          timestamp: new Date(),
          description: `đã cập nhật đánh giá cho task "${task.name}" trong sprint "${sprint.name}" thành "${reviewStatus}"`,
          isPrimary: true
        });
        await sprint.save();
      }
      
      await updateStatusAfterTaskChange(task.sprint);
      res.json(task);
    } else {
      return next(createError(400, 'Trạng thái review không hợp lệ'));
    }
  } catch (error) {
    next(error);
  }
}; 

// API: Lấy releaseId và sprintId từ taskId để phục vụ điều hướng notification
exports.getTaskNavigationInfo = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const sprint = await Sprint.findById(task.sprint);
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });
    const releaseId = sprint.release;
    return res.json({
      releaseId,
      sprintId: sprint._id
    });
  } catch (err) {
    next(err);
  }
}; 

// Thêm hàm lấy tất cả task
exports.getAllTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find()
      .populate('assignee', 'name email')
      .populate('reviewer', 'name email');
    res.json(tasks);
  } catch (error) {
    next(error);
  }
}; 