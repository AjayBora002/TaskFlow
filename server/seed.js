require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Comment = require('./models/Comment');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing demo data
    await User.deleteMany({ email: { $in: ['alex@taskflow.dev', 'jamie@taskflow.dev'] } });
    const existingProject = await Project.findOne({ name: 'Platform Redesign — Q3' });
    if (existingProject) {
      await Task.deleteMany({ project: existingProject._id });
      await Comment.deleteMany({ task: { $in: (await Task.find({ project: existingProject._id })).map(t => t._id) } });
      await existingProject.deleteOne();
    }

    // Create demo users (passwords hashed via pre-save hook)
    const alex = await User.create({
      name: 'Alex Chen',
      email: 'alex@taskflow.dev',
      password: 'password123',
    });

    const jamie = await User.create({
      name: 'Jamie Rivera',
      email: 'jamie@taskflow.dev',
      password: 'password123',
    });

    console.log('✅ Demo users created');

    // Create demo project
    const project = await Project.create({
      name: 'Platform Redesign — Q3',
      description: 'Overhaul the core product UI and improve API response times by 40%. Milestone deadline: Sept 30.',
      owner: alex._id,
      members: [alex._id, jamie._id],
      color: '#2F9E6F',
    });

    console.log('✅ Demo project created');

    const pid = project._id;
    const now = new Date();
    const daysFromNow = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

    // Create 8 realistic tasks spread across all statuses
    const tasks = await Task.insertMany([
      {
        title: 'Audit existing component library for accessibility gaps',
        description: 'Run axe-core against all 47 components. Document failures with WCAG 2.1 AA references. Expect ~12 components to need remediation.',
        project: pid,
        reporter: alex._id,
        assignee: alex._id,
        priority: 'high',
        status: 'done',
        dueDate: daysAgo(5),
        order: 0,
      },
      {
        title: 'Migrate auth flow from cookie-based to JWT + refresh token',
        description: 'Replace session cookies with short-lived JWTs (15 min) and a secure httpOnly refresh token (7 days). Update both web and mobile clients.',
        project: pid,
        reporter: alex._id,
        assignee: jamie._id,
        priority: 'high',
        status: 'done',
        dueDate: daysAgo(2),
        order: 1,
      },
      {
        title: 'Redesign dashboard data model to support per-project aggregations',
        description: 'Current approach counts client-side. Move to MongoDB aggregation pipeline. Spec out the aggregation stages before touching the schema.',
        project: pid,
        reporter: jamie._id,
        assignee: alex._id,
        priority: 'high',
        status: 'inreview',
        dueDate: daysFromNow(2),
        order: 0,
      },
      {
        title: 'Implement drag-and-drop Kanban board',
        description: 'Use @hello-pangea/dnd. Persist column order to the server on drop. Enforce status transition rules server-side — reject invalid jumps with a clear error toast.',
        project: pid,
        reporter: alex._id,
        assignee: jamie._id,
        priority: 'high',
        status: 'inreview',
        dueDate: daysFromNow(3),
        order: 1,
      },
      {
        title: 'Write API integration tests for task CRUD endpoints',
        description: 'Cover happy paths and error cases: invalid transitions, unauthorized access, missing fields. Target 80% endpoint coverage with Jest + supertest.',
        project: pid,
        reporter: jamie._id,
        assignee: jamie._id,
        priority: 'medium',
        status: 'inprogress',
        dueDate: daysFromNow(5),
        order: 0,
      },
      {
        title: 'Replace Webpack with Vite in the frontend build pipeline',
        description: 'Cold start on dev is currently 18s. Vite should bring that under 2s. Validate HMR works for all major page transitions.',
        project: pid,
        reporter: alex._id,
        assignee: alex._id,
        priority: 'medium',
        status: 'inprogress',
        dueDate: daysFromNow(7),
        order: 1,
      },
      {
        title: 'Design notification system schema and delivery logic',
        description: 'Define notification types, recipient resolution logic, and the read/unread state machine. Decide on polling vs WebSocket — start with polling (5s interval).',
        project: pid,
        reporter: alex._id,
        assignee: null,
        priority: 'medium',
        status: 'todo',
        dueDate: daysFromNow(10),
        order: 0,
      },
      {
        title: 'Set up staging environment on Render + seed pipeline',
        description: 'Configure Render deploy hooks from the main branch. Add a --staging flag to the seed script. Document env vars required for a fresh deploy in the README.',
        project: pid,
        reporter: jamie._id,
        assignee: jamie._id,
        priority: 'low',
        status: 'todo',
        dueDate: daysFromNow(14),
        order: 1,
      },
    ]);

    console.log(`✅ ${tasks.length} demo tasks created`);

    // Add a comment to the first inreview task
    await Comment.create({
      body: "Aggregation pipeline is looking good. One note — the $lookup stage for workload per member might get slow at scale. Worth indexing on project+assignee.",
      author: jamie._id,
      task: tasks[2]._id,
    });

    await Comment.create({
      body: "Good catch. I've already added a compound index on { project: 1, assignee: 1 } in the Task model. Should be fine up to ~50k tasks per project.",
      author: alex._id,
      task: tasks[2]._id,
    });

    console.log('✅ Demo comments created');
    console.log('\n📋 Seed complete. Demo credentials:');
    console.log('   alex@taskflow.dev  / password123');
    console.log('   jamie@taskflow.dev / password123');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seed();
