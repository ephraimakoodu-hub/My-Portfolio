import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Seo from '../components/Seo';

const STATUS_LABEL = { draft: 'Draft', published: 'Published', archived: 'Archived' };

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ status: '', category_id: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.category_id) params.set('category_id', filters.category_id);
    if (filters.search) params.set('search', filters.search);
    api
      .get(`/projects/admin?${params.toString()}`)
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const setStatus = async (id, status) => {
    await api.patch(`/projects/admin/${id}/status`, { status });
    load();
  };

  const remove = async (id, permanent) => {
    const msg = permanent
      ? 'Permanently delete this project and its images? This cannot be undone.'
      : 'Archive this project? It will be hidden from the public site but kept for later.';
    if (!window.confirm(msg)) return;
    await api.delete(`/projects/admin/${id}${permanent ? '?permanent=true' : ''}`);
    load();
  };

  const move = async (index, direction) => {
    const next = [...projects];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setProjects(next);
    await api.put('/projects/admin/reorder', { order: next.map((p) => p.id) });
  };

  return (
    <div>
      <Seo title="Manage Projects" noindex />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Projects</h1>
        <Link to="/admin/projects/new" className="btn">+ Add Project</Link>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          placeholder="Search by title…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          style={{ maxWidth: 240 }}
        />
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} style={{ maxWidth: 180 }}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select value={filters.category_id} onChange={(e) => setFilters((f) => ({ ...f, category_id: e.target.value }))} style={{ maxWidth: 200 }}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="muted">No projects match these filters.</p>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Project</th>
                <th>Category</th>
                <th>Status</th>
                <th>Featured</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button className="btn btn-secondary" style={{ padding: '2px 8px' }} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${p.title} up`}>↑</button>
                      <button className="btn btn-secondary" style={{ padding: '2px 8px' }} onClick={() => move(i, 1)} disabled={i === projects.length - 1} aria-label={`Move ${p.title} down`}>↓</button>
                    </div>
                  </td>
                  <td>{p.title}{p.featured ? ' ★' : ''}</td>
                  <td>{p.category?.name || '—'}</td>
                  <td><span className={`badge badge-${p.status}`}>{STATUS_LABEL[p.status]}</span></td>
                  <td>{p.featured ? 'Yes' : 'No'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Link className="btn btn-secondary" style={{ padding: '6px 10px' }} to={`/admin/projects/${p.id}/edit`}>Edit</Link>
                      {p.status === 'published' && (
                        <a className="btn btn-secondary" style={{ padding: '6px 10px' }} href={`/projects/${p.slug}`} target="_blank" rel="noreferrer">Preview</a>
                      )}
                      {p.status !== 'published' && (
                        <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => setStatus(p.id, 'published')}>Publish</button>
                      )}
                      {p.status === 'published' && (
                        <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => setStatus(p.id, 'draft')}>Unpublish</button>
                      )}
                      {p.status !== 'archived' && (
                        <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => remove(p.id, false)}>Archive</button>
                      )}
                      <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => remove(p.id, true)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
