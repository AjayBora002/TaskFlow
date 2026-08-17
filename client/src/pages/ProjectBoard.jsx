import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Settings, Users, X, UserPlus, Trash2, AlertCircle, Sparkles, Search, Filter, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../api/axios';
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
      colors: ['#2EA043', '#3FB950', '#388BFD', '#D29922'],
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

      // Celebrate when moving to Done!
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

    const taskOrders = columnTasks.map((t, idx) => ({
      id: t._id,
      order: idx,
      status: newStatus,
    }));

    try {
      await api.put(`/projects/${projectId}/tasks/reorder`, { taskOrders });
    } catch (err) {
      setTasks(tasks);
      setTransitionError(err.response?.data?.message || 'Failed to update task position');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setTaskError('');
    setCreatingTask(true);
    try {
      const payload = {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        status: newTaskStatus,
        assignee: newTask.assignee || undefined,
        dueDate: newTask.dueDate || undefined,
      };
      const res = await api.post(`/projects/${projectId}/tasks`, payload);
      setTasks((prev) => [...prev, res.data]);
      setNewTask({ title: '', description: '', priority: 'medium', assignee: '', dueDate: '' });
      setShowNewTask(false);

      if (newTaskStatus === 'done') triggerCelebration();
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

  const handleRemoveMember = async (memberId) => {
    try {
      const res = await api.delete(`/projects/${projectId}/members/${memberId}`);
      setProject(res.data);
    } catch (err) {
      console.error('Remove member error:', err);
    }
  };

  const isOwner = project && String(project.owner?._id) === String(user?._id);

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', gap: '16px' }} className="ambient-bg">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ flex: 1, height: '400px', borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
    );
  }

  if (!project) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} className="ambient-bg animate-slide-up">
      {/* Board Header Bar */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 24px',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        {/* Project Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: project.color || 'var(--color-accent-bright)',
              boxShadow: `0 0 12px ${project.color || 'var(--color-accent-bright)'}`,
              flexShrink: 0,
            }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              {project.name}
            </h1>
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
            style={{ width: '110px', height: '30px', fontSize: '12px', padding: '0 8px' }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AICommandBar projectId={projectId} onTaskCreated={(newTask) => setTasks((prev) => [...prev, newTask])} />
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

      {/* Transition Alert */}
      {transitonError && (
        <div
          className="animate-slide-up"
          style={{
            margin: '12px 24px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: 'var(--color-danger-subtle)',
            border: '1px solid rgba(248, 81, 73, 0.3)',
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
            const colProgress = totalTasks > 0 ? Math.round((colTasks.length / totalTasks) * 100) : 0;

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
                {/* Colored top accent bar — the only color on the column */}
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
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
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
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowNewTask(false); }}>
          <div className="modal-box animate-scale-up" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Create New Task
              </h2>
              <button onClick={() => setShowNewTask(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="field-label">Title *</label>
                  <input
                    id="task-title-input"
                    type="text"
                    required
                    autoFocus
                    value={newTask.title}
                    onChange={(e) => setNewTask((f) => ({ ...f, title: e.target.value }))}
                    className="input"
                    placeholder="Task summary or feature title..."
                  />
                </div>
                <div>
                  <label className="field-label">Description</label>
                  <textarea
                    id="task-desc-input"
                    rows={3}
                    value={newTask.description}
                    onChange={(e) => setNewTask((f) => ({ ...f, description: e.target.value }))}
                    className="input"
                    style={{ resize: 'vertical', lineHeight: 1.5 }}
                    placeholder="Technical specifications or task details..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="field-label">Status</label>
                    <select
                      id="task-status-select"
                      value={newTaskStatus}
                      onChange={(e) => setNewTaskStatus(e.target.value)}
                      className="input"
                    >
                      {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="field-label">Priority</label>
                    <select
                      id="task-priority-select"
                      value={newTask.priority}
                      onChange={(e) => setNewTask((f) => ({ ...f, priority: e.target.value }))}
                      className="input"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="field-label">Assignee</label>
                    <select
                      id="task-assignee-select"
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
                  <div style={{ flex: 1 }}>
                    <label className="field-label">Due Date</label>
                    <input
                      id="task-due-input"
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask((f) => ({ ...f, dueDate: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>
                {taskError && (
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-danger)' }}>{taskError}</p>
                )}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button type="button" onClick={() => setShowNewTask(false)} className="btn btn-ghost">Cancel</button>
                  <button id="btn-create-task-confirm" type="submit" disabled={creatingTask} className="btn btn-primary">
                    {creatingTask ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}>
          <div className="modal-box animate-scale-up" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Project Settings
              </h2>
              <button onClick={() => setShowSettings(false)} className="btn-icon"><X size={18} /></button>
            </div>

            {/* Members section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span className="field-label" style={{ margin: 0 }}>Team Members ({project.members?.length ?? 0})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {project.members?.map((m) => (
                  <div
                    key={m._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      background: 'var(--color-surface-2)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div className="avatar avatar-accent" style={{ width: '28px', height: '28px' }}>
                      {m.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{m.email}</div>
                    </div>
                    {String(project.owner?._id) === String(m._id) ? (
                      <span className="badge badge-accent">Owner</span>
                    ) : isOwner ? (
                      <button
                        onClick={() => handleRemoveMember(m._id)}
                        title="Remove member"
                        className="btn-icon"
                      >
                        <Trash2 size={13} style={{ color: 'var(--color-danger)' }} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              {isOwner && (
                <form onSubmit={handleAddMember}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="add-member-email"
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="teammate@organization.com"
                      className="input"
                      style={{ flex: 1 }}
                    />
                    <button
                      id="btn-add-member"
                      type="submit"
                      disabled={addingMember || !memberEmail}
                      className="btn btn-primary"
                    >
                      <UserPlus size={14} />
                      {addingMember ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                  {memberError && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--color-danger)' }}>{memberError}</p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
