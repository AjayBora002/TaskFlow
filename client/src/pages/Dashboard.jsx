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
      <div style={{ padding: '28px 36px', maxWidth: '1000px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '32px', width: '200px', marginBottom: '24px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="skeleton" style={{ height: '80px', width: '100%' }} />
          <div className="skeleton" style={{ height: '80px', width: '100%' }} />
        </div>
      </div>
    );
  }

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
    <div style={{ padding: '28px 36px', maxWidth: '1000px', margin: '0 auto' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1
            className="font-display"
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.025em',
            }}
          >
            Workspace Overview
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Track project metrics, active workloads, and team progress.
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

      {/* Global Stat Cards with Elevation & High Contrast Typography */}
      {totalProjects > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '28px',
          }}
        >
          <div className="card" style={{ padding: '16px 20px', background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              <FolderOpen size={15} style={{ color: 'var(--color-accent)' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                Active Projects
              </span>
            </div>
            <div className="font-display" style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.03em' }}>
              {totalProjects}
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              <BarChart3 size={15} style={{ color: '#2563EB' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                Total Tasks
              </span>
            </div>
            <div className="font-display" style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.03em' }}>
              {totalTasks}
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-status-done)', marginBottom: '8px' }}>
              <CheckCircle2 size={15} style={{ color: 'var(--color-status-done)' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                Completed
              </span>
            </div>
            <div className="font-display" style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-status-done)', letterSpacing: '-0.03em' }}>
              {totalDone}
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: totalOverdue > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)', marginBottom: '8px' }}>
              <Clock size={15} style={{ color: totalOverdue > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                Overdue
              </span>
            </div>
            <div className="font-display" style={{ fontSize: '26px', fontWeight: 800, color: totalOverdue > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)', letterSpacing: '-0.03em' }}>
              {totalOverdue}
            </div>
          </div>
        </div>
      )}

      {/* Projects Section Header */}
      <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="font-display" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Projects ({projects.length})
        </h2>
      </div>

      {projects.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'var(--color-surface)',
            border: '1px border var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--color-surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              color: 'var(--color-text-muted)',
            }}
          >
            <FolderOpen size={24} />
          </div>
          <h3 className="font-display" style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            No projects in workspace
          </h3>
          <p style={{ margin: '0 0 18px', fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '340px', marginLeft: 'auto', marginRight: 'auto' }}>
            Get started by creating a project for your team to organize Kanban workflows.
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
                  gap: '18px',
                  padding: '16px 20px',
                  textDecoration: 'none',
                }}
              >
                {/* Project Color Badge */}
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

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span className="font-display" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
                      {project.name}
                    </span>
                    {s?.overdueCount > 0 && (
                      <span
                        className="badge"
                        style={{ background: 'var(--color-danger-subtle)', color: 'var(--color-danger)' }}
                      >
                        <AlertTriangle size={11} />
                        {s.overdueCount} overdue
                      </span>
                    )}
                  </div>

                  {project.description && (
                    <p style={{ margin: '0 0 8px', fontSize: '12.5px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.description}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '280px' }}>
                    <div className="progress-track" style={{ flex: 1 }}>
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', width: '32px' }}>
                      {progress}%
                    </span>
                  </div>
                </div>

                {/* Status breakdown pills */}
                <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                  {['todo', 'inprogress', 'inreview', 'done'].map((status) => (
                    <div key={status} style={{ textAlign: 'center', minWidth: '40px' }}>
                      <div
                        className="font-display"
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: s?.tasksByStatus?.[status] > 0 ? `var(--color-status-${status})` : 'var(--color-text-muted)',
                        }}
                      >
                        {s?.tasksByStatus?.[status] ?? '0'}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>
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
                    color: 'var(--color-text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    flexShrink: 0,
                    paddingLeft: '12px',
                    borderLeft: '1px solid var(--color-border)',
                  }}
                >
                  <Users size={14} style={{ color: 'var(--color-text-muted)' }} />
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 className="font-display" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Create New Project
              </h2>
              <button onClick={() => setShowNewProject(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                    placeholder="Brief description of project scope..."
                  />
                </div>
                {createError && (
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-danger)' }}>{createError}</p>
                )}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button type="button" onClick={() => setShowNewProject(false)} className="btn btn-ghost">
                    Cancel
                  </button>
                  <button id="btn-create-project-confirm" type="submit" disabled={creating} className="btn btn-primary">
                    {creating ? 'Creating...' : 'Create Project'}
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
