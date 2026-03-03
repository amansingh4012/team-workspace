const router = require('express').Router();
const { body } = require('express-validator');
const boardController = require('../controllers/boardController');
const { verifyToken } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

router.use(verifyToken);

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Board title is required'),
    body('workspaceId').notEmpty().withMessage('Workspace ID is required'),
  ],
  validate,
  boardController.create
);

router.get('/workspace/:workspaceId', boardController.getByWorkspace);
router.get('/:id', boardController.getById);
router.put('/:id', boardController.update);
router.delete('/:id', boardController.remove);

module.exports = router;
