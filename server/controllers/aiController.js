const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const Comment = require('../models/Comment');
const aiService = require('../services/aiService');

// Helper to check member permissions
const assertMember = async (projectId, userId) => {
  const project = await Project.findById(projectId).populate('members', 'name email');
  if (!project) throw { status: 404, message: 'Project not found' };
  const isMember = project.members.some((m) => String(m._id) === String(userId));
  if (!isMember) throw { status: 403, message: 'Access denied' };
  return project;
};

// 1. Decompose Task into Subtasks
exports.decomposeTask = async (req, res) => {
  try {
    const { title, description, taskId } = req.body;
    let taskTitle = title;
    let taskDesc = description;
    let taskObj = null;

    if (taskId) {
      taskObj = await Task.findById(taskId);
      if (taskObj) {
        taskTitle = taskObj.title;
        taskDesc = taskObj.description;
      }
    }

    if (!taskTitle) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    const subtasks = await aiService.decomposeTask(taskTitle, taskDesc);

    // If taskId was passed, save subtasks directly to the task model
    if (taskObj) {
      taskObj.subtasks = subtasks;
      await taskObj.save();
      await taskObj.populate('assignee reporter', 'name email');
      return res.json({ subtasks, task: taskObj });
    }

    res.json({ subtasks });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// 2. Parse Natural Language Command & Create Task
exports.parseCommandAndCreateTask = async (req, res) => {
  try {
    const { projectId, prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Prompt command is required' });

    const project = await assertMember(projectId, req.user._id);
    const parsed = await aiService.parseNaturalLanguageCommand(prompt, project.members);

    let assigneeId = null;
    if (parsed.assigneeEmail) {
      const matched = project.members.find(
        (m) => m.email.toLowerCase() === parsed.assigneeEmail.toLowerCase()
      );
      if (matched) assigneeId = matched._id;
    }

    const orderBase = await Task.countDocuments({ project: projectId, status: parsed.status || 'todo' });

    const task = await Task.create({
      title: parsed.title,
      description: parsed.description || `Created via AI Command: "${prompt}"`,
      priority: parsed.priority || 'medium',
      status: parsed.status || 'todo',
      dueDate: parsed.dueDate || null,
      assignee: assigneeId,
      project: projectId,
      reporter: req.user._id,
      order: orderBase,
    });

    await task.populate('assignee reporter', 'name email');
    res.status(201).json({ parsed, task });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// 3. AI Project Risk & Bottleneck Audit (Aggregation pipeline + LLM)
exports.auditProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await assertMember(projectId, req.user._id);

    const tasks = await Task.find({ project: projectId }).populate('assignee', 'name email');
    const auditResult = await aiService.auditProjectHealth({
      projectName: project.name,
      tasks: tasks.map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        assignee: t.assignee?.name || null,
        subtaskCount: t.subtasks?.length || 0,
      })),
      members: project.members,
    });

    res.json(auditResult);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// 4. Generate Tech Spec & Acceptance Criteria
exports.generateSpec = async (req, res) => {
  try {
    const { title, brief } = req.body;
    if (!title) return res.status(400).json({ message: 'Task title is required' });

    const specMarkdown = await aiService.generateSpec(title, brief);
    res.json({ spec: specMarkdown });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 5. Generate Standup Digest
exports.generateStandupDigest = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await assertMember(projectId, req.user._id);

    const tasks = await Task.find({ project: projectId }).sort({ updatedAt: -1 }).limit(20);
    const comments = await Comment.find({ task: { $in: tasks.map((t) => t._id) } })
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    const digest = await aiService.generateStandupDigest(
      project.name,
      tasks.map((t) => ({ title: t.title, status: t.status, dueDate: t.dueDate })),
      comments.map((c) => ({ body: c.body, author: c.author?.name }))
    );

    res.json(digest);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};
