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

      // --- BROADCAST FOR REAL-TIME UPDATES ---

      // 1. For ProjectDetail page: Broadcast to the specific project room
      const populatedProjectForDetail = await Project.findById(projectId).populate('createdBy', 'name').populate('handedOverTo', 'name');
      socketManager.broadcastToProjectRoom(projectId.toString(), 'project_updated', {
        project: populatedProjectForDetail
      });

      // 2. For Projects list page: Send direct message to all involved users
      const memberIds = new Set();
      sprints.forEach(sprint => {
        sprint.members.forEach(member => {
            if(member.user) memberIds.add(member.user.toString());
        });
      });
      if(project.createdBy) memberIds.add(project.createdBy.toString());
      if(project.handedOverTo?._id) memberIds.add(project.handedOverTo._id.toString());
      
      const populatedProjectForList = await Project.findById(projectId).populate('createdBy', 'name email').populate('handedOverTo', 'name email');
      memberIds.forEach(userId => {
        socketManager.sendMessageToUser(userId, 'project_list_updated', { 
          project: populatedProjectForList
        });
      });

    }
  } catch (error) {
    console.error(`Error updating project status for ${projectId}:`, error);
  }
};

module.exports = {
  updateProjectStatus,
}; 