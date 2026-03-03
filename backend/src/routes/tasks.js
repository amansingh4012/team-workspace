const { Router } = require('express');
const { verifyToken } = require('../middlewares/auth');
const taskController = require('../controllers/taskController');

const router = Router();

router.use(verifyToken);

// GET /api/tasks/mine — all tasks assigned to the authenticated user
router.get('/mine', taskController.getMyTasks);

module.exports = router;
