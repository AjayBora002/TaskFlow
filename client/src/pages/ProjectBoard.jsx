import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Settings, Users, X, UserPlus, Trash2, AlertCircle, Search, Radio } from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../api/axios';
import { socket } from '../api/socket';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import AICommandBar from '../components/AICommandBar';
import AIAuditPanel from '../components/AIAuditPanel';
import AIDigestModal from '../components/AIDigestModal';

const COLUMNS = [
  { id: 'todo', label: 'To Do' },
  { id: 'inprogress', label: 'In Progress' },
  { id: 'inreview', label: 'In Review' },
  { id: 'done', label: 'Done' },
];

const VALID_TRANSITIONS = {
  todo: ['inprogress'],
  inprogress: ['todo', 'inreview'],
  inreview: ['inprogress', 'done'],
  done: ['inreview'],
};

export default function ProjectBoard() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transitonError, setTransitionError] = useState('');
  const [activePresence, setActivePresence] = useState([]);

  // Interactive Search & Priority Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

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

  // Real-time WebSockets & Presence setup
  useEffect(() => {
    if (!projectId) return;

    socket.connect();
    socket.emit('join_project', { projectId, user });

    socket.on('presence_update', (users) => {
      // De-duplicate presence users
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

  // Filter tasks dynamically
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
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#8A9054', '#5F8F67', '#C49147', '#3B82F6'],
    });
  };

  const onDragEnd = async (result) => {
    setTransitionError('');
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const task = tasks.find((t) => t._id === draggableId);
    if (!task) return;

    const newStatus = destination.droppableId;
    const oldStatus = source.droppableId;

    // Client-side transition guard
    if (newStatus !== oldStatus) {
      const allowed = VALID_TRANSITIONS[oldStatus] || [];
      if (!allowed.includes(newStatus)) {
        const statusLabel = (s) => COLUMNS.find((c) => c.id === s)?.label || s;
        setTransitionError(`Cannot jump task from "${statusLabel(oldStatus)}" to "${statusLabel(newStatus)}". Tasks must advance step-by-step.`);
        return;
      }

      if (newStatus === 'done') {
        triggerCelebration();
      }
    }

    // Optimistic update
    const columnTasks = getColumnTasks(newStatus).filter((t) => t._id !== draggableId);
    columnTasks.splice(destination.index, 0, { ...task, status: newStatus });

    const updatedTasks = tasks.map((t) => {
      if (t._id === draggableId) return { ...t, status: newStatus };
      return t;
    });
    setTasks(updatedTasks);

    // Broadcast move event over socket to other connected clients
    socket.emit('task_moved', { projectId, task: { _id: draggableId, status: newStatus } });

    const taskOrders = columnTasks.map((t, idx) => ({
      id: t._id,
      order: idx,
      status: newStatus,
    }));

    try {
      await api.put(`/projects/${projectId}/tasks/reorder`, { taskOrders });
    } catch (err) {
      setTasks(tasks); // Revert on error
      setTransitionError('Failed to save task position on server');
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
      
      // Broadcast task created over WebSocket
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
          background: '#F4F1EA',
          borderBottom: '1px solid #E2DCD0',
          flexShrink: 0,
          gap: '12px',
        }}
      >
        {/* Project Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: project.color || '#8A9054',
              flexShrink: 0,
            }}
          />
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-serif)', color: '#2C2923' }}>
            {project.name}
          </h1>
        </div>

        {/* Live WebSocket Presence Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: '#EDE8DE',
            borderRadius: '20px',
            border: '1px solid #E2DCD0',
          }}
          title="Users currently viewing this board live"
        >
          <span style={{ position: 'relative', display: 'flex', width: '8px', height: '8px' }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#5F8F67', opacity: 0.75, animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
            <span style={{ position: 'relative', width: '8px', height: '8px', borderRadius: '50%', background: '#5F8F67' }} />
          </span>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#6B6557' }}>
            LIVE ({activePresence.length || 1})
          </span>
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
            {activePresence.map((u, i) => (
              <div
                key={i}
                className="avatar avatar-accent"
                style={{
                  width: '20px',
                  height: '20px',
                  fontSize: '8px',
                  marginLeft: i > 0 ? '-6px' : '0',
                  boxShadow: '0 0 0 2px #EDE8DE',
                }}
                title={`Live: ${u.name || u.email || 'Team member'}`}
              >
                {getInitials(u.name || u.email)}
              </div>
            ))}
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
              style={{ paddingLeft: '28px', paddingRight: '10px', height: '32px', fontSize: '12px' }}
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input"
            style={{ width: '115px', height: '32px', fontSize: '12px', padding: '0 8px' }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AICommandBar
            projectId={projectId}
            onTaskCreated={(createdTask) => {
              setTasks((prev) => [...prev, createdTask]);
              socket.emit('task_created', { projectId, task: createdTask });
            }}
          />
          <AIDigestModal projectId={projectId} projectName={project.name} />
          <button
            id="btn-new-task"
            onClick={() => { setNewTaskStatus('todo'); setShowNewTask(true); }}
            className="btn btn-primary"
          >
            <Plus size={15} />
            New Task
          </button>
          <button
            id="btn-project-settings"
            onClick={() => setShowSettings(true)}
            className="btn btn-ghost"
            title="Project Settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* Transition Guard Error Banner */}
      {transitonError && (
        <div
          style={{
            margin: '12px 24px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: 'var(--color-danger-subtle)',
            border: '1px solid rgba(192, 88, 79, 0.3)',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            color: 'var(--color-danger)',
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0 }}>{transitonError}</span>
          <button onClick={() => setTransitionError('')} className="btn-icon" style={{ padding: '2px' }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* AI Telemetry Audit Collapsible Panel */}
      <div style={{ padding: '12px 24px 0' }}>
        <AIAuditPanel projectId={projectId} />
      </div>

      {/* Kanban Drag and Drop Columns */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: '16px',
            padding: '16px 24px 24px',
            overflowX: 'auto',
            alignItems: 'flex-start',
          }}
        >
          {COLUMNS.map((col) => {
            const colTasks = getColumnTasks(col.id);
            const totalTasks = filteredTasks.length;

            const colMeta = {
              todo:       { color: 'var(--color-status-todo)',       emptyIcon: '○', emptyTitle: 'Backlog is clear', emptyHint: 'New tasks land here. Click + to add one.' },
              inprogress: { color: 'var(--color-status-inprogress)', emptyIcon: '◎', emptyTitle: 'Nothing active', emptyHint: 'Drag a task here when work begins.' },
              inreview:   { color: 'var(--color-status-inreview)',   emptyIcon: '◑', emptyTitle: 'No pending reviews', emptyHint: 'Tasks awaiting approval appear here.' },
              done:       { color: 'var(--color-status-done)',       emptyIcon: '●', emptyTitle: 'No completions yet', emptyHint: 'Finished tasks accumulate here.' },
            };
            const meta = colMeta[col.id];

            return (
              <div
                key={col.id}
                style={{
                  flex: '0 0 282px',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '100%',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s ease',
                }}
              >
                {/* Colored top accent bar */}
                <div style={{ height: '3px', background: meta.color, flexShrink: 0 }} />

                {/* Column header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px 8px',
                    borderBottom: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--color-text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {col.label}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        color: meta.color,
                        background: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
                        padding: '1px 5px',
                        borderRadius: '2px',
                        minWidth: '18px',
                        textAlign: 'center',
                      }}
                    >
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => { setNewTaskStatus(col.id); setShowNewTask(true); }}
                    className="btn-icon"
                    title={`Add task to ${col.label}`}
                    style={{ opacity: 0.6, transition: 'opacity 0.12s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.6)}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Droppable cards area */}
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
                        minHeight: '180px',
                        background: snapshot.isDraggingOver
                          ? `color-mix(in srgb, ${meta.color} 5%, transparent)`
                          : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '32px 16px',
                            gap: '8px',
                            border: '1px dashed var(--color-border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            marginTop: '2px',
                          }}
                        >
                          <span style={{ fontSize: '22px', color: meta.color, opacity: 0.4, lineHeight: 1 }}>
                            {meta.emptyIcon}
                          </span>
                          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                            {meta.emptyTitle}
                          </span>
                          <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
                            {meta.emptyHint}
                          </span>
                        </div>
                      )}

                      {colTasks.map((task, index) => (
                        <Draggable key={task._id} draggableId={task._id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <TaskCard
                                task={task}
                                projectId={projectId}
                                isDragging={snapshot.isDragging}
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
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
                New Task ({COLUMNS.find((c) => c.id === newTaskStatus)?.label})
              </h2>
              <button onClick={() => setShowNewTask(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label htmlFor="task-title" className="field-label">Title</label>
                  <input
                    id="task-title"
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))}
                    placeholder="e.g. Implement user authentication flow"
                    className="input"
                  />
                </div>

                <div>
                  <label htmlFor="task-description" className="field-label">Description</label>
                  <textarea
                    id="task-description"
                    rows={3}
                    value={newTask.description}
                    onChange={(e) => setNewTask((t) => ({ ...t, description: e.target.value }))}
                    placeholder="Provide details or criteria..."
                    className="input"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label htmlFor="task-priority" className="field-label">Priority</label>
                    <select
                      id="task-priority"
                      value={newTask.priority}
                      onChange={(e) => setNewTask((t) => ({ ...t, priority: e.target.value }))}
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
                      onChange={(e) => setNewTask((t) => ({ ...t, assignee: e.target.value }))}
                      className="input"
                    >
                      <option value="">Unassigned</option>
                      {project.members?.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="task-due-date" className="field-label">Due Date</label>
                  <input
                    id="task-due-date"
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask((t) => ({ ...t, dueDate: e.target.value }))}
                    className="input"
                  />
                </div>

                {taskError && (
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-danger)' }}>{taskError}</p>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowNewTask(false)}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-create-task-submit"
                    type="submit"
                    disabled={creatingTask}
                    className="btn btn-primary"
                  >
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
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
                Project Settings
              </h2>
              <button onClick={() => setShowSettings(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Member management */}
              <div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700 }}>
                  Team Members ({project.members?.length || 0})
                </h3>

                <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="email"
                    required
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="teammate@organization.com"
                    className="input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    disabled={addingMember}
                    className="btn btn-ghost"
                  >
                    <UserPlus size={14} />
                    Add
                  </button>
                </form>

                {memberError && (
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--color-danger)' }}>
                    {memberError}
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                  {project.members?.map((m) => (
                    <div
                      key={m._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: '#EDE8DE',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="avatar avatar-accent" style={{ width: '22px', height: '22px', fontSize: '8.5px' }}>
                          {getInitials(m.name)}
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{m.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                            ({m.email})
                          </span>
                        </div>
                      </div>

                      {project.owner?._id === user?.id && m._id !== user?.id && (
                        <button
                          onClick={() => handleRemoveMember(m._id)}
                          className="btn-icon"
                          title="Remove member"
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger zone */}
              {project.owner?._id === user?.id && (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: 'var(--color-danger)' }}>
                    Danger Zone
                  </h3>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Deleting this project will permanently remove all associated tasks and data.
                  </p>
                  <button onClick={handleDeleteProject} className="btn btn-danger">
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
