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

      const populatedProject = await Project.findById(projectId).populate('handedOverTo', 'name');
      const sprints = await Sprint.find({ project: projectId }).populate('members.user');
      const members = new Set();
      sprints.forEach(sprint => {
        sprint.members.forEach(member => {
            if(member.user) members.add(member.user._id.toString());
        })
      });

      if(project.createdBy) members.add(project.createdBy.toString());
      if(project.handedOverTo?._id) members.add(project.handedOverTo._id.toString());

      members.forEach(userId => {
        socketManager.sendNotification(userId, {
            type: 'project_updated',
            payload: populatedProject
        });
      });
    }
  } catch (error) {
  }
};

module.exports = {
  updateProjectStatus,
}; 