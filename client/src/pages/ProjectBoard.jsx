import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Settings, Users, X, UserPlus, Trash2, AlertCircle, Search, Sparkles, ChevronDown, FileText, ShieldAlert, Command, ClipboardList, PlayCircle, Eye, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../api/axios';
import { socket } from '../api/socket';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import AICommandBar from '../components/AICommandBar';
import AIAuditPanel from '../components/AIAuditPanel';
import AIDigestModal from '../components/AIDigestModal';

const COLUMNS = [
  { id: 'todo', label: 'To Do', icon: ClipboardList, color: 'var(--color-status-todo)', bg: 'var(--color-status-todo-bg)', border: 'var(--color-status-todo-border)', emptyTitle: 'Backlog is clear', emptyHint: 'New tasks land here. Click + to add one.' },
  { id: 'inprogress', label: 'In Progress', icon: PlayCircle, color: 'var(--color-status-inprogress)', bg: 'var(--color-status-inprogress-bg)', border: 'var(--color-status-inprogress-border)', emptyTitle: 'Nothing active right now', emptyHint: 'Drag a task here when work begins.' },
  { id: 'inreview', label: 'In Review', icon: Eye, color: 'var(--color-status-inreview)', bg: 'var(--color-status-inreview-bg)', border: 'var(--color-status-inreview-border)', emptyTitle: 'No pending reviews', emptyHint: 'Tasks awaiting verification appear here.' },
  { id: 'done', label: 'Done', icon: CheckCircle2, color: 'var(--color-status-done)', bg: 'var(--color-status-done-bg)', border: 'var(--color-status-done-border)', emptyTitle: 'No completed tasks yet', emptyHint: 'Finished tasks will accumulate here.' },
];

const VALID_TRANSITIONS = {
  todo: ['inprogress'],
  inprogress: ['todo', 'inreview'],
  inreview: ['inprogress', 'done'],
  done: ['inreview'],
};

const AVATAR_COLORS = [
  { bg: '#2563EB', color: '#FFFFFF' },
  { bg: '#059669', color: '#FFFFFF' },
  { bg: '#7C3AED', color: '#FFFFFF' },
  { bg: '#D97706', color: '#FFFFFF' },
  { bg: '#DB2777', color: '#FFFFFF' },
  { bg: '#4F46E5', color: '#FFFFFF' },
];

function getAvatarStyle(name) {
  if (!name) return { background: '#94A3B8', color: '#FFFFFF' };
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return { background: AVATAR_COLORS[index].bg, color: AVATAR_COLORS[index].color };
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getOwnerId(project) {
  if (!project || !project.owner) return null;
  return typeof project.owner === 'object' ? project.owner._id : project.owner;
}

export default function ProjectBoard() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const ownerId = getOwnerId(project);
  const isOwner = Boolean(user?._id && ownerId && String(user._id) === String(ownerId));
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transitonError, setTransitionError] = useState('');
  const [activePresence, setActivePresence] = useState([]);

  // Search & Priority Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // AI Menu Dropdown State
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [openAICopilot, setOpenAICopilot] = useState(false);
  const [openAIDigest, setOpenAIDigest] = useState(false);
  const [openAIAudit, setOpenAIAudit] = useState(false);

  // Modals
  const [showNewTask, setShowNewTask] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState('todo');
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', assignee: '', dueDate: '' });
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskError, setTaskError] = useState('');

  // Settings state
  const [memberEmail, setMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  useEffect(() => {
    fetchBoard();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    socket.connect();
    socket.emit('join_project', { projectId, user });

    socket.on('presence_update', (users) => {
      const uniqueUsers = Array.from(new Map(users.map(u => [u.email || u.id, u])).values());
      setActivePresence(uniqueUsers);
    });

    socket.on('task_moved', (movedTask) => {
      setTasks((prev) => prev.map((t) => (t._id === movedTask._id ? { ...t, ...movedTask } : t)));
    });

    socket.on('task_created', (createdTask) => {
      setTasks((prev) => {
        if (prev.some((t) => t._id === createdTask._id)) return prev;
        return [createdTask, ...prev];
      });
    });

    socket.on('task_updated', (updatedTask) => {
      setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? { ...t, ...updatedTask } : t)));
    });

    socket.on('task_deleted', (deletedId) => {
      setTasks((prev) => prev.filter((t) => t._id !== deletedId));
    });

    return () => {
      socket.emit('leave_project', { projectId });
      socket.off('presence_update');
      socket.off('task_moved');
      socket.off('task_created');
      socket.off('task_updated');
      socket.off('task_deleted');
      socket.disconnect();
    };
  }, [projectId, user]);

  const fetchBoard = async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks`),
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getColumnTasks = (status) =>
    filteredTasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order);

  const triggerCelebration = () => {
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#4F46E5', '#059669', '#D97706', '#2563EB'],
    });
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    setTransitionError('');
    const sourceStatus = source.droppableId;
    const destStatus = destination.droppableId;

    if (sourceStatus !== destStatus) {
      const allowed = VALID_TRANSITIONS[sourceStatus];
      if (!allowed || !allowed.includes(destStatus)) {
        const fromLabel = COLUMNS.find((c) => c.id === sourceStatus)?.label;
        const toLabel = COLUMNS.find((c) => c.id === destStatus)?.label;
        setTransitionError(`Invalid transition: Tasks in "${fromLabel}" cannot move directly to "${toLabel}".`);
        return;
      }
    }

    const previousTasks = [...tasks];
    const movedTask = tasks.find((t) => t._id === draggableId);
    if (!movedTask) return;

    const updatedTask = { ...movedTask, status: destStatus, order: destination.index };
    setTasks((prev) => prev.map((t) => (t._id === draggableId ? updatedTask : t)));

    if (destStatus === 'done' && sourceStatus !== 'done') {
      triggerCelebration();
    }

    try {
      const res = await api.patch(`/projects/${projectId}/tasks/${draggableId}/move`, {
        newStatus: destStatus,
        newOrder: destination.index,
      });
      socket.emit('task_moved', { projectId, task: res.data });
    } catch (err) {
      setTasks(previousTasks);
      setTransitionError(err.response?.data?.message || 'Failed to persist task movement.');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setTaskError('');
    setCreatingTask(true);
    try {
      const res = await api.post(`/projects/${projectId}/tasks`, {
        ...newTask,
        status: newTaskStatus,
        assignee: newTask.assignee || undefined,
      });
      setTasks((prev) => [...prev, res.data]);
      socket.emit('task_created', { projectId, task: res.data });
      setShowNewTask(false);
      setNewTask({ title: '', description: '', priority: 'medium', assignee: '', dueDate: '' });
    } catch (err) {
      setTaskError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError('');
    setAddingMember(true);
    try {
      const res = await api.post(`/projects/${projectId}/members`, { email: memberEmail });
      setProject(res.data);
      setMemberEmail('');
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      const res = await api.delete(`/projects/${projectId}/members/${userId}`);
      setProject(res.data);
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleDeleteProject = async () => {
    if (window.confirm('Are you sure you want to delete this project? All tasks will be permanently removed.')) {
      try {
        await api.delete(`/projects/${projectId}`);
        navigate('/');
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete project');
      }
    }
  };

  const getInitials = (name) =>
    name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', gap: '16px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ width: '280px', height: '400px', borderRadius: '16px' }} />
        ))}
      </div>
    );
  }

  if (!project) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Board Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
          gap: '12px',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        {/* Project Name + Live Presence Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: project.color || 'var(--color-accent)',
              boxShadow: `0 0 0 3px ${project.color ? `${project.color}22` : 'rgba(79, 70, 229, 0.15)'}`,
              flexShrink: 0,
            }}
          />
          <h1
            className="font-display"
            style={{
              margin: 0,
              fontSize: '17px',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            {project.name}
          </h1>

          {/* Live presence indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              background: 'var(--color-surface-2)',
              borderRadius: '20px',
              border: '1px solid var(--color-border)',
            }}
            title="Active board viewers"
          >
            <span style={{ position: 'relative', display: 'flex', width: '7px', height: '7px' }}>
              <span className="animate-pulse-dot" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--color-status-done)' }} />
              <span style={{ position: 'relative', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-status-done)' }} />
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              {activePresence.length || 1} live
            </span>
          </div>
        </div>

        {/* Search & Priority Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', width: '180px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="input"
              style={{ paddingLeft: '28px', paddingRight: '10px', height: '30px', fontSize: '12px' }}
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input"
            style={{ width: '115px', height: '30px', fontSize: '12px', padding: '0 8px' }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Action buttons: AI Menu dropdown + New Task + Settings */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Consolidated AI Menu Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAIMenu((o) => !o)}
              className="btn btn-ghost"
              style={{ fontSize: '12px', gap: '4px', padding: '5px 9px' }}
            >
              <Sparkles size={13} style={{ color: 'var(--color-accent)' }} />
              <span>AI Tools</span>
              <ChevronDown size={12} style={{ color: 'var(--color-text-muted)' }} />
            </button>

            {showAIMenu && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                  onClick={() => setShowAIMenu(false)}
                />
                <div
                  className="animate-slide-down card"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 6px)',
                    width: '190px',
                    padding: '4px',
                    zIndex: 100,
                    boxShadow: 'var(--shadow-lg)',
                  }}
                >
                  <button
                    onClick={() => { setShowAIMenu(false); setOpenAICopilot(true); }}
                    className="btn btn-ghost"
                    style={{ width: '100%', justifyContent: 'flex-start', border: 'none', padding: '7px 10px', fontSize: '12px' }}
                  >
                    <Command size={13} style={{ color: 'var(--color-accent)' }} />
                    AI Copilot (⌘K)
                  </button>
                  <button
                    onClick={() => { setShowAIMenu(false); setOpenAIDigest(true); }}
                    className="btn btn-ghost"
                    style={{ width: '100%', justifyContent: 'flex-start', border: 'none', padding: '7px 10px', fontSize: '12px' }}
                  >
                    <FileText size={13} style={{ color: '#2563EB' }} />
                    Standup Digest
                  </button>
                  <button
                    onClick={() => { setShowAIMenu(false); setOpenAIAudit(true); }}
                    className="btn btn-ghost"
                    style={{ width: '100%', justifyContent: 'flex-start', border: 'none', padding: '7px 10px', fontSize: '12px' }}
                  >
                    <ShieldAlert size={13} style={{ color: '#7C3AED' }} />
                    Risk Audit
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Controlled Modals for AI Menu */}
          <AICommandBar
            projectId={projectId}
            menuMode
            externalOpen={openAICopilot}
            setExternalOpen={setOpenAICopilot}
            onTaskCreated={(createdTask) => {
              setTasks((prev) => [...prev, createdTask]);
              socket.emit('task_created', { projectId, task: createdTask });
            }}
          />
          <AIDigestModal
            projectId={projectId}
            menuMode
            externalOpen={openAIDigest}
            setExternalOpen={setOpenAIDigest}
          />
          <AIAuditPanel
            projectId={projectId}
            menuMode
            externalOpen={openAIAudit}
            setExternalOpen={setOpenAIAudit}
          />

          <button
            id="btn-new-task"
            onClick={() => { setNewTaskStatus('todo'); setShowNewTask(true); }}
            className="btn btn-primary"
            style={{ padding: '5px 12px', fontSize: '12.5px' }}
          >
            <Plus size={14} />
            New Task
          </button>

          <button
            id="btn-project-settings"
            onClick={() => setShowSettings(true)}
            className="btn-icon"
            title="Project Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {transitonError && (
        <div
          style={{
            margin: '10px 24px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'var(--color-danger-subtle)',
            border: '1px solid rgba(225, 29, 72, 0.25)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            color: 'var(--color-danger)',
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0 }}>{transitonError}</span>
          <button onClick={() => setTransitionError('')} className="btn-icon" style={{ padding: '2px' }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Kanban Drag and Drop Columns — Distinct Trays with Depth & Tints */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: '16px',
            padding: '20px 24px 24px',
            overflowX: 'auto',
            alignItems: 'flex-start',
          }}
        >
          {COLUMNS.map((col) => {
            const colTasks = getColumnTasks(col.id);
            const ColumnIcon = col.icon;

            return (
              <div
                key={col.id}
                style={{
                  flex: '0 0 280px',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 'calc(100vh - 140px)',
                  background: col.bg,
                  border: `1px solid ${col.border}`,
                  borderTop: `3.5px solid ${col.color}`,
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xs)',
                  overflow: 'hidden',
                }}
              >
                {/* Column header with status badge and count pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderBottom: `1px solid ${col.border}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <ColumnIcon size={15} style={{ color: col.color }} />
                    <span
                      className="font-display"
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {col.label}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: col.color,
                        background: 'var(--color-surface)',
                        padding: '1px 7px',
                        borderRadius: '10px',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                    >
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => { setNewTaskStatus(col.id); setShowNewTask(true); }}
                    className="btn-icon"
                    title={`Add task to ${col.label}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Droppable cards tray area */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '10px',
                        overflowY: 'auto',
                        minHeight: '160px',
                        transition: 'background 0.15s, border-color 0.15s',
                        background: snapshot.isDraggingOver
                          ? 'rgba(255, 255, 255, 0.7)'
                          : 'transparent',
                      }}
                    >
                      {/* Rich Column Empty State */}
                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div
                          style={{
                            padding: '32px 16px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'var(--color-surface)',
                              boxShadow: 'var(--shadow-xs)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: col.color,
                              marginBottom: '10px',
                            }}
                          >
                            <ColumnIcon size={18} />
                          </div>
                          <p
                            className="font-display"
                            style={{
                              margin: '0 0 3px 0',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            {col.emptyTitle}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: '11.5px',
                              color: 'var(--color-text-muted)',
                              lineHeight: 1.4,
                              maxWidth: '190px',
                            }}
                          >
                            {col.emptyHint}
                          </p>
                        </div>
                      )}

                      {colTasks.map((task, index) => (
                        <Draggable key={task._id} draggableId={task._id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                            >
                              <TaskCard
                                task={task}
                                projectId={projectId}
                                isDragging={dragSnapshot.isDragging}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* New Task Modal */}
      {showNewTask && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowNewTask(false); }}>
          <div className="modal-box animate-scale-in" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 className="font-display" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                New Task — {COLUMNS.find((c) => c.id === newTaskStatus)?.label}
              </h2>
              <button onClick={() => setShowNewTask(false)} className="btn-icon"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label htmlFor="task-title" className="field-label">Title *</label>
                  <input
                    id="task-title"
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask((f) => ({ ...f, title: e.target.value }))}
                    className="input"
                    placeholder="Task title..."
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="task-desc" className="field-label">Description</label>
                  <textarea
                    id="task-desc"
                    rows={3}
                    value={newTask.description}
                    onChange={(e) => setNewTask((f) => ({ ...f, description: e.target.value }))}
                    className="input"
                    style={{ resize: 'vertical' }}
                    placeholder="Task details and scope..."
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label htmlFor="task-priority" className="field-label">Priority</label>
                    <select
                      id="task-priority"
                      value={newTask.priority}
                      onChange={(e) => setNewTask((f) => ({ ...f, priority: e.target.value }))}
                      className="input"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="task-assignee" className="field-label">Assignee</label>
                    <select
                      id="task-assignee"
                      value={newTask.assignee}
                      onChange={(e) => setNewTask((f) => ({ ...f, assignee: e.target.value }))}
                      className="input"
                    >
                      <option value="">Unassigned</option>
                      {project.members?.map((m) => (
                        <option key={m._id} value={m._id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="task-duedate" className="field-label">Due Date</label>
                  <input
                    id="task-duedate"
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask((f) => ({ ...f, dueDate: e.target.value }))}
                    className="input"
                  />
                </div>

                {taskError && (
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-danger)' }}>{taskError}</p>
                )}

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button type="button" onClick={() => setShowNewTask(false)} className="btn btn-ghost">
                    Cancel
                  </button>
                  <button id="btn-create-task-confirm" type="submit" disabled={creatingTask} className="btn btn-primary">
                    {creatingTask ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}>
          <div className="modal-box animate-scale-in" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 className="font-display" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Project Settings
              </h2>
              <button onClick={() => setShowSettings(false)} className="btn-icon"><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Members section */}
              <div>
                <span className="field-label" style={{ marginBottom: '8px' }}>
                  Team Members ({project.members?.length || 0})
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {project.members?.map((m) => (
                    <div
                      key={m._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        background: 'var(--color-surface-2)',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          className="avatar"
                          style={{ width: '24px', height: '24px', fontSize: '10px', ...getAvatarStyle(m.name) }}
                        >
                          {getInitials(m.name)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'var(--color-text-primary)', fontWeight: 600, lineHeight: 1.2 }}>{m.name}</span>
                          {m.email && <span style={{ color: 'var(--color-text-tertiary)', fontSize: '10px' }}>{m.email}</span>}
                        </div>
                        {String(m._id) === String(ownerId) && (
                          <span className="badge badge-accent" style={{ fontSize: '10px', marginLeft: '4px' }}>Owner</span>
                        )}
                      </div>

                      {isOwner && String(m._id) !== String(ownerId) && (
                        <button
                          onClick={() => handleRemoveMember(m._id)}
                          className="btn-icon"
                          title="Remove member"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add member form */}
                {isOwner ? (
                  <div>
                    <span className="field-label" style={{ marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Add New Member
                    </span>
                    <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="email"
                        required
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        placeholder="Colleague email..."
                        className="input"
                        style={{ fontSize: '12px', flex: 1 }}
                      />
                      <button type="submit" disabled={addingMember} className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}>
                        <UserPlus size={13} />
                        {addingMember ? 'Adding...' : 'Add'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    Only the project owner can invite or remove members.
                  </p>
                )}
                {memberError && <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--color-danger)' }}>{memberError}</p>}
              </div>

              {/* Danger Zone */}
              {isOwner && (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
                  <span className="field-label" style={{ color: 'var(--color-danger)', marginBottom: '8px' }}>
                    Danger Zone
                  </span>
                  <button
                    onClick={handleDeleteProject}
                    className="btn btn-danger"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Trash2 size={14} />
                    Delete Project
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
