import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Seo from '../components/Seo';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/projects/admin'), api.get('/contact')])
      .then(([p, m]) => {
        setProjects(p);
        setMessages(m);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const published = projects.filter((p) => p.status === 'published').length;
  const drafts = projects.filter((p) => p.status === 'draft').length;
  const archived = projects.filter((p) => p.status === 'archived').length;

  const stats = [
    { label: 'Published projects', value: published },
    { label: 'Drafts', value: drafts },
    { label: 'Archived', value: archived },
    { label: 'Unread-capacity messages', value: messages.length },
  ];

  return (
    <div>
      <Seo title="Admin Dashboard" noindex />
      <h1>Dashboard</h1>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="grid grid-3" style={{ marginBottom: 40 }}>
            {stats.map((s) => (
              <div key={s.label} className="card" style={{ padding: 20 }}>
                <div style={{ fontSize: '2rem', fontFamily: 'var(--font-serif)' }}>{s.value}</div>
                <div className="muted">{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link to="/admin/projects/new" className="btn">+ Add Project</Link>
            <Link to="/admin/projects" className="btn btn-secondary">Manage projects</Link>
            <Link to="/admin/messages" className="btn btn-secondary">View messages</Link>
          </div>
        </>
      )}
    </div>
  );
}
