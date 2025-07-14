const Project = require('../models/Project');
const Module = require('../models/Module');
const socketManager = require('../socket');

// Cập nhật trạng thái project dựa vào trạng thái các module (chuẩn mô hình mới)
const updateProjectStatus = async (projectId) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) return;
    const modules = await Module.find({ project: project._id });
    let newStatus = project.status;
    if (project.status !== 'Chờ xác nhận') {
      if (modules.length === 0 || modules.every(m => m.status === 'Chưa phát triển')) {
        newStatus = 'Khởi tạo';
      } else if (modules.some(m => m.status === 'Đang phát triển')) {
        newStatus = 'Đang triển khai';
      } else if (modules.length > 0 && modules.every(m => m.status === 'Hoàn thành')) {
        newStatus = 'Hoàn thành';
      }
    }
    if (project.status !== newStatus) {
      const oldStatus = project.status;
      project.status = newStatus;
      project.history.push({
        action: 'Cập nhật trạng thái dự án (tự động)',
        oldValue: oldStatus,
        newValue: newStatus,
        timestamp: new Date(),
        comment: 'Tự động cập nhật trạng thái dự án theo module'
      });
      await project.save();
      // Broadcast cập nhật trạng thái project nếu cần
      socketManager.broadcastToProjectRoom(projectId.toString(), 'project_updated', {
        project
      });
    }
  } catch (error) {
    console.error(`Error updating project status for ${projectId}:`, error);
  }
};

module.exports = {
  updateProjectStatus,
}; 