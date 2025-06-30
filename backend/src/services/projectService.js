const Project = require('../models/Project');
const Sprint = require('../models/Sprint');
const socketManager = require('../socket'); 

const updateProjectStatus = async (projectId) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return;
    }

    if (project.status === 'Hoàn thành') {
        return;
    }

    const sprints = await Sprint.find({ project: projectId });
    let newStatus = project.status;

    if (sprints.length === 0) {
      newStatus = 'Khởi tạo';
    } else {
      const allSprintsAccepted = sprints.every(s => s.acceptanceStatus === 'Đã nghiệm thu');
      if (allSprintsAccepted) {
        newStatus = 'Đã bàn giao';
      } else {
        const anySprintRunning = sprints.some(s => s.status === 'Đang chạy');
        if (anySprintRunning) {
          newStatus = 'Đang thực hiện';
        } else {
          newStatus = 'Khởi tạo';
        }
      }
    }
    
    if (project.status !== newStatus) {
      const oldStatus = project.status;
      project.status = newStatus;
       project.history.push({
        action: 'Cập nhật trạng thái dự án (tự động)',
        field: 'status',
        oldValue: oldStatus,
        newValue: newStatus,
        updatedAt: new Date()
      });
      await project.save();

      const populatedProject = await Project.findById(projectId)
        .populate('createdBy', 'name')
        .populate('handedOverTo', 'name')
        .populate({
            path: 'history.updatedBy',
            select: 'name'
        });

      // Broadcast the update to the project room
      socketManager.broadcastToProjectRoom(projectId.toString(), 'project_updated', {
        project: populatedProject
      });
    }
  } catch (error) {
    console.error(`Error updating project status for ${projectId}:`, error);
  }
};

module.exports = {
  updateProjectStatus,
}; 