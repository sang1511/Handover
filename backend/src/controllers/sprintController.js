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
const { uploadFile, deleteFile, createDownloadStream } = require('../utils/gridfs');
const socketManager = require('../socket');

// --- Refactoring Helpers ---

const sprintPopulationOptions = [
  { path: 'deliverables.uploadedBy', select: 'name email' },
  { path: 'notes.createdBy', select: 'name' },
  { path: 'history.updatedBy', select: 'name' },
  { path: 'tasks.assigner', select: 'name userID phoneNumber role email companyName' },
  { path: 'tasks.assignee', select: 'name userID phoneNumber role email companyName' },
  { path: 'tasks.reviewer', select: 'name userID phoneNumber role email companyName' },
  { path: 'tasks.receiver', select: 'name userID phoneNumber role email companyName' },
  { path: 'tasks.history.updatedBy', select: 'name' },
  { path: 'members.user', select: 'name userID phoneNumber role email companyName' },
];

const taskAndHistoryPopulationOptions = [
  { path: 'tasks.assigner', select: 'name userID' },
  { path: 'tasks.assignee', select: 'name userID' },
  { path: 'tasks.reviewer', select: 'name userID' },
  { path: 'tasks.receiver', select: 'name userID' },
  { path: 'history.updatedBy', select: 'name' },
];

const taskMemberFullPopulationOptions = [
  { path: 'tasks.assigner', select: 'name userID phoneNumber role email companyName' },
  { path: 'tasks.assignee', select: 'name userID phoneNumber role email companyName' },
  { path: 'tasks.reviewer', select: 'name userID phoneNumber role email companyName' },
  { path: 'tasks.receiver', select: 'name userID phoneNumber role email companyName' },
];

const userFieldsForTask = ['assigner', 'assignee', 'reviewer', 'receiver'];

/**
 * Resolves userIDs from a source object to MongoDB _ids in a target object.
 * @returns {Object|null} An error object if a user is not found, otherwise null.
 */
async function resolveUserFields(targetObject, sourceObject) {
  for (const field of userFieldsForTask) {
    if (sourceObject[field]) {
      try {
        const user = await User.findOne({ userID: sourceObject[field] });
        if (!user) {
          return {
            status: 400,
            json: { message: `User with UserID ${sourceObject[field]} not found for ${field}` }
          };
        }
        targetObject[field] = user._id;
      } catch (error) {
        console.error(`Error finding user for ${field}:`, error);
        return {
          status: 400,
          json: { message: `Error processing ${field}`, error: error.message }
        };
      }
    }
  }
  return null; // Success
}

/**
 * Updates a sprint's member list based on new tasks.
 * @returns {Array<string>} An array of newly added member IDs.
 */
function updateSprintMembersFromTasks(sprint, tasks) {
    const memberIds = new Set(sprint.members.map(m => m.user.toString()));
    const newMemberIds = [];

    const tasksArray = Array.isArray(tasks) ? tasks : [tasks];

    tasksArray.forEach(task => {
        userFieldsForTask.forEach(field => {
            if (task[field]) {
                const userIdStr = task[field].toString();
                if (!memberIds.has(userIdStr)) {
                    memberIds.add(userIdStr);
                    newMemberIds.push(userIdStr);
                }
            }
        });
    });

    sprint.members = Array.from(memberIds).map(id => ({ user: id }));
    return newMemberIds;
}

// --- End Refactoring Helpers ---

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
      .populate(sprintPopulationOptions)
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

          const error = await resolveUserFields(task, task);
          if (error) {
            return res.status(error.status).json(error.json);
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
        userFieldsForTask.forEach(field => {
            if (task[field]) memberIds.add(task[field].toString());
        });
      });
    }

    const deliverables = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const uploadResult = await uploadFile(file, {
            uploadedBy: req.user._id,
            projectId: projectId
          });
          
          deliverables.push({
            fileId: uploadResult.fileId,
            fileName: file.originalname,
            fileSize: file.size,
            contentType: file.mimetype,
            uploadedBy: req.user._id,
            uploadedAt: new Date()
          });
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          return res.status(500).json({ message: 'Lỗi khi tải lên file' });
        }
      }
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
      ...(deliverables.length > 0 && { deliverables }),
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
      const notif = await Notification.create({
        user: member.user,
        type: 'sprint',
        refId: newSprint._id,
        message: `${creatorName} đã thêm bạn vào sprint "${newSprint.name}".`
      });
      socketManager.sendNotification(member.user, notif);
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
          const notif = await Notification.create({
            user: userId,
            type: 'task',
            refId: task._id,
            message: `Bạn vừa được ${label} task "${task.name}" trong sprint "${newSprint.name}".`
          });
          socketManager.sendNotification(userId, notif);
        }
      }
    }
    // --- END NOTIFICATION ---

    const populatedSprint = await Sprint.findById(newSprint._id)
      .populate(sprintPopulationOptions);

    newSprint.status = getSprintStatus(newSprint.tasks);
    await newSprint.save();

    await updateProjectStatus(newSprint.project);

    // Broadcast sprint creation to project room
    socketManager.broadcastToProjectRoom(newSprint.project.toString(), 'sprintCreated', { newSprint: populatedSprint });

    res.status(201).json(populatedSprint);
  } catch (error) {
    console.error('Error creating sprint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.uploadSprintDeliverable = async (req, res) => {
  try {
    const { sprintId } = req.params;
    const { user } = req;

    if (user.role !== 'admin' && user.role !== 'pm') {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' });
    }

    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return res.status(400).json({ message: 'Sprint ID không hợp lệ.' });
    }

    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint không tìm thấy.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Không có tệp nào được tải lên.' });
    }

    const uploadedFiles = [];
    for (const file of req.files) {
      const fileId = new mongoose.Types.ObjectId();
      const deliverable = {
        fileId: fileId,
        fileName: file.originalname,
        fileSize: file.size,
        uploadedBy: user._id,
        uploadedAt: new Date()
      };

      sprint.deliverables.push(deliverable);
      uploadedFiles.push(deliverable);

      sprint.history.push({
        action: 'Tải lên tài liệu',
        field: 'Tài liệu chung',
        newValue: { fileName: file.originalname },
        updatedBy: user._id,
        updatedAt: new Date()
      });
    }

    await sprint.save();

    const populatedSprint = await Sprint.findById(sprintId)
      .populate(sprintPopulationOptions)
      .populate({
        path: 'history.updatedBy',
        select: 'name'
      });

    // Broadcast deliverable uploaded to project room
    socketManager.broadcastToProjectRoom(sprint.project.toString(), 'deliverableUploaded', {
      sprintId: sprint._id,
      newDeliverables: uploadedFiles,
      updatedHistory: populatedSprint.history[populatedSprint.history.length - 1]
    });

    res.status(201).json({ 
      message: 'Tài liệu đã được tải lên thành công.', 
      sprint: populatedSprint 
    });

  } catch (error) {
    console.error('Error uploading sprint deliverable:', error);
    res.status(500).json({ message: 'Lỗi server khi tải lên tài liệu.', error: error.message });
  }
};

exports.downloadSprintDeliverable = async (req, res) => {
  try {
    const { sprintId, fileId } = req.params;

    if (!sprintId || !fileId) {
      return res.status(400).json({ message: 'Sprint ID and File ID are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ message: 'Invalid file ID format' });
    }

    const query = { _id: sprintId };
    if (req.user.role !== 'Admin') {
      query['members.user'] = req.user._id;
    }
    const sprint = await Sprint.findOne(query);

    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found or not authorized' });
    }

    const deliverable = sprint.deliverables.find(d => d.fileId && d.fileId.toString() === fileId);

    if (!deliverable) {
      return res.status(404).json({ message: 'Deliverable not found in this sprint' });
    }

    try {
      const downloadStream = createDownloadStream(fileId);
      
      // Set headers for file download
      res.setHeader('Content-Type', deliverable.contentType || 'application/octet-stream');
      
      // Encode filename to handle special characters
      const encodedFileName = encodeURIComponent(deliverable.fileName).replace(/['()]/g, escape);
      res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`);
      
      // Pipe the stream to response
      downloadStream.pipe(res);
      
      downloadStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error streaming file' });
        }
      });
    } catch (streamError) {
      console.error('Error creating download stream:', streamError);
      res.status(500).json({ message: 'Error downloading file' });
    }
  } catch (error) {
    console.error('Error downloading sprint deliverable:', error);
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
        const notif = await Notification.create({
          user: task.reviewer,
          type: 'sprint',
          refId: sprint._id,
          message: `${assigneeName} đã hoàn thành task "${task.name}". Vui lòng kiểm tra và review.`
        });
        socketManager.sendNotification(task.reviewer, notif);
      }
      if (task.receiver && task.receiver.toString() !== task.assignee.toString()) {
        const notif = await Notification.create({
          user: task.receiver,
          type: 'sprint',
          refId: sprint._id,
          message: `Task "${task.name}" đã được hoàn thành.`
        });
        socketManager.sendNotification(task.receiver, notif);
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

    updateSprintMembersFromTasks(sprint, task);

    await sprint.save();

    await sprint.populate(taskMemberFullPopulationOptions);
    const populatedTask = sprint.tasks.id(taskId);

    sprint.status = getSprintStatus(sprint.tasks);
    await sprint.save();
    
    await updateProjectStatus(sprint.project);

    socketManager.broadcastToProjectRoom(sprint.project.toString(), 'taskUpdated', { sprintId: sprint._id, updatedTask: populatedTask });

    res.status(200).json(populatedTask);
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
        const notif = await Notification.create({
          user: task.assignee,
          type: 'sprint',
          refId: sprint._id,
          message
        });
        socketManager.sendNotification(task.assignee, notif);
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

    updateSprintMembersFromTasks(sprint, task);

    await sprint.save();

    await sprint.populate(taskMemberFullPopulationOptions);

    const populatedTask = sprint.tasks.id(taskId);

    sprint.status = getSprintStatus(sprint.tasks);
    await sprint.save();

    await updateProjectStatus(sprint.project);

    socketManager.broadcastToProjectRoom(sprint.project.toString(), 'taskUpdated', { sprintId: sprint._id, updatedTask: populatedTask });

    res.status(200).json(populatedTask);
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
      .populate(sprintPopulationOptions);
    
    // Broadcast note added to project room
    socketManager.broadcastToProjectRoom(sprint.project.toString(), 'noteAdded', {
      sprintId: sprint._id,
      newNote: populatedSprint.notes[populatedSprint.notes.length - 1],
      updatedHistory: populatedSprint.history[populatedSprint.history.length - 1]
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

    // Try to find deliverable by fileId (GridFS style)
    const deliverableByFileId = sprint.deliverables.find(d => d.fileId && d.fileId.toString() === fileId);
    if (deliverableByFileId) {
      // Remove from array
      sprint.deliverables = sprint.deliverables.filter(d => !(d.fileId && d.fileId.toString() === fileId));
      sprint.history.push({
        action: 'Xóa tài liệu',
        field: 'Tài liệu chung',
        newValue: { fileName: deliverableByFileId.fileName },
        updatedBy: user._id,
        updatedAt: new Date()
      });
      await sprint.save();
      const populatedSprint = await sprint.populate({ path: 'history.updatedBy', select: 'name' });
      
      // Broadcast deliverable deleted to project room
      socketManager.broadcastToProjectRoom(sprint.project.toString(), 'deliverableDeleted', {
        sprintId: sprint._id,
        deletedFileId: fileId,
        deletedFileName: deliverableByFileId.fileName,
        updatedHistory: populatedSprint.history[populatedSprint.history.length - 1]
      });
      
      return res.status(200).json({ message: 'Tài liệu đã được xóa thành công.', sprint: populatedSprint });
    }

    // Try to find deliverable by _id (subdoc style, fallback for legacy data)
    const deliverableById = sprint.deliverables.id(fileId);
    if (deliverableById) {
      sprint.deliverables.pull(fileId);
      sprint.history.push({
        action: 'Xóa tài liệu',
        field: 'Tài liệu chung',
        newValue: { fileName: deliverableById.fileName },
        updatedBy: user._id,
        updatedAt: new Date()
      });
      await sprint.save();
      const populatedSprint = await sprint.populate({ path: 'history.updatedBy', select: 'name' });
      
      // Broadcast deliverable deleted to project room
      socketManager.broadcastToProjectRoom(sprint.project.toString(), 'deliverableDeleted', {
        sprintId: sprint._id,
        deletedFileId: fileId,
        deletedFileName: deliverableById.fileName,
        updatedHistory: populatedSprint.history[populatedSprint.history.length - 1]
      });
      
      return res.status(200).json({ message: 'Tài liệu đã được xóa thành công.', sprint: populatedSprint });
    }

    return res.status(404).json({ message: 'Tài liệu không tồn tại trong sprint này.' });
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
      
      // --- NOTIFICATION ---
      const populatedSprint = await Sprint.findById(sprintId).populate('members.user', '_id');
      const project = await Project.findById(sprint.project).select('createdBy');

      const updater = await User.findById(user._id);
      const updaterName = updater ? updater.name : 'Một người dùng';
      const notifMessage = `${updaterName} đã cập nhật trạng thái nghiệm thu của sprint "${sprint.name}" thành "${acceptanceStatus}".`;
      
      const recipientIds = new Set();
      // Add all sprint members
      if (populatedSprint && populatedSprint.members) {
        populatedSprint.members.forEach(member => {
          if (member.user?._id) {
            recipientIds.add(member.user._id.toString());
          }
        });
      }
      // Add the project creator
      if (project && project.createdBy) {
        recipientIds.add(project.createdBy.toString());
      }
      
      // Remove the user who initiated the action
      recipientIds.delete(user._id.toString());

      // Send notifications to all unique recipients
      for (const recipientId of recipientIds) {
        const notif = await Notification.create({
          user: recipientId,
          type: 'sprint',
          refId: sprint._id,
          message: notifMessage
        });
        socketManager.sendNotification(recipientId, notif);
      }
      // --- END NOTIFICATION ---

      // Broadcast acceptance status update to project room
      socketManager.broadcastToProjectRoom(sprint.project.toString(), 'acceptanceStatusUpdated', {
        sprintId: sprint._id,
        newStatus: acceptanceStatus,
        updatedHistory: sprint.history[sprint.history.length - 1]
      });
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

// Thêm nhiều task vào sprint trong 1 lần gọi
exports.addTasksBulkToSprint = async (req, res) => {
  try {
    const { sprintId } = req.params;
    const { tasks } = req.body; // tasks: array
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ message: 'tasks phải là một mảng và không được rỗng' });
    }
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint không tồn tại' });
    }
    // Xử lý từng task
    const addedTasks = [];
    for (const task of tasks) {
      if (!task.taskId || !task.name || !task.request) {
        return res.status(400).json({ message: 'Mỗi task phải có taskId, name, request' });
      }
      const newTask = {
        taskId: task.taskId,
        name: task.name,
        request: task.request,
        status: task.status || 'Chưa làm',
        reviewResult: task.reviewResult || 'Chưa duyệt',
        reviewNote: task.reviewNote || '',
      };
      
      const userResolveError = await resolveUserFields(newTask, task);
      if (userResolveError) {
        return res.status(userResolveError.status).json(userResolveError.json);
      }
      
      sprint.tasks.push(newTask);
      addedTasks.push(sprint.tasks[sprint.tasks.length - 1]);
      // History cho từng task
      sprint.history.push({
        action: 'Tạo task',
        field: `Task: ${newTask.name}`,
        newValue: newTask,
        updatedBy: req.user._id,
        updatedAt: new Date()
      });
    }
    // Cập nhật members
    updateSprintMembersFromTasks(sprint, addedTasks);

    await sprint.save();
    // Notification cho từng task
    for (const task of addedTasks) {
      const roles = [
        { field: 'assignee', label: 'được giao thực hiện' },
        { field: 'assigner', label: 'được phân công giao tài nguyên cho' },
        { field: 'reviewer', label: 'được chỉ định review' },
        { field: 'receiver', label: 'được chỉ định nhận kết quả' }
      ];
      for (const { field, label } of roles) {
        const userId = task[field];
        if (userId) {
          const notif = await Notification.create({
            user: userId,
            type: 'task',
            refId: task._id,
            message: `Bạn vừa ${label} task "${task.name}" trong sprint "${sprint.name}".`
          });
          socketManager.sendNotification(userId, notif);
        }
      }
    }
    // Populate lại tasks trả về
    const populatedSprint = await Sprint.findById(sprint._id)
      .populate(taskAndHistoryPopulationOptions);
    
    // Broadcast bulk task addition to project room
    socketManager.broadcastToProjectRoom(sprint.project.toString(), 'tasksBulkAdded', { 
      sprintId: sprint._id, 
      newTasks: populatedSprint.tasks.slice(-addedTasks.length),
      updatedMembers: populatedSprint.members,
      updatedHistory: populatedSprint.history.slice(-addedTasks.length)
    });
    
    res.status(201).json(populatedSprint.tasks.slice(-addedTasks.length));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 