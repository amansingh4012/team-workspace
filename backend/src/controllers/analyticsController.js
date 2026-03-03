const { fn, col, literal } = require('sequelize');
const { Task, User, ProjectMember } = require('../models');

/**
 * GET /api/projects/:id/analytics
 * Returns aggregated stats for a project's tasks.
 */
exports.getProjectAnalytics = async (req, res, next) => {
  try {
    const projectId = req.params.id;

    // Total counts by status
    const statusCounts = await Task.findAll({
      where: { projectId },
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    const statusMap = { todo: 0, inprogress: 0, done: 0 };
    statusCounts.forEach((r) => {
      statusMap[r.status] = parseInt(r.count, 10);
    });
    const totalTasks = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const completionPct = totalTasks === 0 ? 0 : Math.round((statusMap.done / totalTasks) * 100);

    // Counts by priority
    const priorityCounts = await Task.findAll({
      where: { projectId },
      attributes: ['priority', [fn('COUNT', col('id')), 'count']],
      group: ['priority'],
      raw: true,
    });
    const priorityMap = { low: 0, medium: 0, high: 0 };
    priorityCounts.forEach((r) => {
      priorityMap[r.priority] = parseInt(r.count, 10);
    });

    // Tasks per member (including unassigned)
    const memberCounts = await Task.findAll({
      where: { projectId },
      attributes: ['assigneeId', [fn('COUNT', col('Task.id')), 'count']],
      include: [{ association: 'assignee', attributes: ['id', 'name'] }],
      group: ['assigneeId', 'assignee.id', 'assignee.name'],
      raw: true,
      nest: true,
    });

    const tasksPerMember = memberCounts.map((r) => ({
      memberId: r.assigneeId,
      name: r.assignee?.name || 'Unassigned',
      count: parseInt(r.count, 10),
    }));

    res.json({
      success: true,
      analytics: {
        totalTasks,
        completionPct,
        statusMap,
        priorityMap,
        tasksPerMember,
      },
    });
  } catch (err) {
    next(err);
  }
};
