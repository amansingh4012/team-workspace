const router = require('express').Router();

router.use('/auth', require('./auth'));
router.use('/tasks', require('./tasks'));
router.use('/projects', require('./projects'));

module.exports = router;
