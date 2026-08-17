const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  reorderTasks,
} = require('../controllers/taskController');

router.use(auth);

// Routes under /api/projects/:projectId/tasks
router.get('/', getTasks);
router.post('/', createTask);
router.put('/reorder', reorderTasks);
router.get('/:taskId', getTask);
router.put('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);

module.exports = router;
