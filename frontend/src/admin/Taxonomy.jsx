import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Seo from '../components/Seo';

export default function Taxonomy() {
  const [categories, setCategories] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newTech, setNewTech] = useState({ name: '', category: '' });
  const [error, setError] = useState('');

  const loadCategories = () => api.get('/categories').then(setCategories).catch(() => {});
  const loadTech = () => api.get('/technologies').then(setTechnologies).catch(() => {});

  useEffect(() => {
    loadCategories();
    loadTech();
  }, []);

  const addCategory = async (e) => {
    e.preventDefault();
    setError('');
    if (!newCategory.trim()) return;
    try {
      await api.post('/categories', { name: newCategory.trim() });
      setNewCategory('');
      loadCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      loadCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const addTech = async (e) => {
    e.preventDefault();
    setError('');
    if (!newTech.name.trim()) return;
    try {
      await api.post('/technologies', newTech);
      setNewTech({ name: '', category: '' });
      loadTech();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteTech = async (id) => {
    if (!window.confirm('Delete this technology?')) return;
    await api.delete(`/technologies/${id}`);
    loadTech();
  };

  return (
    <div>
      <Seo title="Categories & Technologies" noindex />
      <h1>Categories &amp; Technologies</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-2" style={{ marginTop: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3>Categories</h3>
          <form onSubmit={addCategory} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input placeholder="e.g. SaaS" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <button className="btn" type="submit">Add</button>
          </form>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {categories.map((c) => (
              <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                {c.name}
                <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => deleteCategory(c.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3>Technologies</h3>
          <form onSubmit={addTech} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input placeholder="e.g. Next.js" value={newTech.name} onChange={(e) => setNewTech((t) => ({ ...t, name: e.target.value }))} />
            <input placeholder="Group (optional)" value={newTech.category} onChange={(e) => setNewTech((t) => ({ ...t, category: e.target.value }))} style={{ maxWidth: 140 }} />
            <button className="btn" type="submit">Add</button>
          </form>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {technologies.map((t) => (
              <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                {t.name} {t.category && <span className="muted">({t.category})</span>}
                <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => deleteTech(t.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
