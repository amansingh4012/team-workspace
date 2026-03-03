const { Activity, User } = require('../models');

/**
 * GET /api/projects/:projectId/activities?page=&limit=
 * Paginated activity feed for a project.
 */
exports.getActivities = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;

    const { count, rows: activities } = await Activity.findAndCountAll({
      where: { projectId },
      include: [
        { association: 'user', attributes: ['id', 'name', 'avatar'] },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      success: true,
      activities,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};
