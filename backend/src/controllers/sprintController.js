const Sprint = require('../models/Sprint');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const { sendNotification } = require('../index');
const { createNotification } = require('../services/notificationService');
const { updateProjectStatus } = require('../services/projectService');

exports.getSprintsByProjectId = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    const query = { project: projectId };
    // If user is not an Admin, they can only see sprints they are a member of.
    if (req.user.role !== 'Admin') {
      query['members.user'] = req.user._id;
    }

    const sprints = await Sprint.find(query)
      .populate({
        path: 'deliverables.uploadedBy',
        select: 'name email'
      })
      .populate({
        path: 'notes.createdBy',
        select: 'name'
      })
      .populate({
        path: 'history.updatedBy',
        select: 'name'
      })
      .populate({
        path: 'tasks.assigner',
        select: 'name userID phoneNumber role email companyName'
      })
      .populate({
        path: 'tasks.assignee',
        select: 'name userID phoneNumber role email companyName'
      })
      .populate({
        path: 'tasks.reviewer',
        select: 'name userID phoneNumber role email companyName'
      })
      .populate({
        path: 'tasks.receiver',
        select: 'name userID phoneNumber role email companyName'
      })
      .populate({
        path: 'tasks.history.updatedBy',
        select: 'name'
      })
      .populate({
        path: 'members.user',
        select: 'name userID phoneNumber role email companyName'
      })
      .sort({ startDate: 1 });
    res.status(200).json(sprints);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createSprint = async (req, res) => {
  try {
    const { name, goal, startDate, endDate, gitBranch, pullRequest, project } = req.body;
    let tasks = [];

    if (!name || !startDate || !endDate || !project) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['name', 'startDate', 'endDate', 'project']
      });
    }

    let projectId;
    try {
      projectId = new mongoose.Types.ObjectId(project);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid project ID format' });
    }

    if (req.body.tasks) {
      try {
        tasks = JSON.parse(req.body.tasks);

        for (const task of tasks) {
          if (!task.taskId || !task.name) {
            return res.status(400).json({ 
              message: 'Each task must have taskId and name',
              invalidTask: task
            });
          }

          const userFields = ['assigner', 'assignee', 'reviewer', 'receiver'];
          for (const field of userFields) {
            if (task[field]) {
              try {
                const user = await User.findOne({ userID: task[field] });
                if (!user) {
                  return res.status(400).json({ 
                    message: `User with userID ${task[field]} not found`,
                    field: field
                  });
                }
                task[field] = user._id;
              } catch (error) {
                console.error(`Error finding user for ${field}:`, error);
                return res.status(400).json({ 
                  message: `Error processing ${field}`,
                  error: error.message
                });
              }
            }
          }
        }
      } catch (e) {
        console.error('Error parsing tasks:', e);
        return res.status(400).json({ message: 'Invalid tasks format' });
      }
    }

    const memberIds = new Set();
    if (tasks && tasks.length > 0) {
      tasks.forEach(task => {
        if (task.assigner) memberIds.add(task.assigner.toString());
        if (task.assignee) memberIds.add(task.assignee.toString());
        if (task.reviewer) memberIds.add(task.reviewer.toString());
        if (task.receiver) memberIds.add(task.receiver.toString());
      });
    }

    const deliverables = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        deliverables.push({
          fileUrl: `/uploads/${file.filename}`,
          fileName: file.originalname,
          size: file.size,
          uploadedBy: req.user._id,
        });
      });
    }

    const newSprint = new Sprint({
      name,
      goal: goal || '',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      gitBranch: gitBranch || '',
      pullRequest: pullRequest || '',
      project: projectId,
      tasks,
      deliverables,
      members: Array.from(memberIds).map(id => ({ user: id })),
      createdBy: req.user._id,
      status: 'Chưa bắt đầu',
      acceptanceStatus: 'Chưa nghiệm thu'
    });

    await newSprint.save();

    newSprint.history.push({
      action: 'Tạo sprint mới',
      field: 'dự án',
      newValue: {
        name: newSprint.name,
        goal: newSprint.goal,
        startDate: newSprint.startDate,
        endDate: newSprint.endDate,
        gitBranch: newSprint.gitBranch,
        pullRequest: newSprint.pullRequest
      },
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    if (tasks && tasks.length > 0) {
      for (let i = 0; i < newSprint.tasks.length; i++) {
        const task = newSprint.tasks[i];
        newSprint.history.push({
          action: 'Tạo task',
          field: `Task: ${task.name}`,
          newValue: {
            taskId: task.taskId,
            name: task.name,
            assigner: task.assigner,
            assignee: task.assignee,
            status: task.status,
            reviewer: task.reviewer,
            receiver: task.receiver,
            reviewResult: task.reviewResult,
          },
          updatedBy: req.user._id,
          updatedAt: new Date()
        });
      }
    }

    await newSprint.save(); 

    // --- NOTIFICATION ---
    const creator = await User.findById(req.user._id);
    const creatorName = creator ? creator.name : 'Một quản trị viên';

    for (const member of newSprint.members) {
      await createNotification(
        member.user,
        `${creatorName} đã thêm bạn vào sprint "${newSprint.name}".`,
        'sprint',  
        newSprint._id 
      );
    }

    for (const task of newSprint.tasks) {
      const roles = [
        { field: 'assignee', label: 'giao thực hiện' },
        { field: 'assigner', label: 'phân công giao tài nguyên cho' },
        { field: 'reviewer', label: 'chỉ định review' },
        { field: 'receiver', label: 'chỉ định nhận kết quả' }
      ];
      for (const { field, label } of roles) {
        const userId = task[field];
        if (userId) {
          await createNotification(
            userId,
            `Bạn vừa được ${label} task "${task.name}" trong sprint "${newSprint.name}".`,
            'task',  
            task._id  
          );
        }
      }
    }
    // --- END NOTIFICATION ---

    const populatedSprint = await Sprint.findById(newSprint._id)
      .populate({
        path: 'deliverables.uploadedBy',
        select: 'name email'
      })
      .populate({
        path: 'notes.createdBy',
        select: 'name'
      })
      .populate({
        path: 'history.updatedBy',
        select: 'name'
      })
      .populate({
        path: 'tasks.assigner',
        select: 'name userID phoneNumber role email companyName'
      })
      .populate({
        path: 'tasks.assignee',
        select: 'name userID phoneNumber role email companyName'
      })
      .populate({
        path: 'tasks.reviewer',
        select: 'name userID phoneNumber role email companyName'
      })
      .populate({
        path: 'tasks.receiver',
        select: 'name userID phoneNumber role email companyName'
      })
      .populate({
        path: 'tasks.history.updatedBy',
        select: 'name'
      })
      .populate({
        path: 'members.user',
        select: 'name userID phoneNumber role email companyName'
      });

    newSprint.status = getSprintStatus(newSprint.tasks);
    await newSprint.save();

    await updateProjectStatus(newSprint.project);

    res.status(201).json(populatedSprint);
  } catch (error) {
    console.error('Error creating sprint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.uploadSprintDeliverable = async (req, res) => {
  try {
    const { sprintId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return res.status(400).json({ message: 'Invalid sprint ID format' });
    }

    const query = { _id: sprintId };
    if (req.user.role !== 'Admin') {
      query['members.user'] = req.user._id;
    }
    const sprint = await Sprint.findOne(query);

    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found or not authorized' });
    }

    const newDeliverables = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        newDeliverables.push({
          fileUrl: `/uploads/${file.filename}`,
          fileName: file.originalname,
          size: file.size,
          uploadedBy: req.user._id,
        });
      });
    }

    sprint.deliverables.push(...newDeliverables);

    newDeliverables.forEach(deliverable => {
      sprint.history.push({
        action: 'Tải lên tài liệu',
        field: 'Tài liệu chung',
        newValue: { fileName: deliverable.fileName, fileUrl: deliverable.fileUrl },
        updatedBy: req.user._id,
        updatedAt: new Date()
      });
    });

    await sprint.save(); 

    const populatedSprint = await Sprint.findById(sprint._id)
      .populate({
        path: 'deliverables.uploadedBy',
        select: 'name email'
      })
      .populate({
        path: 'notes.createdBy',
        select: 'name'
      })
      .populate({
        path: 'history.updatedBy',
        select: 'name'
      })
      .populate({
        path: 'tasks.assigner',
        select: 'name userID phoneNumber role email companyName'
      })
      .populate({
        path: 'tasks.assignee',
        select: 'name userID phoneNumber role email companyName'
      })
      .populate({
        path: 'tasks.reviewer',
        select: 'name userID phoneNumber role email companyName'
      })
      .populate({
        path: 'tasks.receiver',
        select: 'name userID phoneNumber role email companyName'
      })
      .populate({
        path: 'tasks.history.updatedBy',
        select: 'name'
      })
      .populate({
        path: 'members.user',
        select: 'name userID phoneNumber role email companyName'
      });

    res.status(200).json({ message: 'Deliverables uploaded successfully', sprint: populatedSprint });
  } catch (error) {
    console.error('Error uploading sprint deliverables:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.downloadSprintDeliverable = async (req, res) => {
  try {
    const { sprintId } = req.params;
    const { fileId } = req.query;

    if (!sprintId || !fileId) {
      return res.status(400).json({ message: 'Sprint ID and File ID are required' });
    }

    const query = { _id: sprintId };
    if (req.user.role !== 'Admin') {
      query['members.user'] = req.user._id;
    }
    const sprint = await Sprint.findOne(query);

    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found or not authorized' });
    }

    const deliverable = sprint.deliverables.id(fileId);

    if (!deliverable) {
      return res.status(404).json({ message: 'Deliverable not found in this sprint' });
    }
    
    const relativeFilePath = deliverable.fileUrl.startsWith('/') ? deliverable.fileUrl.substring(1) : deliverable.fileUrl;
    const filePath = path.join(process.cwd(), relativeFilePath);

    const originalFileName = deliverable.fileName;
    const fileExtension = originalFileName.split('.').pop().toLowerCase();
    let contentType = 'application/octet-stream'; // Default to generic binary file

    switch (fileExtension) {
      case 'pdf': contentType = 'application/pdf'; break;
      case 'png': contentType = 'image/png'; break;
      case 'jpg':
      case 'jpeg': contentType = 'image/jpeg'; break;
      case 'gif': contentType = 'image/gif'; break;
      case 'txt': contentType = 'text/plain'; break;
      case 'doc':
      case 'docx': contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; break;
      case 'xls':
      case 'xlsx': contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; break;
      case 'ppt':
      case 'pptx': contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'; break;
      case 'zip': contentType = 'application/zip'; break;
    }

    res.setHeader('Content-Type', contentType);

    // Check if file exists
    if (fs.existsSync(filePath)) {
      res.download(filePath, originalFileName);
    } else {
      res.status(404).json({ message: 'File not found on server' });
    }
  } catch (error) {
    console.error('Error downloading sprint deliverable:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.addTaskToSprint = async (req, res) => {
  try {
    const { sprintId } = req.params;
    const { taskId, name, request, assigner, assignee, reviewer, receiver, status, reviewResult, reviewNote } = req.body;

    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return res.status(400).json({ message: 'Invalid sprint ID format' });
    }

    const query = { _id: sprintId };
    if (req.user.role !== 'Admin') {
      query['members.user'] = req.user._id;
    }
    const sprint = await Sprint.findOne(query);

    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found or not authorized' });
    }

    if (!taskId || !name || !request) {
      return res.status(400).json({ message: 'Missing required task fields: taskId, name, request' });
    }

    const newTask = {
      taskId,
      name,
      request,
      status: status || 'Chưa làm',
      reviewResult: reviewResult || 'Chưa duyệt',
      reviewNote: reviewNote || '',
    };

    const userFields = ['assigner', 'assignee', 'reviewer', 'receiver'];
    for (const field of userFields) {
      if (req.body[field]) {
        const user = await User.findOne({ userID: req.body[field] });
        if (!user) {
          return res.status(400).json({ message: `User with UserID ${req.body[field]} not found for ${field}` });
        }
        newTask[field] = user._id;
      }
    }

    sprint.tasks.push(newTask);

    const addedTask = sprint.tasks[sprint.tasks.length - 1];

    sprint.history.push({
      action: 'Tạo task',
      field: `Task: ${newTask.name}`,
      newValue: {
        taskId: newTask.taskId,
        name: newTask.name,
        assigner: newTask.assigner,
        assignee: newTask.assignee,
        status: newTask.status,
        reviewer: newTask.reviewer,
        receiver: newTask.receiver,
        reviewResult: newTask.reviewResult,
        reviewNote: newTask.reviewNote,
      },
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    const memberIds = new Set(sprint.members.map(m => m.user.toString()));
    const newMemberIds = [];
    if (newTask.assigner && !memberIds.has(newTask.assigner.toString())) newMemberIds.push(newTask.assigner.toString());
    if (newTask.assignee && !memberIds.has(newTask.assignee.toString())) newMemberIds.push(newTask.assignee.toString());
    if (newTask.reviewer && !memberIds.has(newTask.reviewer.toString())) newMemberIds.push(newTask.reviewer.toString());
    if (newTask.receiver && !memberIds.has(newTask.receiver.toString())) newMemberIds.push(newTask.receiver.toString());
    if (newTask.assigner) memberIds.add(newTask.assigner.toString());
    if (newTask.assignee) memberIds.add(newTask.assignee.toString());
    if (newTask.reviewer) memberIds.add(newTask.reviewer.toString());
    if (newTask.receiver) memberIds.add(newTask.receiver.toString());
    sprint.members = Array.from(memberIds).map(id => ({ user: id }));

    await sprint.save();

    const populatedSprint = await Sprint.findById(sprint._id)
      .populate('tasks.assigner', 'name userID')
      .populate('tasks.assignee', 'name userID')
      .populate('tasks.reviewer', 'name userID')
      .populate('tasks.receiver', 'name userID');

    // --- LOG & NOTIFICATION ---
    const sprintLink = `/projects/${sprint.project}?tab=${sprint._id}`;

    const creator = await User.findById(req.user._id);
    const creatorName = creator ? creator.name : 'Một quản trị viên';
    for (const userId of newMemberIds) {
      await createNotification(
        userId,
        `${creatorName} đã thêm bạn vào sprint "${sprint.name}".`,
        'sprint',  
        sprint._id
      );
    }

    const roles = [
      { field: 'assignee', label: 'được giao thực hiện' },
        { field: 'assigner', label: 'được phân công giao tài nguyên cho' },
        { field: 'reviewer', label: 'được chỉ định review' },
        { field: 'receiver', label: 'được chỉ định nhận kết quả' }
    ];
    for (const { field, label } of roles) {
      const userId = newTask[field];
      if (userId) {
        await createNotification(
          userId,
          `Bạn vừa ${label} task "${newTask.name}" trong sprint "${sprint.name}".`,
          'task',  
          sprint.tasks[sprint.tasks.length - 1]._id  
        );
      }
    }
    // --- END LOG & NOTIFICATION ---

    res.status(201).json(populatedSprint.tasks.slice(-1)[0]); // Return the newly added task, populated
  } catch (error) {
    console.error('Error adding task to sprint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!taskId || !status) {
      return res.status(400).json({ message: 'Task ID và trạng thái là bắt buộc' });
    }

    const validStatuses = ['Chưa làm', 'Đang làm', 'Đã xong'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }


    const query = { 'tasks._id': taskId };
    if (req.user.role !== 'Admin') {
      query['members.user'] = req.user._id;
    }
    const sprint = await Sprint.findOne(query);

    if (!sprint) {
      return res.status(404).json({ message: 'Không tìm thấy task' });
    }

    const isMember = sprint.members.some(member => member.user.equals(req.user._id));
    if (req.user.role !== 'Admin' && !isMember) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập sprint này.' });
    }

    const task = sprint.tasks.id(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.assignee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật trạng thái task này' });
    }

    const oldStatus = task.status;

    if (oldStatus === 'Chưa làm' && status !== 'Đang làm') {
      return res.status(400).json({ message: 'Chỉ có thể chuyển từ "Chưa làm" sang "Đang làm"' });
    }
    if (oldStatus === 'Đang làm' && status !== 'Đã xong') {
      return res.status(400).json({ message: 'Chỉ có thể chuyển từ "Đang làm" sang "Đã xong"' });
    }
    if (oldStatus === 'Đã xong') {
      return res.status(400).json({ message: 'Không thể thay đổi trạng thái của task đã hoàn thành' });
    }

    task.status = status;

    // --- NOTIFICATION ---
    if (status === 'Đã xong' && oldStatus !== 'Đã xong') {
      const sprintLink = `/projects/${sprint.project}?tab=${sprint._id}`;
      const assignee = await User.findById(task.assignee);
      const assigneeName = assignee ? assignee.name : 'Một thành viên';

      if (task.reviewer && task.reviewer.toString() !== task.assignee.toString()) {
        await createNotification(
          task.reviewer,
          `${assigneeName} đã hoàn thành task "${task.name}". Vui lòng kiểm tra và review.`,
          'sprint',  
          sprint._id 
        );
      }
      if (task.receiver && task.receiver.toString() !== task.assignee.toString()) {
        await createNotification(
          task.receiver,
          `Task "${task.name}" đã được hoàn thành.`,
          'sprint',  
          sprint._id 
        );
      }
    }
    // --- END NOTIFICATION ---

    task.history.push({
      action: 'Cập nhật trạng thái',
      field: 'Trạng thái',
      oldValue: oldStatus,
      newValue: status,
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    const memberIds = new Set(sprint.members.map(m => m.user.toString()));
    const newMemberIds = [];
    if (task.assigner && !memberIds.has(task.assigner.toString())) newMemberIds.push(task.assigner.toString());
    if (task.assignee && !memberIds.has(task.assignee.toString())) newMemberIds.push(task.assignee.toString());
    if (task.reviewer && !memberIds.has(task.reviewer.toString())) newMemberIds.push(task.reviewer.toString());
    if (task.receiver && !memberIds.has(task.receiver.toString())) newMemberIds.push(task.receiver.toString());
    if (task.assigner) memberIds.add(task.assigner.toString());
    if (task.assignee) memberIds.add(task.assignee.toString());
    if (task.reviewer) memberIds.add(task.reviewer.toString());
    if (task.receiver) memberIds.add(task.receiver.toString());
    sprint.members = Array.from(memberIds).map(id => ({ user: id }));

    await sprint.save();

    sprint.status = getSprintStatus(sprint.tasks);
    await sprint.save();
    
    await updateProjectStatus(sprint.project);

    res.status(200).json(task);
  } catch (error) {
    console.error('Lỗi chi tiết khi cập nhật trạng thái task:', {
      error: error.message,
      stack: error.stack,
      taskId: req.params.taskId,
      status: req.body.status,
      userId: req.user?._id
    });
    res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái task' });
  }
};

exports.updateTaskReview = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { reviewResult, reviewNote } = req.body;

    if (!taskId || !reviewResult) {
      return res.status(400).json({ message: 'Task ID và kết quả review là bắt buộc' });
    }

    const validResults = ['Chưa duyệt', 'Đạt', 'Không đạt'];
    if (!validResults.includes(reviewResult)) {
      return res.status(400).json({ message: 'Kết quả review không hợp lệ' });
    }

    const query = { 'tasks._id': taskId };
    if (req.user.role !== 'Admin') {
      query['members.user'] = req.user._id;
    }
    const sprint = await Sprint.findOne(query);
    if (!sprint) {
      return res.status(404).json({ message: 'Không tìm thấy task' });
    }

    const task = sprint.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.status !== 'Đã xong') {
      return res.status(400).json({ message: 'Chỉ có thể review task đã hoàn thành' });
    }

    if (task.reviewer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Bạn không có quyền review task này' });
    }

    const oldReviewResult = task.reviewResult;
    task.reviewResult = reviewResult;
    task.reviewNote = reviewNote;

    // --- NOTIFICATION ---
    const sprintLink = `/projects/${sprint.project}?tab=${sprint._id}`;
    const reviewer = await User.findById(req.user._id);
    const reviewerName = reviewer ? reviewer.name : 'Người review';
    
    if (task.assignee) {
      let message = '';
      if (reviewResult === 'Đạt') {
        message = `Task "${task.name}" của bạn đã được ${reviewerName} đánh giá ĐẠT.`;
      } else if (reviewResult === 'Không đạt') {
        message = `Task "${task.name}" của bạn bị ${reviewerName} đánh giá KHÔNG ĐẠT. Vui lòng kiểm tra lại.`;
      }
      if (message) {
        await createNotification(task.assignee, message, 'sprint', sprint._id);
      }
    }
    // --- END NOTIFICATION ---

    task.history.push({
      action: 'Cập nhật kết quả review',
      field: 'Kết quả review',
      oldValue: oldReviewResult,
      newValue: reviewResult,
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    await sprint.save();

    await sprint.populate([
      { path: 'tasks.assigner', select: 'name userID phoneNumber role email companyName' },
      { path: 'tasks.assignee', select: 'name userID phoneNumber role email companyName' },
      { path: 'tasks.reviewer', select: 'name userID phoneNumber role email companyName' },
      { path: 'tasks.receiver', select: 'name userID phoneNumber role email companyName' }
    ]);

    sprint.status = getSprintStatus(sprint.tasks);
    await sprint.save();

    await updateProjectStatus(sprint.project);

    res.status(200).json(task);
  } catch (error) {
    console.error('Error updating task review:', error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật kết quả review' });
  }
};

exports.addNoteToSprint = async (req, res) => {
  try {
    const { sprintId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return res.status(400).json({ message: 'Invalid sprint ID format' });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Nội dung ghi chú không được để trống' });
    }

    const query = { _id: sprintId };
    if (req.user.role !== 'Admin') {
      query['members.user'] = req.user._id;
    }
    const sprint = await Sprint.findOne(query);
    
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint không tìm thấy hoặc không có quyền truy cập' });
    }

    const newNote = {
      content,
      createdBy: req.user._id,
      createdAt: new Date()
    };

    sprint.notes.push(newNote);

    sprint.history.push({
      action: 'Thêm ghi chú',
      field: 'Ghi chú',
      newValue: { content: newNote.content },
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    await sprint.save();

    const populatedSprint = await Sprint.findById(sprintId)
      .populate({
        path: 'deliverables.uploadedBy',
        select: 'name email'
      })
      .populate({
        path: 'notes.createdBy',
        select: 'name'
      })
      .populate({
        path: 'history.updatedBy',
        select: 'name'
      })
      .populate({
        path: 'tasks.assigner',
        select: 'name userID phoneNumber role email companyName'
      })
      .populate({
        path: 'tasks.assignee',
        select: 'name userID phoneNumber role email companyName'
      })
      .populate({
        path: 'tasks.reviewer',
        select: 'name userID phoneNumber role email companyName'
      })
      .populate({
        path: 'tasks.receiver',
        select: 'name userID phoneNumber role email companyName'
      })
      .populate({
        path: 'tasks.history.updatedBy',
        select: 'name'
      })
      .populate({
        path: 'members.user',
        select: 'name userID phoneNumber role email companyName'
      });
    
    res.status(201).json(populatedSprint);

  } catch (error) {
    console.error('Error adding note to sprint:', error);
    res.status(500).json({ message: 'Lỗi server khi thêm ghi chú', error: error.message });
  }
};

exports.deleteSprintDeliverable = async (req, res) => {
  try {
    const { sprintId, fileId } = req.params;
    const { user } = req;

    if (user.role !== 'admin' && user.role !== 'pm') {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' });
    }

    if (!mongoose.Types.ObjectId.isValid(sprintId) || !mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ message: 'Sprint ID hoặc File ID không hợp lệ.' });
    }

    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint không tìm thấy.' });
    }

    const deliverable = sprint.deliverables.id(fileId);
    if (!deliverable) {
      return res.status(404).json({ message: 'Tài liệu không tồn tại trong sprint này.' });
    }

    const relativeFilePath = deliverable.fileUrl.startsWith('/') ? deliverable.fileUrl.substring(1) : deliverable.fileUrl;
    const filePath = path.join(process.cwd(), relativeFilePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    sprint.history.push({
      action: 'Xóa tài liệu',
      field: 'Tài liệu chung',
      newValue: { fileName: deliverable.fileName },
      updatedBy: user._id,
      updatedAt: new Date()
    });

    sprint.deliverables.pull(fileId);

    await sprint.save();

    const populatedSprint = await sprint.populate({ path: 'history.updatedBy', select: 'name' });

    res.status(200).json({ message: 'Tài liệu đã được xóa thành công.', sprint: populatedSprint });

  } catch (error) {
    console.error('Error deleting sprint deliverable:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa tài liệu.', error: error.message });
  }
};

exports.updateAcceptanceStatus = async (req, res) => {
  try {
    const { sprintId } = req.params;
    const { acceptanceStatus } = req.body;
    const { user } = req;

    if (user.role !== 'admin' && user.role !== 'pm') {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' });
    }

    const validStatuses = ['Chưa nghiệm thu', 'Đã nghiệm thu'];
    if (!acceptanceStatus || !validStatuses.includes(acceptanceStatus)) {
      return res.status(400).json({ message: 'Trạng thái nghiệm thu không hợp lệ.' });
    }

    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return res.status(400).json({ message: 'Sprint ID không hợp lệ.' });
    }

    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint không tìm thấy.' });
    }

    const oldStatus = sprint.acceptanceStatus;
    if (oldStatus !== acceptanceStatus) {
      sprint.acceptanceStatus = acceptanceStatus;
      sprint.history.push({
        action: 'Cập nhật nghiệm thu',
        field: 'Trạng thái nghiệm thu',
        oldValue: oldStatus,
        newValue: acceptanceStatus,
        updatedBy: user._id,
        updatedAt: new Date()
      });
      await sprint.save();

      await updateProjectStatus(sprint.project);
    }

    res.status(200).json({ message: 'Trạng thái nghiệm thu đã được cập nhật.', sprint });

  } catch (error) {
    console.error('Error updating sprint acceptance status:', error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái nghiệm thu.', error: error.message });
  }
};

function getSprintStatus(tasks) {
  if (!tasks || tasks.length === 0) {
    return 'Chưa bắt đầu';
  }
  const allReviewed = tasks.every(task => ['Đạt', 'Không đạt'].includes(task.reviewResult));
  if (allReviewed) {
    return 'Đã kết thúc';
  }
  const anyInProgress = tasks.some(task => ['Đang làm', 'Đã xong'].includes(task.status));
  if (anyInProgress) {
    return 'Đang chạy';
  }
  return 'Chưa bắt đầu';
}

exports.getProjectInfo = async (req, res) => {
  try {
    const { type, refId } = req.query;
    
    if (!type || !refId) {
      return res.status(400).json({ message: 'Type và refId là bắt buộc' });
    }

    let projectId = null;
    let sprintId = null;

    if (type === 'sprint') {
      const sprint = await Sprint.findById(refId).select('project');
      if (!sprint) {
        return res.status(404).json({ message: 'Sprint không tồn tại' });
      }
      projectId = sprint.project;
      sprintId = refId;
    } else if (type === 'task') {
      const sprint = await Sprint.findOne({ 'tasks._id': refId }).select('project');
      if (!sprint) {
        return res.status(404).json({ message: 'Task không tồn tại' });
      }
      projectId = sprint.project;
      sprintId = sprint._id;
    } else if (type === 'project') {
      projectId = refId;
    } else {
      return res.status(400).json({ message: 'Type không hợp lệ' });
    }

    res.status(200).json({
      projectId,
      sprintId,
      navigationUrl: sprintId ? `/projects/${projectId}?tab=${sprintId}` : `/projects/${projectId}`
    });
  } catch (error) {
    console.error('Error getting project info:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 