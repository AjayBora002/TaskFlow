const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');

const assertProjectMember = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) throw { status: 404, message: 'Project not found' };
  const isMember = project.members.map(String).includes(String(userId));
  if (!isMember) throw { status: 403, message: 'Access denied' };
  return project;
};

exports.getTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    await assertProjectMember(projectId, req.user._id);

    const tasks = await Task.find({ project: projectId })
      .populate('assignee', 'name email')
      .populate('reporter', 'name email')
      .sort({ order: 1, createdAt: 1 });

    res.json(tasks);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    await assertProjectMember(projectId, req.user._id);

    const { title, description, assignee, priority, dueDate, status } = req.body;
    if (!title) return res.status(400).json({ message: 'Task title is required' });

    // Count existing tasks in same status for ordering
    const orderBase = await Task.countDocuments({ project: projectId, status: status || 'todo' });

    const task = await Task.create({
      title,
      description,
      assignee: assignee || null,
      priority: priority || 'medium',
      status: status || 'todo',
      dueDate: dueDate || null,
      project: projectId,
      reporter: req.user._id,
      order: orderBase,
    });

    await task.populate('assignee reporter', 'name email');

    // Notify assignee if different from creator
    if (task.assignee && String(task.assignee._id) !== String(req.user._id)) {
      await Notification.create({
        recipient: task.assignee._id,
        type: 'task_assigned',
        message: `${req.user.name} assigned you "${task.title}"`,
        link: `/projects/${projectId}/tasks/${task._id}`,
        actor: req.user._id,
      });
    }

    res.status(201).json(task);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
    }
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('assignee', 'name email')
      .populate('reporter', 'name email')
      .populate('project', 'name members');

    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isMember = task.project.members.map(String).includes(String(req.user._id));
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId).populate('project', 'members');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isMember = task.project.members.map(String).includes(String(req.user._id));
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    const { title, description, assignee, priority, dueDate, status, subtasks } = req.body;
    const prevAssignee = task.assignee ? String(task.assignee) : null;

    // Status transition validation
    if (status && status !== task.status) {
      const allowed = Task.VALID_TRANSITIONS[task.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          message: `Cannot move task from "${task.status}" to "${status}". Invalid transition.`,
          currentStatus: task.status,
          allowedTransitions: allowed,
        });
      }
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (assignee !== undefined) task.assignee = assignee || null;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate || null;
    if (status !== undefined) task.status = status;
    if (subtasks !== undefined) task.subtasks = subtasks;

    await task.save();
    await task.populate('assignee reporter', 'name email');

    // Notify new assignee
    const newAssignee = task.assignee ? String(task.assignee._id) : null;
    if (newAssignee && newAssignee !== prevAssignee && newAssignee !== String(req.user._id)) {
      await Notification.create({
        recipient: task.assignee._id,
        type: 'task_assigned',
        message: `${req.user.name} assigned you "${task.title}"`,
        link: `/projects/${task.project._id}/tasks/${task._id}`,
        actor: req.user._id,
      });
    }

    res.json(task);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId).populate('project', 'members owner');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isMember = task.project.members.map(String).includes(String(req.user._id));
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.reorderTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    await assertProjectMember(projectId, req.user._id);

    // taskOrders: [{ id, order, status }]
    const { taskOrders } = req.body;
    if (!Array.isArray(taskOrders)) return res.status(400).json({ message: 'taskOrders must be an array' });

    const ops = taskOrders.map(({ id, order, status }) => ({
      updateOne: {
        filter: { _id: id, project: projectId },
        update: { $set: { order, status } },
      },
    }));

    await Task.bulkWrite(ops);
    res.json({ message: 'Tasks reordered' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
