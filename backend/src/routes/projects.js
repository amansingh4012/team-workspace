const { Router } = require('express');
const { verifyToken } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const projectController = require('../controllers/projectController');
const taskController = require('../controllers/taskController');
const activityController = require('../controllers/activityController');
const analyticsController = require('../controllers/analyticsController');

const router = Router();

// All routes require authentication
router.use(verifyToken);

// ── Projects ──────────────────────────────────────────────
router.get('/', projectController.getProjects);
router.post('/', projectController.createProject);
router.get('/:id', projectController.getProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// ── Project Analytics ─────────────────────────────────────
router.get('/:id/analytics', analyticsController.getProjectAnalytics);

// ── Project Members ───────────────────────────────────────
router.post('/:id/members', projectController.addMember);
router.delete('/:id/members/:userId', projectController.removeMember);

// ── Tasks (nested under project) ──────────────────────────
router.get('/:projectId/tasks', taskController.getTasks);
router.post('/:projectId/tasks', taskController.createTask);
router.put('/:projectId/tasks/reorder', taskController.updateTaskOrder);
router.get('/:projectId/tasks/:taskId', taskController.getTask);
router.put('/:projectId/tasks/:taskId', taskController.updateTask);
router.delete('/:projectId/tasks/:taskId', taskController.deleteTask);

// ── Task Attachment Upload ────────────────────────────────
router.post('/:projectId/tasks/:taskId/attachment', upload.single('file'), taskController.uploadAttachment);

// ── Activities (nested under project) ─────────────────────
router.get('/:projectId/activities', activityController.getActivities);

module.exports = router;
