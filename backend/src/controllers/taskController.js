const { Op } = require('sequelize');
const { Task, Activity, User, Project, ProjectMember } = require('../models');
const { broadcast } = require('../utils/websocket');

/**
 * Check whether the requesting user is an admin (or owner) of the project.
 */
async function isProjectAdmin(userId, projectId) {
  const membership = await ProjectMember.findOne({
    where: { projectId, userId, role: 'admin' },
  });
  return !!membership;
}

/**
 * GET /api/tasks/mine
 * Return every task assigned to the authenticated user, across all projects.
 */
exports.getMyTasks = async (req, res, next) => {
  try {
    const tasks = await Task.findAll({
      where: { assigneeId: req.user.id },
      include: [
        { association: 'project', attributes: ['id', 'title'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/projects/:projectId/tasks
 * Create a task in a project and log Activity "created task <title>".
 */
exports.createTask = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, description, status, priority, assigneeId, attachmentUrl, dueDate, order } = req.body;

    // Only admins/owners can assign tasks to members
    let finalAssigneeId = undefined;
    if (assigneeId) {
      const admin = await isProjectAdmin(req.user.id, projectId);
      if (!admin) {
        return res.status(403).json({ success: false, message: 'Only project admins can assign tasks' });
      }
      finalAssigneeId = assigneeId;
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      projectId,
      assigneeId: finalAssigneeId,
      attachmentUrl,
      dueDate,
      order: order ?? 0,
    });

    // Re-fetch with assignee included so broadcast has full data
    const fullTask = await Task.findByPk(task.id, {
      include: [{ association: 'assignee', attributes: ['id', 'name', 'avatar'] }],
    });

    // Log activity
    const activity = await Activity.create({
      projectId,
      userId: req.user.id,
      action: `created task "${task.title}"`,
      entityType: 'task',
      entityId: task.id,
    });

    const actorInfo = { id: req.user.id, name: req.user.name, avatar: req.user.avatar };

    // Broadcast to project room
    broadcast(projectId, { type: 'TASK_UPDATE', payload: { action: 'created', task: fullTask, userId: req.user.id, userName: req.user.name } });
    broadcast(projectId, { type: 'ACTIVITY', payload: { ...activity.toJSON(), user: actorInfo } });

    res.status(201).json({ success: true, task: fullTask });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/projects/:projectId/tasks?status=&priority=&assigneeId=&search=
 * Get all tasks for a project with optional query filters.
 */
exports.getTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, priority, assigneeId, search } = req.query;

    const where = { projectId };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (search) where.title = { [Op.iLike]: `%${search}%` };

    const tasks = await Task.findAll({
      where,
      include: [
        { association: 'assignee', attributes: ['id', 'name', 'avatar'] },
      ],
      order: [['order', 'ASC'], ['createdAt', 'DESC']],
    });

    res.json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/projects/:projectId/tasks/:taskId
 * Get a single task.
 */
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      where: { id: req.params.taskId, projectId: req.params.projectId },
      include: [
        { association: 'assignee', attributes: ['id', 'name', 'avatar'] },
      ],
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/projects/:projectId/tasks/:taskId
 * Update task fields. Log activity when status or assignee changes.
 */
exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      where: { id: req.params.taskId, projectId: req.params.projectId },
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Only admins/owners can change the assignee
    if (req.body.assigneeId !== undefined && req.body.assigneeId !== task.assigneeId) {
      const admin = await isProjectAdmin(req.user.id, req.params.projectId);
      if (!admin) {
        return res.status(403).json({ success: false, message: 'Only project admins can assign tasks' });
      }
    }

    const oldStatus = task.status;
    const oldAssigneeId = task.assigneeId;

    await task.update(req.body);

    const actorInfo = { id: req.user.id, name: req.user.name, avatar: req.user.avatar };

    // Log status change
    if (req.body.status && req.body.status !== oldStatus) {
      const act = await Activity.create({
        projectId: req.params.projectId,
        userId: req.user.id,
        action: `moved task "${task.title}" from ${oldStatus} to ${req.body.status}`,
        entityType: 'task',
        entityId: task.id,
      });
      broadcast(req.params.projectId, { type: 'ACTIVITY', payload: { ...act.toJSON(), user: actorInfo } });
    }

    // Log assignee change
    if (req.body.assigneeId !== undefined && req.body.assigneeId !== oldAssigneeId) {
      let act;
      if (req.body.assigneeId) {
        const assignee = await User.findByPk(req.body.assigneeId, {
          attributes: ['id', 'name'],
        });
        act = await Activity.create({
          projectId: req.params.projectId,
          userId: req.user.id,
          action: `assigned task "${task.title}" to ${assignee ? assignee.name : 'unknown'}`,
          entityType: 'task',
          entityId: task.id,
        });
      } else {
        act = await Activity.create({
          projectId: req.params.projectId,
          userId: req.user.id,
          action: `unassigned task "${task.title}"`,
          entityType: 'task',
          entityId: task.id,
        });
      }
      broadcast(req.params.projectId, { type: 'ACTIVITY', payload: { ...act.toJSON(), user: actorInfo } });
    }

    // Re-fetch with assignee so broadcast has full data
    const fullTask = await Task.findByPk(task.id, {
      include: [{ association: 'assignee', attributes: ['id', 'name', 'avatar'] }],
    });

    // Broadcast task update
    broadcast(req.params.projectId, { type: 'TASK_UPDATE', payload: { action: 'updated', task: fullTask, userId: req.user.id, userName: req.user.name } });

    res.json({ success: true, task: fullTask });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/projects/:projectId/tasks/:taskId
 * Delete a task and log Activity.
 */
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      where: { id: req.params.taskId, projectId: req.params.projectId },
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const title = task.title;
    const taskId = task.id;
    await task.destroy();

    const activity = await Activity.create({
      projectId: req.params.projectId,
      userId: req.user.id,
      action: `deleted task "${title}"`,
      entityType: 'task',
      entityId: taskId,
    });

    const actorInfo = { id: req.user.id, name: req.user.name, avatar: req.user.avatar };

    // Broadcast
    broadcast(req.params.projectId, { type: 'TASK_UPDATE', payload: { action: 'deleted', taskId, taskTitle: title, userId: req.user.id, userName: req.user.name } });
    broadcast(req.params.projectId, { type: 'ACTIVITY', payload: { ...activity.toJSON(), user: actorInfo } });

    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/projects/:projectId/tasks/reorder
 * Accepts an array of { id, order, status } to bulk-update after drag-drop.
 */
exports.updateTaskOrder = async (req, res, next) => {
  try {
    const { tasks } = req.body; // [{ id, order, status }]

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ success: false, message: 'tasks array is required' });
    }

    const promises = tasks.map((t) =>
      Task.update(
        { order: t.order, ...(t.status ? { status: t.status } : {}) },
        { where: { id: t.id, projectId: req.params.projectId } }
      )
    );

    await Promise.all(promises);

    // Broadcast reorder event
    broadcast(req.params.projectId, { type: 'TASK_UPDATE', payload: { action: 'reordered', userId: req.user.id, userName: req.user.name } });

    res.json({ success: true, message: 'Task order updated' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/projects/:projectId/tasks/:taskId/attachment
 * Upload a file and set task.attachmentUrl.
 */
exports.uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const task = await Task.findOne({
      where: { id: req.params.taskId, projectId: req.params.projectId },
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const attachmentUrl = `/uploads/${req.file.filename}`;
    await task.update({ attachmentUrl });

    const activity = await Activity.create({
      projectId: req.params.projectId,
      userId: req.user.id,
      action: `attached file to task "${task.title}"`,
      entityType: 'task',
      entityId: task.id,
    });

    const actorInfo = { id: req.user.id, name: req.user.name, avatar: req.user.avatar };

    broadcast(req.params.projectId, { type: 'TASK_UPDATE', payload: { action: 'updated', task, userId: req.user.id, userName: req.user.name } });
    broadcast(req.params.projectId, { type: 'ACTIVITY', payload: { ...activity.toJSON(), user: actorInfo } });

    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
};
