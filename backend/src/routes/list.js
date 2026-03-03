const router = require('express').Router();
const { body } = require('express-validator');
const listController = require('../controllers/listController');
const { verifyToken } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

router.use(verifyToken);

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('List title is required'),
    body('boardId').notEmpty().withMessage('Board ID is required'),
  ],
  validate,
  listController.create
);

router.put('/:id', listController.update);
router.delete('/:id', listController.remove);

module.exports = router;
