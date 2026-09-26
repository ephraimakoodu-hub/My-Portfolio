import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Seo from '../components/Seo';

const empty = { organization: '', role: '', start_date: '', end_date: '', description: '' };

export default function Experience() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/experience').then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.organization.trim() || !form.role.trim()) return;
    try {
      if (editingId) {
        await api.put(`/experience/${editingId}`, form);
      } else {
        await api.post('/experience', form);
      }
      setForm(empty);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const edit = (item) => {
    setEditingId(item.id);
    setForm({ organization: item.organization, role: item.role, start_date: item.start_date, end_date: item.end_date, description: item.description });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    await api.delete(`/experience/${id}`);
    load();
  };

  return (
    <div>
      <Seo title="Experience" noindex />
      <h1>Experience</h1>
      <p className="muted">Shown on your About page. Leave end date blank for a current role.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 560, marginBottom: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label htmlFor="org">Organization</label>
            <input id="org" value={form.organization} onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor="role">Role</label>
            <input id="role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor="start">Start date</label>
            <input id="start" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} placeholder="e.g. 2023" />
          </div>
          <div className="field">
            <label htmlFor="end">End date</label>
            <input id="end" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} placeholder="Leave blank if current" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="desc">Description</label>
          <textarea id="desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" type="submit">{editingId ? 'Update' : 'Add entry'}</button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setForm(empty); }}>Cancel</button>
          )}
        </div>
      </form>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Organization</th><th>Role</th><th>Dates</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.organization}</td>
                <td>{item.role}</td>
                <td>{item.start_date} {item.end_date ? `— ${item.end_date}` : '— Present'}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => edit(item)}>Edit</button>
                  <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => remove(item.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
