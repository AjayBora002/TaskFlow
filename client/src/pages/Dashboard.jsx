import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, AlertTriangle, Users, X, ArrowRight, BarChart3, CheckCircle2, Clock } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = { todo: 'To Do', inprogress: 'In Progress', inreview: 'In Review', done: 'Done' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
      const statsResults = await Promise.allSettled(
        res.data.map((p) => api.get(`/projects/${p._id}/stats`))
      );
      const statsMap = {};
      res.data.forEach((p, i) => {
        if (statsResults[i].status === 'fulfilled') {
          statsMap[p._id] = statsResults[i].value.data;
        }
      });
      setStats(statsMap);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const res = await api.post('/projects', newProject);
      setProjects((prev) => [res.data, ...prev]);
      setNewProject({ name: '', description: '' });
      setShowNewProject(false);
      navigate(`/projects/${res.data._id}`);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px 36px', maxWidth: '1000px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '32px', width: '200px', marginBottom: '24px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="skeleton" style={{ height: '80px', width: '100%' }} />
          <div className="skeleton" style={{ height: '80px', width: '100%' }} />
        </div>
      </div>
    );
  }

  // Aggregate global team stats
  const totalProjects = projects.length;
  let totalTasks = 0;
  let totalOverdue = 0;
  let totalDone = 0;

  Object.values(stats).forEach((s) => {
    totalTasks += s.totalTasks || 0;
    totalOverdue += s.overdueCount || 0;
    totalDone += s.tasksByStatus?.done || 0;
  });

  return (
    <div style={{ padding: '32px 36px', maxWidth: '1000px', margin: '0 auto' }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            Team Workspace
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Overview of active projects, workloads, and overall progress.
          </p>
        </div>
        <button
          id="btn-new-project"
          onClick={() => setShowNewProject(true)}
          className="btn btn-primary"
        >
          <Plus size={15} />
          New Project
        </button>
      </div>

      {/* Global Summary Stats */}
      {totalProjects > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '28px',
          }}
        >
          <div
            className="card"
            style={{ padding: '16px 20px', background: 'var(--color-surface)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
              <FolderOpen size={15} />
              <span className="field-label" style={{ margin: 0 }}>Active Projects</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
              {totalProjects}
            </div>
          </div>

          <div
            className="card"
            style={{ padding: '16px 20px', background: 'var(--color-surface)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
              <BarChart3 size={15} />
              <span className="field-label" style={{ margin: 0 }}>Total Tasks</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
              {totalTasks}
            </div>
          </div>

          <div
            className="card"
            style={{ padding: '16px 20px', background: 'var(--color-surface)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
              <CheckCircle2 size={15} style={{ color: 'var(--color-status-done)' }} />
              <span className="field-label" style={{ margin: 0 }}>Completed</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-status-done)' }}>
              {totalDone}
            </div>
          </div>

          <div
            className="card"
            style={{ padding: '16px 20px', background: 'var(--color-surface)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
              <Clock size={15} style={{ color: totalOverdue > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }} />
              <span className="field-label" style={{ margin: 0 }}>Overdue</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: totalOverdue > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
              {totalOverdue}
            </div>
          </div>
        </div>
      )}

      {/* Projects List */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Projects ({projects.length})
        </h2>
      </div>

      {projects.length === 0 ? (
        <div
          style={{
            padding: '56px 24px',
            textAlign: 'center',
            background: 'var(--color-surface)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <FolderOpen size={36} style={{ color: 'var(--color-text-muted)', margin: '0 auto 14px', display: 'block', opacity: 0.4 }} />
          <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            No projects in workspace
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '360px', marginLeft: 'auto', marginRight: 'auto' }}>
            Get started by creating a project for your team. You can organize tasks into Kanban workflows and add teammates.
          </p>
          <button
            onClick={() => setShowNewProject(true)}
            className="btn btn-primary"
          >
            <Plus size={14} />
            Create your first project
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {projects.map((project) => {
            const s = stats[project._id];
            const total = s?.totalTasks ?? 0;
            const done = s?.tasksByStatus?.done ?? 0;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <Link
                key={project._id}
                to={`/projects/${project._id}`}
                id={`project-card-${project._id}`}
                className="card interactive"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  padding: '16px 20px',
                  textDecoration: 'none',
                }}
              >
                {/* Accent stripe indicator */}
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: project.color || 'var(--color-accent)',
                    boxShadow: `0 0 8px ${project.color || 'var(--color-accent)'}`,
                    flexShrink: 0,
                  }}
                />

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
                      {project.name}
                    </span>
                    {s?.overdueCount > 0 && (
                      <span
                        className="badge"
                        style={{ background: 'var(--color-danger-subtle)', color: 'var(--color-danger)', border: '1px solid rgba(224, 82, 82, 0.2)' }}
                      >
                        <AlertTriangle size={11} />
                        {s.overdueCount} overdue
                      </span>
                    )}
                  </div>

                  {project.description && (
                    <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.description}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '280px' }}>
                    <div className="progress-track" style={{ flex: 1 }}>
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', width: '32px' }}>
                      {progress}%
                    </span>
                  </div>
                </div>

                {/* Status breakdown pills */}
                <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                  {['todo', 'inprogress', 'inreview', 'done'].map((status) => (
                    <div key={status} style={{ textAlign: 'center', minWidth: '42px' }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          color: s?.tasksByStatus?.[status] > 0 ? `var(--color-status-${status})` : 'var(--color-text-muted)',
                        }}
                      >
                        {s?.tasksByStatus?.[status] ?? '0'}
                      </div>
                      <div style={{ fontSize: '9.5px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>
                        {STATUS_LABELS[status].split(' ')[0]}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Members */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--color-text-muted)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                    paddingLeft: '8px',
                    borderLeft: '1px solid var(--color-border)',
                  }}
                >
                  <Users size={14} />
                  {project.members?.length ?? 0}
                </div>

                <ArrowRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      )}

      {/* New Project Modal */}
      {showNewProject && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowNewProject(false); }}>
          <div className="modal-box animate-scale-in" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Create New Project
              </h2>
              <button onClick={() => setShowNewProject(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label htmlFor="proj-name" className="field-label">Project Name *</label>
                  <input
                    id="proj-name"
                    type="text"
                    required
                    value={newProject.name}
                    onChange={(e) => setNewProject((f) => ({ ...f, name: e.target.value }))}
                    className="input"
                    placeholder="e.g. Core Engine V2"
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="proj-desc" className="field-label">Description</label>
                  <textarea
                    id="proj-desc"
                    rows={3}
                    value={newProject.description}
                    onChange={(e) => setNewProject((f) => ({ ...f, description: e.target.value }))}
                    className="input"
                    style={{ resize: 'vertical', lineHeight: 1.5 }}
                    placeholder="Brief description of project goals and scope…"
                  />
                </div>
                {createError && (
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-danger)' }}>{createError}</p>
                )}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button type="button" onClick={() => setShowNewProject(false)} className="btn btn-ghost">
                    Cancel
                  </button>
                  <button id="btn-create-project-confirm" type="submit" disabled={creating} className="btn btn-primary">
                    {creating ? 'Creating…' : 'Create Project'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
