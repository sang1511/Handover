const mongoose = require('mongoose');
const Project = require('../models/Project');
const Module = require('../models/Module');
const Release = require('../models/Release');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const User = require('../models/User');
const { createError } = require('../utils/error');

// @desc    Lấy hoạt động gần đây của người dùng
// @route   GET /api/activities
// @access  Private
exports.getUserActivity = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const limit = parseInt(req.query.limit, 10) || 20;

    let allActivities = [];

    // --- Projects ---
    const projectActivities = await Project.aggregate([
      { $unwind: '$history' },
      { $match: { 'history.fromUser': userId } },
      {
        $project: {
          _id: '$history._id',
          timestamp: '$history.timestamp',
          action: '$history.action',
          fromUser: '$history.fromUser',
          entityType: 'Project',
          entityId: '$_id',
          entityName: '$name',
          comment: '$history.comment',
          ref: { module: '$history.module', release: '$history.release', sprint: '$history.sprint', task: '$history.task' }
        }
      }
    ]);
    allActivities.push(...projectActivities);

    // --- Modules ---
    const moduleActivities = await Module.aggregate([
      { $unwind: '$history' },
      { $match: { 'history.fromUser': userId } },
      {
        $lookup: {
          from: 'projects',
          localField: 'project',
          foreignField: '_id',
          as: 'projectInfo'
        }
      },
      {
        $project: {
          _id: '$history._id',
          timestamp: '$history.timestamp',
          action: '$history.action',
          fromUser: '$history.fromUser',
          entityType: 'Module',
          entityId: '$_id',
          entityName: '$name',
          comment: '$history.comment',
          project: { $arrayElemAt: ['$projectInfo', 0] },
          ref: { release: '$history.release' }
        }
      }
    ]);
    allActivities.push(...moduleActivities);

    // --- Releases ---
    const releaseActivities = await Release.aggregate([
      { $unwind: '$history' },
      { $match: { 'history.fromUser': userId } },
      {
        $project: {
          _id: '$history._id',
          timestamp: '$history.timestamp',
          action: '$history.action',
          fromUser: '$history.fromUser',
          entityType: 'Release',
          entityId: '$_id',
          entityName: '$version',
          comment: '$history.comment',
          ref: { sprint: '$history.sprint' }
        }
      }
    ]);
    allActivities.push(...releaseActivities);

    // --- Sprints ---
    const sprintActivities = await Sprint.aggregate([
      { $unwind: '$history' },
      { $match: { 'history.fromUser': userId, 'history.action': { $ne: 'cập nhật trạng thái' } } },
      {
        $project: {
          _id: '$history._id',
          timestamp: '$history.timestamp',
          action: '$history.action',
          fromUser: '$history.fromUser',
          entityType: 'Sprint',
          entityId: '$_id',
          entityName: '$name',
          comment: '$history.comment',
          ref: { task: '$history.task' }
        }
      }
    ]);
    allActivities.push(...sprintActivities);

    // --- Tasks ---
    const taskActivities = await Task.aggregate([
      { $unwind: '$history' },
      { $match: { 'history.fromUser': userId } },
      {
        $project: {
          _id: '$history._id',
          timestamp: '$history.timestamp',
          action: '$history.action',
          fromUser: '$history.fromUser',
          entityType: 'Task',
          entityId: '$_id',
          entityName: '$name',
          comment: '$history.comment'
        }
      }
    ]);
    allActivities.push(...taskActivities);

    // Populate and format descriptions
    const populatedActivities = await Promise.all(
      allActivities.map(async (activity) => {
        const user = await User.findById(activity.fromUser).select('name').lean();
        let description = '';

        if (activity.comment) {
          description = `${activity.action} ${activity.comment.replace(/"/g, '')}`;
        } else {
          description = `${activity.action} ${activity.entityType.toLowerCase()} "${activity.entityName}"`;
        }
        
        // Handle specific cases for more detailed descriptions
        if (activity.action === 'tạo module' && activity.entityType === 'Project') {
          description = `tạo module ${activity.comment.replace(/"/g, '')} của dự án "${activity.entityName}"`;
        } else if (activity.action === 'xóa module' && activity.entityType === 'Project') {
          description = `xóa module ${activity.comment.replace(/"/g, '')} khỏi dự án "${activity.entityName}"`;
        } else if (activity.action === 'tạo release' && activity.entityType === 'Module') {
          const projectName = activity.project?.name || '';
          description = `tạo release ${activity.comment.replace(/"/g, '')} thuộc module "${activity.entityName}" của dự án "${projectName}"`;
        } else if (activity.action === 'tạo sprint' && activity.entityType === 'Release') {
          description = `tạo sprint ${activity.comment.replace(/"/g, '')} cho release "${activity.entityName}"`;
        } else if (activity.action.includes('task') && activity.entityType === 'Sprint') {
          description = `${activity.action} ${activity.comment.replace(/"/g, '')} trong sprint "${activity.entityName}"`;
        }

        return {
          ...activity,
          fromUser: user,
          description,
        };
      })
    );

    // Sort all activities by timestamp descending
    populatedActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit the number of results
    const recentActivities = populatedActivities.slice(0, limit);

    res.json(recentActivities);
  } catch (error) {
    console.error('Error fetching activity data:', error);
    next(createError(500, 'Lỗi khi lấy dữ liệu hoạt động.'));
  }
}; 