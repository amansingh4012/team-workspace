const { List } = require('../models');
const AppError = require('../utils/AppError');

exports.create = async (req, res, next) => {
  try {
    const { title, boardId, position } = req.body;
    const list = await List.create({ title, boardId, position });
    res.status(201).json({ list });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const list = await List.findByPk(req.params.id);
    if (!list) throw new AppError('List not found', 404);

    await list.update(req.body);
    res.json({ list });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const list = await List.findByPk(req.params.id);
    if (!list) throw new AppError('List not found', 404);

    await list.destroy();
    res.json({ message: 'List deleted' });
  } catch (err) {
    next(err);
  }
};
