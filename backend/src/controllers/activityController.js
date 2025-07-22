const mongoose = require('mongoose');
const Project = require('../models/Project');
const Module = require('../models/Module');
const Release = require('../models/Release');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const User = require('../models/User');
const { createError } = require('../utils/error');

exports.getUserActivity = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const limit = parseInt(req.query.limit, 10) || 20;

    const models = [Project, Module, Release, Sprint, Task];
    let allActivities = [];

    for (const model of models) {
      const activities = await model.aggregate([
        { $unwind: '$history' },
        { $match: { 'history.fromUser': userId, 'history.isPrimary': true } },
        {
          $lookup: {
            from: 'users',
            localField: 'history.fromUser',
            foreignField: '_id',
            as: 'fromUserInfo'
          }
        },
        {
          $project: {
            _id: '$history._id',
            timestamp: '$history.timestamp',
            description: '$history.description',
            fromUser: { $arrayElemAt: ['$fromUserInfo', 0] },
            entityType: model.modelName,
            entityId: '$_id'
          }
        }
      ]);
      allActivities.push(...activities);
    }
    
    allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const recentActivities = allActivities.slice(0, limit).map(activity => ({
        _id: activity._id,
        timestamp: activity.timestamp,
        description: activity.description,
        fromUser: {
            _id: activity.fromUser?._id,
            name: activity.fromUser?.name || 'Người dùng không tồn tại'
        },
        entityType: activity.entityType,
        entityId: activity.entityId
    }));

    res.json(recentActivities);
  } catch (error) {
    console.error('Error fetching activity data:', error);
    next(createError(500, 'Lỗi khi lấy dữ liệu hoạt động.'));
  }
}; 