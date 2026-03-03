const { Board, List, Task } = require('../models');
const AppError = require('../utils/AppError');

exports.create = async (req, res, next) => {
  try {
    const { title, description, workspaceId } = req.body;
    const board = await Board.create({
      title,
      description,
      workspaceId,
      createdBy: req.user.id,
    });
    res.status(201).json({ board });
  } catch (err) {
    next(err);
  }
};

exports.getByWorkspace = async (req, res, next) => {
  try {
    const boards = await Board.findAll({
      where: { workspaceId: req.params.workspaceId },
      include: [{ association: 'creator', attributes: ['id', 'name', 'avatar'] }],
    });
    res.json({ boards });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const board = await Board.findByPk(req.params.id, {
      include: [
        {
          association: 'lists',
          include: [
            {
              association: 'tasks',
              include: [
                { association: 'assignee', attributes: ['id', 'name', 'avatar'] },
              ],
              order: [['position', 'ASC']],
            },
          ],
          order: [['position', 'ASC']],
        },
        { association: 'creator', attributes: ['id', 'name', 'avatar'] },
      ],
    });

    if (!board) throw new AppError('Board not found', 404);
    res.json({ board });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const board = await Board.findByPk(req.params.id);
    if (!board) throw new AppError('Board not found', 404);

    await board.update(req.body);
    res.json({ board });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const board = await Board.findByPk(req.params.id);
    if (!board) throw new AppError('Board not found', 404);

    await board.destroy();
    res.json({ message: 'Board deleted' });
  } catch (err) {
    next(err);
  }
};
