const router = require('express').Router();
const { body } = require('express-validator');
const workspaceController = require('../controllers/workspaceController');
const { verifyToken } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

router.use(verifyToken);

router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Workspace name is required')],
  validate,
  workspaceController.create
);

router.get('/', workspaceController.getAll);
router.get('/:id', workspaceController.getById);
router.put('/:id', workspaceController.update);
router.delete('/:id', workspaceController.remove);

router.post(
  '/:id/members',
  [body('userId').notEmpty().withMessage('User ID is required')],
  validate,
  workspaceController.addMember
);

module.exports = router;
