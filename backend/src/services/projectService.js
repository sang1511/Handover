const Project = require('../models/Project');
const Sprint = require('../models/Sprint');
const socketManager = require('../socket'); // Import socketManager

const updateProjectStatus = async (projectId) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      console.error(`[updateProjectStatus] Project not found: ${projectId}`);
      return;
    }

    // Do not automatically change status if it's already "Hoàn thành"
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
        // If all sprints are accepted, the status should be "Đã bàn giao"
        // It will wait for manual confirmation to become "Hoàn thành"
        newStatus = 'Đã bàn giao';
      } else {
        const anySprintRunning = sprints.some(s => s.status === 'Đang chạy');
        if (anySprintRunning) {
          newStatus = 'Đang thực hiện';
        } else {
          // If no sprint is running, and not all are accepted, it's "Khởi tạo"
          // This handles the case where a running sprint is moved back to not running
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
      console.log(`[updateProjectStatus] Project ${projectId} status automatically updated to ${newStatus}`);

      // --- Real-time update ---
      const populatedProject = await Project.findById(projectId).populate('handedOverTo', 'name');
      const sprints = await Sprint.find({ project: projectId }).populate('members.user');
      const members = new Set();
      sprints.forEach(sprint => {
        sprint.members.forEach(member => {
            if(member.user) members.add(member.user._id.toString());
        })
      });

      // Also notify the project creator and handover person
      if(project.createdBy) members.add(project.createdBy.toString());
      if(project.handedOverTo?._id) members.add(project.handedOverTo._id.toString());

      members.forEach(userId => {
        socketManager.sendNotification(userId, {
            type: 'project_updated',
            payload: populatedProject
        });
      });
      // --- End real-time update ---
    }
  } catch (error) {
    console.error(`[updateProjectStatus] Error updating project status for ${projectId}:`, error);
  }
};

module.exports = {
  updateProjectStatus,
}; 