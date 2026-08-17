const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Notification = require('../models/Notification');

exports.getComments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const comments = await Comment.find({ task: taskId })
      .populate('author', 'name email')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ message: 'Comment body is required' });
    }

    const task = await Task.findById(taskId).populate('project', 'members').populate('assignee', '_id name');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isMember = task.project.members.map(String).includes(String(req.user._id));
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    const comment = await Comment.create({ body: body.trim(), author: req.user._id, task: taskId });
    await comment.populate('author', 'name email');

    // Notify assignee if they didn't write the comment
    if (task.assignee && String(task.assignee._id) !== String(req.user._id)) {
      await Notification.create({
        recipient: task.assignee._id,
        type: 'task_commented',
        message: `${req.user.name} commented on "${task.title}"`,
        link: `/projects/${task.project._id}/tasks/${taskId}`,
        actor: req.user._id,
      });
    }

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (String(comment.author) !== String(req.user._id))
      return res.status(403).json({ message: 'You can only delete your own comments' });

    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
