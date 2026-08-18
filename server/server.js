require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const { securityHeaders, sanitizeNoSql, apiLimiter } = require('./middleware/security');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const commentRoutes = require('./routes/comments');
const notificationRoutes = require('./routes/notifications');
const aiRoutes = require('./routes/ai');

const app = express();

// Trust proxy for Vercel reverse proxy rate-limiting
app.set('trust proxy', 1);

// Security Headers & Input Sanitization
app.use(securityHeaders);
app.use(sanitizeNoSql);

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10kb' })); // Limit JSON body payload size

// Apply global API Rate Limiter
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
// Nested: tasks under projects, comments under tasks
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/projects/:projectId/tasks/:taskId/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Create HTTP server & Socket.io server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Real-Time Socket Rooms & Active Presence Tracker
const projectPresence = new Map(); // projectId -> Map(socketId -> userData)

io.on('connection', (socket) => {
  let currentProject = null;
  let currentUser = null;

  socket.on('join_project', ({ projectId, user }) => {
    if (!projectId) return;
    currentProject = projectId;
    currentUser = user;

    socket.join(`project_${projectId}`);

    if (!projectPresence.has(projectId)) {
      projectPresence.set(projectId, new Map());
    }
    if (user) {
      projectPresence.get(projectId).set(socket.id, user);
    }

    // Broadcast updated active presence list to room
    const activeUsers = Array.from(projectPresence.get(projectId).values());
    io.to(`project_${projectId}`).emit('presence_update', activeUsers);
  });

  socket.on('leave_project', ({ projectId }) => {
    socket.leave(`project_${projectId}`);
    if (projectPresence.has(projectId)) {
      projectPresence.get(projectId).delete(socket.id);
      const activeUsers = Array.from(projectPresence.get(projectId).values());
      io.to(`project_${projectId}`).emit('presence_update', activeUsers);
    }
  });

  socket.on('task_moved', ({ projectId, task }) => {
    socket.to(`project_${projectId}`).emit('task_moved', task);
  });

  socket.on('task_created', ({ projectId, task }) => {
    socket.to(`project_${projectId}`).emit('task_created', task);
  });

  socket.on('task_updated', ({ projectId, task }) => {
    socket.to(`project_${projectId}`).emit('task_updated', task);
  });

  socket.on('task_deleted', ({ projectId, taskId }) => {
    socket.to(`project_${projectId}`).emit('task_deleted', taskId);
  });

  socket.on('disconnect', () => {
    if (currentProject && projectPresence.has(currentProject)) {
      projectPresence.get(currentProject).delete(socket.id);
      const activeUsers = Array.from(projectPresence.get(currentProject).values());
      io.to(`project_${currentProject}`).emit('presence_update', activeUsers);
    }
  });
});

// Standalone local execution
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB');
      server.listen(PORT, () => {
        console.log(`🚀 Server & WebSockets running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err.message);
      process.exit(1);
    });
}

module.exports = app;
