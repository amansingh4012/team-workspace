const { Workspace, User, WorkspaceMember } = require('../models');
const AppError = require('../utils/AppError');

exports.create = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const workspace = await Workspace.create({
      name,
      description,
      ownerId: req.user.id,
    });

    // Add the owner as an admin member
    await WorkspaceMember.create({
      workspaceId: workspace.id,
      userId: req.user.id,
      role: 'admin',
    });

    res.status(201).json({ workspace });
  } catch (err) {
    next(err);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const workspaces = await Workspace.findAll({
      include: [
        { association: 'owner', attributes: ['id', 'name', 'email', 'avatar'] },
        { association: 'members', attributes: ['id', 'name', 'email', 'avatar'], through: { attributes: ['role'] } },
      ],
      where: {},
    });

    // Filter to only workspaces the user is a member of
    const userWorkspaces = workspaces.filter((ws) =>
      ws.members.some((m) => m.id === req.user.id)
    );

    res.json({ workspaces: userWorkspaces });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const workspace = await Workspace.findByPk(req.params.id, {
      include: [
        { association: 'owner', attributes: ['id', 'name', 'email', 'avatar'] },
        { association: 'members', attributes: ['id', 'name', 'email', 'avatar'], through: { attributes: ['role'] } },
        { association: 'boards' },
      ],
    });

    if (!workspace) throw new AppError('Workspace not found', 404);

    res.json({ workspace });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const workspace = await Workspace.findByPk(req.params.id);
    if (!workspace) throw new AppError('Workspace not found', 404);
    if (workspace.ownerId !== req.user.id) throw new AppError('Unauthorized', 403);

    await workspace.update(req.body);
    res.json({ workspace });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const workspace = await Workspace.findByPk(req.params.id);
    if (!workspace) throw new AppError('Workspace not found', 404);
    if (workspace.ownerId !== req.user.id) throw new AppError('Unauthorized', 403);

    await workspace.destroy();
    res.json({ message: 'Workspace deleted' });
  } catch (err) {
    next(err);
  }
};

exports.addMember = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const workspace = await Workspace.findByPk(req.params.id);
    if (!workspace) throw new AppError('Workspace not found', 404);

    await WorkspaceMember.create({
      workspaceId: workspace.id,
      userId,
      role: role || 'member',
    });

    res.status(201).json({ message: 'Member added' });
  } catch (err) {
    next(err);
  }
};
