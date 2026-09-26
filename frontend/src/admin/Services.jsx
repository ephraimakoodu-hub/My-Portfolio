import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Seo from '../components/Seo';

const empty = { title: '', description: '', active: true };

export default function Services() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/services?all=true').then(setServices).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) return;
    try {
      if (editingId) {
        await api.put(`/services/${editingId}`, form);
      } else {
        await api.post('/services', form);
      }
      setForm(empty);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const edit = (s) => {
    setEditingId(s.id);
    setForm({ title: s.title, description: s.description, active: Boolean(s.active) });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    await api.delete(`/services/${id}`);
    load();
  };

  return (
    <div>
      <Seo title="Services" noindex />
      <h1>Services</h1>
      <p className="muted">These appear in the "What I do" section on your homepage.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 500, marginBottom: 32 }}>
        <div className="field">
          <label htmlFor="service-title">Title</label>
          <input id="service-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="service-desc">Description</label>
          <textarea id="service-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="field">
          <label>
            <input type="checkbox" style={{ width: 'auto', marginRight: 8 }} checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            Visible on public site
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" type="submit">{editingId ? 'Update' : 'Add service'}</button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setForm(empty); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Title</th><th>Visible</th><th>Actions</th></tr></thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td>{s.title}</td>
                <td>{s.active ? 'Yes' : 'No'}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => edit(s)}>Edit</button>
                  <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => remove(s.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
