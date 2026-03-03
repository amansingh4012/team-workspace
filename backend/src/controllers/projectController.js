const { Op } = require('sequelize');
const { Project, ProjectMember, User, Task } = require('../models');
const { broadcast } = require('../utils/websocket');

/**
 * POST /api/projects
 * Create a project and add the creator as 'admin' in ProjectMember.
 */
exports.createProject = async (req, res, next) => {
  try {
    const { title, description } = req.body;

    const project = await Project.create({
      title,
      description,
      ownerId: req.user.id,
    });

    // Add creator as admin member
    await ProjectMember.create({
      projectId: project.id,
      userId: req.user.id,
      role: 'admin',
    });

    res.status(201).json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/projects?page=1&limit=10
 * List all projects where req.user is a member (with pagination).
 */
exports.getProjects = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const offset = (page - 1) * limit;

    // Find project IDs the user belongs to
    const memberRows = await ProjectMember.findAll({
      where: { userId: req.user.id },
      attributes: ['projectId'],
      raw: true,
    });
    const projectIds = memberRows.map((r) => r.projectId);

    const { count, rows: projects } = await Project.findAndCountAll({
      where: { id: { [Op.in]: projectIds } },
      include: [
        { association: 'owner', attributes: ['id', 'name', 'email', 'avatar'] },
        { association: 'members', attributes: ['id', 'name', 'avatar'], through: { attributes: ['role'] } },
        { association: 'tasks', attributes: ['id', 'status'] },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    res.json({
      success: true,
      projects,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/projects/:id
 * Get a single project with its members list.
 */
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        { association: 'owner', attributes: ['id', 'name', 'email', 'avatar'] },
        {
          association: 'members',
          attributes: ['id', 'name', 'email', 'avatar'],
          through: { attributes: ['role'] },
        },
      ],
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/projects/:id
 * Only a project admin can update.
 */
exports.updateProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Check requester is an admin of this project
    const membership = await ProjectMember.findOne({
      where: { projectId: project.id, userId: req.user.id, role: 'admin' },
    });
    if (!membership) {
      return res.status(403).json({ success: false, message: 'Only project admins can update' });
    }

    const { title, description } = req.body;
    await project.update({ title, description });

    // Broadcast project update to all members in the room
    broadcast(project.id, {
      type: 'PROJECT_UPDATE',
      payload: { project: { id: project.id, title: project.title, description: project.description }, userId: req.user.id, userName: req.user.name },
    });

    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/projects/:id
 * Only a project admin can delete.
 */
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const membership = await ProjectMember.findOne({
      where: { projectId: project.id, userId: req.user.id, role: 'admin' },
    });
    if (!membership) {
      return res.status(403).json({ success: false, message: 'Only project admins can delete' });
    }

    // Broadcast BEFORE destroying so clients still receive the event
    broadcast(project.id, {
      type: 'PROJECT_DELETE',
      payload: { projectId: project.id, userId: req.user.id, userName: req.user.name },
    });

    await project.destroy();

    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/projects/:id/members
 * Add a user to a project by email. Role defaults to 'member'.
 */
exports.addMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Only admins can add members
    const adminCheck = await ProjectMember.findOne({
      where: { projectId: project.id, userId: req.user.id, role: 'admin' },
    });
    if (!adminCheck) {
      return res.status(403).json({ success: false, message: 'Only project admins can add members' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with that email' });
    }

    // Check if already a member
    const existing = await ProjectMember.findOne({
      where: { projectId: project.id, userId: user.id },
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User is already a member' });
    }

    const membership = await ProjectMember.create({
      projectId: project.id,
      userId: user.id,
      role: role || 'member',
    });

    const memberData = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: membership.role,
    };

    // Broadcast member added to all users in the project room
    broadcast(project.id, {
      type: 'MEMBER_UPDATE',
      payload: { action: 'added', member: memberData, userId: req.user.id, userName: req.user.name },
    });

    res.status(201).json({ success: true, member: memberData });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/projects/:id/members/:userId
 * Remove a member from the project (admin only).
 */
exports.removeMember = async (req, res, next) => {
  try {
    const { id: projectId, userId } = req.params;

    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Only admins can remove members
    const adminCheck = await ProjectMember.findOne({
      where: { projectId, userId: req.user.id, role: 'admin' },
    });
    if (!adminCheck) {
      return res.status(403).json({ success: false, message: 'Only project admins can remove members' });
    }

    // Prevent removing the last admin
    if (userId === req.user.id) {
      const adminCount = await ProjectMember.count({
        where: { projectId, role: 'admin' },
      });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot remove the last admin' });
      }
    }

    const membership = await ProjectMember.findOne({
      where: { projectId, userId },
    });
    if (!membership) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    await membership.destroy();

    // Broadcast member removed to all users in the project room
    broadcast(projectId, {
      type: 'MEMBER_UPDATE',
      payload: { action: 'removed', memberId: userId, userId: req.user.id, userName: req.user.name },
    });

    res.json({ success: true, message: 'Member removed' });
  } catch (err) {
    next(err);
  }
};
