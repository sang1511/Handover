const Sprint = require('../models/Sprint');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

exports.getSprintsByProjectId = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }
    const sprints = await Sprint.find({ project: projectId })
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
      createdBy: req.user.id,
      status: 'Chưa bắt đầu',
      acceptanceStatus: 'Chưa nghiệm thu'
    });

    await newSprint.save();

    // Add history entry for sprint creation
    newSprint.history.push({
      action: 'Tạo sprint mới',
      field: 'Thông tin chung',
      newValue: {
        name: newSprint.name,
        goal: newSprint.goal,
        startDate: newSprint.startDate,
        endDate: newSprint.endDate,
        gitBranch: newSprint.gitBranch,
        pullRequest: newSprint.pullRequest
      },
      updatedBy: req.user.id,
      updatedAt: new Date()
    });
    await newSprint.save(); // Save again to include history

    res.status(201).json(newSprint);
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

    const sprint = await Sprint.findById(sprintId);

    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' });
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

    res.status(200).json({ message: 'Deliverables uploaded successfully', sprint });
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

    const sprint = await Sprint.findById(sprintId);

    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' });
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
    const { taskId, name, request, assigner, assignee, reviewer, receiver, status, reviewResult } = req.body;

    if (!mongoose.Types.ObjectId.isValid(sprintId)) {
      return res.status(400).json({ message: 'Invalid sprint ID format' });
    }

    const sprint = await Sprint.findById(sprintId);

    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' });
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

    // Add history entry for task creation
    sprint.history.push({
      action: 'Tạo',
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
      },
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    await sprint.save();

    // Re-populate the sprint to include user names in the response for the newly added task
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
        select: 'name'
      })
      .populate({
        path: 'tasks.assignee',
        select: 'name'
      })
      .populate({
        path: 'tasks.reviewer',
        select: 'name'
      })
      .populate({
        path: 'tasks.receiver',
        select: 'name'
      })
      .populate({
        path: 'tasks.history.updatedBy',
        select: 'name'
      })
      .sort({ startDate: 1 }); // Sort to match frontend display order

    res.status(201).json(populatedSprint.tasks.slice(-1)[0]); // Return the newly added task, populated
  } catch (error) {
    console.error('Error adding task to sprint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    console.log('=== Bắt đầu xử lý cập nhật trạng thái task ===');
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    console.log('User info:', {
      id: req.user?._id,
      role: req.user?.role,
      name: req.user?.name
    });

    const { taskId } = req.params;
    const { status } = req.body;

    console.log('Dữ liệu nhận được:', {
      taskId,
      status,
      userId: req.user?._id
    });

    if (!taskId || !status) {
      console.log('Thiếu thông tin:', { taskId, status });
      return res.status(400).json({ message: 'Task ID và trạng thái là bắt buộc' });
    }

    // Validate status values
    const validStatuses = ['Chưa làm', 'Đang làm', 'Đã xong'];
    if (!validStatuses.includes(status)) {
      console.log('Trạng thái không hợp lệ:', status);
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    // Find the sprint containing the task
    console.log('Tìm sprint chứa task:', taskId);
    const sprint = await Sprint.findOne({ 'tasks._id': taskId });
    console.log('Kết quả tìm sprint:', {
      found: !!sprint,
      sprintId: sprint?._id,
      sprintName: sprint?.name,
      taskId
    });

    if (!sprint) {
      console.log('Không tìm thấy sprint chứa task');
      return res.status(404).json({ message: 'Không tìm thấy task' });
    }

    // Find the task
    console.log('Tìm task trong sprint');
    const task = sprint.tasks.id(taskId);
    console.log('Kết quả tìm task:', {
      found: !!task,
      taskId,
      taskName: task?.name,
      currentStatus: task?.status,
      assignee: task?.assignee?.toString(),
      userId: req.user?._id?.toString()
    });

    if (!task) {
      console.log('Không tìm thấy task trong sprint');
      return res.status(404).json({ message: 'Không tìm thấy task' });
    }

    // Check if user is the assignee
    if (task.assignee.toString() !== req.user._id.toString()) {
      console.log('Không có quyền cập nhật:', {
        taskAssignee: task.assignee.toString(),
        currentUser: req.user._id.toString()
      });
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật trạng thái task này' });
    }

    // Validate status transition
    const currentStatus = task.status;
    console.log('Kiểm tra chuyển trạng thái:', {
      currentStatus,
      newStatus: status,
      taskName: task.name
    });

    if (currentStatus === 'Chưa làm' && status !== 'Đang làm') {
      console.log('Lỗi chuyển trạng thái: Chưa làm -> không phải Đang làm');
      return res.status(400).json({ message: 'Chỉ có thể chuyển từ "Chưa làm" sang "Đang làm"' });
    }
    if (currentStatus === 'Đang làm' && status !== 'Đã xong') {
      console.log('Lỗi chuyển trạng thái: Đang làm -> không phải Đã xong');
      return res.status(400).json({ message: 'Chỉ có thể chuyển từ "Đang làm" sang "Đã xong"' });
    }
    if (currentStatus === 'Đã xong') {
      console.log('Lỗi chuyển trạng thái: Task đã hoàn thành');
      return res.status(400).json({ message: 'Không thể thay đổi trạng thái của task đã hoàn thành' });
    }

    // Update task status
    console.log('Bắt đầu cập nhật trạng thái');
    task.status = status;

    // Add history entry for status change
    task.history.push({
      action: 'Cập nhật trạng thái',
      field: 'Trạng thái',
      oldValue: currentStatus,
      newValue: status,
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    await sprint.save();
    console.log('Đã cập nhật trạng thái thành công:', {
      taskId,
      taskName: task.name,
      oldStatus: currentStatus,
      newStatus: status
    });

    // Populate the updated task data
    console.log('Đang populate dữ liệu task');
    await sprint.populate([
      { path: 'tasks.assigner', select: 'name userID phoneNumber role email companyName' },
      { path: 'tasks.assignee', select: 'name userID phoneNumber role email companyName' },
      { path: 'tasks.reviewer', select: 'name userID phoneNumber role email companyName' },
      { path: 'tasks.receiver', select: 'name userID phoneNumber role email companyName' }
    ]);
    console.log('Đã populate dữ liệu task thành công');

    console.log('=== Hoàn thành xử lý cập nhật trạng thái task ===');
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
    const { reviewResult } = req.body;

    if (!taskId || !reviewResult) {
      return res.status(400).json({ message: 'Task ID và kết quả review là bắt buộc' });
    }

    // Validate review result values
    const validResults = ['Chưa duyệt', 'Đạt', 'Không đạt'];
    if (!validResults.includes(reviewResult)) {
      return res.status(400).json({ message: 'Kết quả review không hợp lệ' });
    }

    // Find the sprint containing the task
    const sprint = await Sprint.findOne({ 'tasks._id': taskId });
    if (!sprint) {
      return res.status(404).json({ message: 'Không tìm thấy task' });
    }

    // Find the task
    const task = sprint.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Không tìm thấy task' });
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

    // Add history entry for review result change
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

    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint không tìm thấy' });
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

    // Populate the createdBy field for the new note before sending response
    // Find the newly added note by its _id after saving
    const populatedSprint = await Sprint.findById(sprintId).populate('notes.createdBy', 'name');
    const addedNote = populatedSprint.notes.find(note => note.content === newNote.content && note.createdBy._id.toString() === newNote.createdBy.toString());
    
    res.status(201).json(addedNote);

  } catch (error) {
    console.error('Error adding note to sprint:', error);
    res.status(500).json({ message: 'Lỗi server khi thêm ghi chú', error: error.message });
  }
}; 