const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');

exports.createProject = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name) return res.status(400).json({ message: 'Project name is required' });

    const project = await Project.create({
      name,
      description,
      color,
      owner: req.user._id,
      members: [req.user._id],
    });

    await project.populate('owner members', 'name email');
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ members: req.user._id })
      .populate('owner', 'name email')
      .populate('members', 'name email')
      .sort({ updatedAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email');

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isMember = project.members.some((m) => String(m._id) === String(req.user._id));
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (String(project.owner) !== String(req.user._id))
      return res.status(403).json({ message: 'Only the project owner can edit project settings' });

    const { name, description, color } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (color) project.color = color;

    await project.save();
    await project.populate('owner members', 'name email');
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (String(project.owner) !== String(req.user._id))
      return res.status(403).json({ message: 'Only the project owner can delete this project' });

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addMember = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (String(project.owner) !== String(req.user._id))
      return res.status(403).json({ message: 'Only the project owner can add members' });

    const userToAdd = await User.findOne({ email: email.toLowerCase() });
    if (!userToAdd) return res.status(404).json({ message: 'No user found with that email' });

    const alreadyMember = project.members.map(String).includes(String(userToAdd._id));
    if (alreadyMember) return res.status(409).json({ message: 'User is already a member' });

    project.members.push(userToAdd._id);
    await project.save();

    // Notify the added user
    await Notification.create({
      recipient: userToAdd._id,
      type: 'member_added',
      message: `${req.user.name} added you to project "${project.name}"`,
      link: `/projects/${project._id}`,
      actor: req.user._id,
    });

    await project.populate('owner members', 'name email');
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (String(project.owner) !== String(req.user._id))
      return res.status(403).json({ message: 'Only the project owner can remove members' });

    const { userId } = req.params;
    if (String(project.owner) === String(userId))
      return res.status(400).json({ message: 'Cannot remove the project owner' });

    project.members = project.members.filter((m) => String(m) !== String(userId));
    await project.save();
    await project.populate('owner members', 'name email');
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProjectStats = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isMember = project.members.map(String).includes(String(req.user._id));
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    const projectId = project._id;
    const now = new Date();

    // Task count by status (aggregation pipeline)
    const statusCounts = await Task.aggregate([
      { $match: { project: projectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Overdue count
    const overdueCount = await Task.countDocuments({
      project: projectId,
      status: { $nin: ['done'] },
      dueDate: { $lt: now },
    });

    // Workload per member (aggregation)
    const workload = await Task.aggregate([
      { $match: { project: projectId, assignee: { $ne: null } } },
      {
        $group: {
          _id: '$assignee',
          total: { $sum: 1 },
          todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
          inprogress: { $sum: { $cond: [{ $eq: ['$status', 'inprogress'] }, 1, 0] } },
          inreview: { $sum: { $cond: [{ $eq: ['$status', 'inreview'] }, 1, 0] } },
          done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      { $unwind: '$user' },
      { $sort: { total: -1 } },
    ]);

    const statusMap = {};
    statusCounts.forEach((s) => {
      statusMap[s._id] = s.count;
    });

    res.json({
      tasksByStatus: {
        todo: statusMap.todo || 0,
        inprogress: statusMap.inprogress || 0,
        inreview: statusMap.inreview || 0,
        done: statusMap.done || 0,
      },
      totalTasks: Object.values(statusMap).reduce((a, b) => a + b, 0),
      overdueCount,
      workload,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
