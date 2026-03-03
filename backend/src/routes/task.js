const router = require('express').Router();
const { body } = require('express-validator');
const taskController = require('../controllers/taskController');
const { verifyToken } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

router.use(verifyToken);

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('listId').notEmpty().withMessage('List ID is required'),
  ],
  validate,
  taskController.create
);

router.get('/:id', taskController.getById);
router.put('/:id', taskController.update);
router.put('/:id/move', taskController.move);
router.delete('/:id', taskController.remove);

router.post(
  '/:id/comments',
  [body('content').trim().notEmpty().withMessage('Comment content is required')],
  validate,
  taskController.addComment
);

module.exports = router;
