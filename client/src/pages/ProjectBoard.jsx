import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Settings, Users, X, UserPlus, Trash2, AlertCircle, Sparkles, Filter } from 'lucide-react';
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

  const getColumnTasks = (status) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order);

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
      <div style={{ padding: '24px', display: 'flex', gap: '16px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ flex: 1, height: '400px', borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
    );
  }

  if (!project) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }} className="board-bg">
      {/* Board Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '14px 24px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: project.color || 'var(--color-accent)',
              boxShadow: `0 0 10px ${project.color || 'var(--color-accent)'}`,
              flexShrink: 0,
            }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              {project.name}
            </h1>
            {project.description && (
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Transition Error Alert Banner */}
        {transitonError && (
          <div
            className="animate-fade-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'var(--color-danger-subtle)',
              border: '1px solid rgba(224, 82, 82, 0.3)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              color: 'var(--color-danger)',
              maxWidth: '440px',
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>{transitonError}</span>
            <button onClick={() => setTransitionError('')} className="btn-icon" style={{ padding: '2px' }}>
              <X size={12} />
            </button>
          </div>
        )}

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
            Settings
          </button>
        </div>
      </div>

      {/* AI Telemetry Audit Panel */}
      <div style={{ padding: '0 24px' }}>
        <AIAuditPanel projectId={projectId} />
      </div>

      {/* Kanban Drag and Drop Columns */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: '16px',
            padding: '20px 24px',
            overflowX: 'auto',
            alignItems: 'flex-start',
          }}
        >
          {COLUMNS.map((col) => {
            const colTasks = getColumnTasks(col.id);
            return (
              <div
                key={col.id}
                style={{
                  flex: '0 0 280px',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '100%',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-sm)',
                  overflow: 'hidden',
                }}
              >
                {/* Column header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: `var(--color-status-${col.id})`,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {col.label}
                    </span>
                    <span className="badge badge-muted">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => { setNewTaskStatus(col.id); setShowNewTask(true); }}
                    className="btn-icon"
                    title={`Add task to ${col.label}`}
                  >
                    <Plus size={15} />
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
                          ? 'var(--color-accent-subtle)'
                          : 'transparent',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div
                          style={{
                            padding: '24px 12px',
                            textAlign: 'center',
                            fontSize: '12px',
                            color: 'var(--color-text-muted)',
                            border: '1px dashed var(--color-border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            marginTop: '4px',
                          }}
                        >
                          {col.id === 'todo' && 'No tasks queued yet.'}
                          {col.id === 'inprogress' && 'No work in progress.'}
                          {col.id === 'inreview' && 'No tasks under review.'}
                          {col.id === 'done' && 'No tasks completed.'}
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
          <div className="modal-box animate-scale-in" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                New Task
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
                    placeholder="Task summary or requirement..."
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
                    placeholder="Add details, criteria, or context..."
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
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
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
          <div className="modal-box animate-scale-in" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
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
