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

    // Validate required fields
    if (!name || !startDate || !endDate || !project) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['name', 'startDate', 'endDate', 'project']
      });
    }

    // Convert project string to ObjectId
    let projectId;
    try {
      projectId = new mongoose.Types.ObjectId(project);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid project ID format' });
    }

    // Parse tasks if they are sent as a JSON string
    if (req.body.tasks) {
      try {
        tasks = JSON.parse(req.body.tasks);
        
        // Validate and convert user IDs in tasks
        for (const task of tasks) {
          if (!task.taskId || !task.name) {
            return res.status(400).json({ 
              message: 'Each task must have taskId and name',
              invalidTask: task
            });
          }

          // Convert userIDs to ObjectIds
          const userFields = ['assigner', 'assignee', 'reviewer', 'receiver'];
          for (const field of userFields) {
            if (task[field]) {
              try {
                // Find user by userID
                const user = await User.findOne({ userID: task[field] });
                if (!user) {
                  return res.status(400).json({ 
                    message: `User with userID ${task[field]} not found`,
                    field: field
                  });
                }
                // Replace userID with user's _id
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

    // Collect unique member IDs from tasks
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

    // Add history entry for sprint creation
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

    // Add task history entries for tasks created during sprint creation
    if (tasks && tasks.length > 0) {
      for (let i = 0; i < newSprint.tasks.length; i++) {
        const task = newSprint.tasks[i];
        // Thêm vào sprint.history
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

    await newSprint.save(); // Save again to include all history

    // --- NOTIFICATION ---
    // Notify all members they have been added to the sprint
    const creator = await User.findById(req.user._id);
    const creatorName = creator ? creator.name : 'Một quản trị viên';

    for (const member of newSprint.members) {
      if (member.user.toString() !== req.user._id.toString()) {
        await createNotification(
          member.user,
          `${creatorName} đã thêm bạn vào sprint "${newSprint.name}".`,
          'sprint',  // type
          newSprint._id  // refId
        );
      }
    }

    // Notify assignees of their new tasks
    for (const task of newSprint.tasks) {
      // Gửi cho từng vai trò nếu có và không trùng người tạo, không gửi trùng lặp
      const notified = new Set();
      const roles = [
        { field: 'assignee', label: 'được giao thực hiện' },
        { field: 'assigner', label: 'được phân công giao tài nguyên cho' },
        { field: 'reviewer', label: 'được chỉ định review' },
        { field: 'receiver', label: 'được chỉ định nhận kết quả' }
      ];
      for (const { field, label } of roles) {
        const userId = task[field];
        if (userId && userId.toString() !== req.user._id.toString() && !notified.has(userId.toString())) {
          await createNotification(
            userId,
            `Bạn vừa ${label} task "${task.name}" trong sprint "${newSprint.name}".`,
            'task',  // type
            task._id  // refId
          );
          notified.add(userId.toString());
        }
      }
    }
    // --- END NOTIFICATION ---

    // Populate the sprint data before returning
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

    // Add new deliverables to the existing sprint's deliverables array
    sprint.deliverables.push(...newDeliverables);

    // Add history entry for each uploaded deliverable
    newDeliverables.forEach(deliverable => {
      sprint.history.push({
        action: 'Tải lên tài liệu',
        field: 'Tài liệu chung',
        newValue: { fileName: deliverable.fileName, fileUrl: deliverable.fileUrl },
        updatedBy: req.user._id,
        updatedAt: new Date()
      });
    });

    await sprint.save(); // Save once for both deliverables and history

    // Populate the sprint data before returning
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
    
    // Construct the full path to the file
    const relativeFilePath = deliverable.fileUrl.startsWith('/') ? deliverable.fileUrl.substring(1) : deliverable.fileUrl;
    const filePath = path.join(process.cwd(), relativeFilePath);

    // Determine Content-Type based on original filename extension
    const originalFileName = deliverable.fileName;
    const fileExtension = originalFileName.split('.').pop().toLowerCase();
    let contentType = 'application/octet-stream'; // Default to generic binary file

    // Basic MIME type mapping
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

    // Validate required task fields
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

    // Convert UserIDs to ObjectIds for assigner, assignee, reviewer, receiver
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

    // Get the newly added task to add history to it
    const addedTask = sprint.tasks[sprint.tasks.length - 1];
    
    // Chỉ ghi vào sprint.history
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

    // Update sprint members with any new users from the new task
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

    // Populate the sprint to get full user details
    const populatedSprint = await Sprint.findById(sprint._id)
      .populate('tasks.assigner', 'name userID')
      .populate('tasks.assignee', 'name userID')
      .populate('tasks.reviewer', 'name userID')
      .populate('tasks.receiver', 'name userID');

    // --- LOG & NOTIFICATION ---
    const sprintLink = `/projects/${sprint.project}?tab=${sprint._id}`;
    const notifiedUsers = new Set();

    // Gửi thông báo "... đã thêm bạn vào sprint ..." cho các thành viên mới TRƯỚC
    const creator = await User.findById(req.user._id);
    const creatorName = creator ? creator.name : 'Một quản trị viên';
    for (const userId of newMemberIds) {
      if (userId !== req.user._id.toString()) {
        await createNotification(
          userId,
          `${creatorName} đã thêm bạn vào sprint "${sprint.name}".`,
          'sprint',  // type
          sprint._id // refId
        );
      }
    }

    // Gửi thông báo về phân công task SAU
    const roles = [
      { field: 'assignee', label: 'được giao thực hiện' },
      { field: 'assigner', label: 'được phân công giao tài nguyên cho' },
      { field: 'reviewer', label: 'được chỉ định review' },
      { field: 'receiver', label: 'được chỉ định nhận kết quả' }
    ];
    for (const { field, label } of roles) {
      const userId = newTask[field];
      if (userId && !notifiedUsers.has(userId.toString())) {
        await createNotification(
          userId,
          `Bạn vừa ${label} task "${newTask.name}" trong sprint "${sprint.name}".`,
          'task',  // type
          sprint.tasks[sprint.tasks.length - 1]._id  // refId của task mới
        );
        notifiedUsers.add(userId.toString());
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

    // Validate status values
    const validStatuses = ['Chưa làm', 'Đang làm', 'Đã xong'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    // Find the sprint containing the task
    const query = { 'tasks._id': taskId };
    if (req.user.role !== 'Admin') {
      query['members.user'] = req.user._id;
    }
    const sprint = await Sprint.findOne(query);

    if (!sprint) {
      return res.status(404).json({ message: 'Không tìm thấy task' });
    }

    // Authorization check
    const isMember = sprint.members.some(member => member.user.equals(req.user._id));
    if (req.user.role !== 'Admin' && !isMember) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập sprint này.' });
    }

    // Find the task
    const task = sprint.tasks.id(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is the assignee
    if (task.assignee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật trạng thái task này' });
    }

    // Validate status transition
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

    // Update task status
    task.status = status;

    // --- NOTIFICATION ---
    if (status === 'Đã xong' && oldStatus !== 'Đã xong') {
      const sprintLink = `/projects/${sprint.project}?tab=${sprint._id}`;
      const assignee = await User.findById(task.assignee);
      const assigneeName = assignee ? assignee.name : 'Một thành viên';

      // Notify reviewer
      if (task.reviewer && task.reviewer.toString() !== task.assignee.toString()) {
        await createNotification(
          task.reviewer,
          `${assigneeName} đã hoàn thành task "${task.name}". Vui lòng kiểm tra và review.`,
          'sprint',  // type
          sprint._id // refId
        );
      }
      // Notify receiver
      if (task.receiver && task.receiver.toString() !== task.assignee.toString()) {
        await createNotification(
          task.receiver,
          `Task "${task.name}" đã được hoàn thành.`,
          'sprint',  // type
          sprint._id // refId
        );
      }
    }
    // --- END NOTIFICATION ---

    // Add to task history
    task.history.push({
      action: 'Cập nhật trạng thái',
      field: 'Trạng thái',
      oldValue: oldStatus,
      newValue: status,
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    // Update sprint members with any new users from the new task
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

    // LOG: Kiểm tra trạng thái sprint trước khi cập nhật
    console.log('[updateTaskStatus] Trạng thái sprint CŨ:', sprint.status);
    console.log('[updateTaskStatus] Danh sách task TRƯỚC khi tính toán lại:', sprint.tasks.map(t => ({ id: t.taskId, status: t.status, review: t.reviewResult })));

    // Cập nhật lại trạng thái sprint
    sprint.status = getSprintStatus(sprint.tasks);
    await sprint.save();
    
    // LOG: Kiểm tra trạng thái sprint sau khi cập nhật
    console.log('[updateTaskStatus] Trạng thái sprint MỚI:', sprint.status);

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

    // Validate review result values
    const validResults = ['Chưa duyệt', 'Đạt', 'Không đạt'];
    if (!validResults.includes(reviewResult)) {
      return res.status(400).json({ message: 'Kết quả review không hợp lệ' });
    }

    // Find the sprint containing the task
    const query = { 'tasks._id': taskId };
    if (req.user.role !== 'Admin') {
      query['members.user'] = req.user._id;
    }
    const sprint = await Sprint.findOne(query);
    if (!sprint) {
      return res.status(404).json({ message: 'Không tìm thấy task' });
    }

    // Find the task
    const task = sprint.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if task is completed
    if (task.status !== 'Đã xong') {
      return res.status(400).json({ message: 'Chỉ có thể review task đã hoàn thành' });
    }

    // Check if user is the reviewer
    if (task.reviewer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Bạn không có quyền review task này' });
    }

    // Update review result
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

    // Add to task history
    task.history.push({
      action: 'Cập nhật kết quả review',
      field: 'Kết quả review',
      oldValue: oldReviewResult,
      newValue: reviewResult,
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    await sprint.save();

    // Populate the updated task data
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

    // Add history entry for note creation
    sprint.history.push({
      action: 'Thêm ghi chú',
      field: 'Ghi chú',
      newValue: { content: newNote.content },
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    await sprint.save();

    // Populate the sprint data before returning
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

    // 1. Authorization Check: Only Admin or PM can delete.
    if (user.role !== 'admin' && user.role !== 'pm') {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' });
    }

    if (!mongoose.Types.ObjectId.isValid(sprintId) || !mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ message: 'Sprint ID hoặc File ID không hợp lệ.' });
    }

    // 2. Find the sprint
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint không tìm thấy.' });
    }

    // 3. Find the deliverable
    const deliverable = sprint.deliverables.id(fileId);
    if (!deliverable) {
      return res.status(404).json({ message: 'Tài liệu không tồn tại trong sprint này.' });
    }

    // 4. Delete the physical file with corrected path logic
    const relativeFilePath = deliverable.fileUrl.startsWith('/') ? deliverable.fileUrl.substring(1) : deliverable.fileUrl;
    const filePath = path.join(process.cwd(), relativeFilePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 5. Add to history before removing
    sprint.history.push({
      action: 'Xóa tài liệu',
      field: 'Tài liệu chung',
      newValue: { fileName: deliverable.fileName },
      updatedBy: user._id,
      updatedAt: new Date()
    });

    // 6. Remove from database using pull for reliability
    sprint.deliverables.pull(fileId);
    
    // 7. Save the sprint
    await sprint.save();

    // Re-populate user details for the history entry to be displayed correctly on the frontend
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

    // 1. Authorization Check: Only Admin or PM can change status.
    if (user.role !== 'admin' && user.role !== 'pm') {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' });
    }

    // 2. Validate status
    const validStatuses = ['Chưa nghiệm thu', 'Đã nghiệm thu'];
    if (!acceptanceStatus || !validStatuses.includes(acceptanceStatus)) {
      return res.status(400).json({ message: 'Trạng thái nghiệm thu không hợp lệ.' });
    }

    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return res.status(400).json({ message: 'Sprint ID không hợp lệ.' });
    }

    // 3. Find the sprint
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint không tìm thấy.' });
    }
    
    // 4. Update status and history
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

      // Logic cập nhật project.status đã được chuyển vào projectService
      await updateProjectStatus(sprint.project);
    }

    res.status(200).json({ message: 'Trạng thái nghiệm thu đã được cập nhật.', sprint });

  } catch (error) {
    console.error('Error updating sprint acceptance status:', error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái nghiệm thu.', error: error.message });
  }
};

// Helper xác định trạng thái sprint
function getSprintStatus(tasks) {
  console.log('[getSprintStatus] Bắt đầu tính toán với các task:', tasks.map(t => ({ id: t.taskId, status: t.status, review: t.reviewResult })));
  if (!tasks || tasks.length === 0) {
    console.log('[getSprintStatus] Kết quả: Chưa bắt đầu (không có task)');
    return 'Chưa bắt đầu';
  }
  // Nếu tất cả task đều có reviewResult là 'Đạt' hoặc 'Không đạt' => Đã kết thúc
  const allReviewed = tasks.every(task => ['Đạt', 'Không đạt'].includes(task.reviewResult));
  if (allReviewed) {
    console.log('[getSprintStatus] Kết quả: Đã kết thúc (tất cả đã review)');
    return 'Đã kết thúc';
  }
  // Nếu có ít nhất 1 task đang làm hoặc đã xong => Đang chạy
  const anyInProgress = tasks.some(task => ['Đang làm', 'Đã xong'].includes(task.status));
  if (anyInProgress) {
    console.log('[getSprintStatus] Kết quả: Đang chạy (có task đang làm/đã xong)');
    return 'Đang chạy';
  }
  // Ngược lại
  console.log('[getSprintStatus] Kết quả: Chưa bắt đầu (mặc định)');
  return 'Chưa bắt đầu';
}

// API để lấy thông tin project từ sprintId hoặc taskId
exports.getProjectInfo = async (req, res) => {
  try {
    const { type, refId } = req.query;
    
    if (!type || !refId) {
      return res.status(400).json({ message: 'Type và refId là bắt buộc' });
    }

    let projectId = null;
    let sprintId = null;

    if (type === 'sprint') {
      // Lấy projectId từ sprintId
      const sprint = await Sprint.findById(refId).select('project');
      if (!sprint) {
        return res.status(404).json({ message: 'Sprint không tồn tại' });
      }
      projectId = sprint.project;
      sprintId = refId;
    } else if (type === 'task') {
      // Lấy projectId và sprintId từ taskId
      const sprint = await Sprint.findOne({ 'tasks._id': refId }).select('project');
      if (!sprint) {
        return res.status(404).json({ message: 'Task không tồn tại' });
      }
      projectId = sprint.project;
      sprintId = sprint._id;
    } else if (type === 'project') {
      // Trực tiếp sử dụng refId làm projectId
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