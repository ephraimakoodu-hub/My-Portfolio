import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, uploadUrl } from '../api/client';
import Seo from '../components/Seo';

const STATUS_OPTIONS = ['draft', 'published', 'archived'];
const TABS = ['Basic Info', 'Description', 'Technology', 'Features', 'Links', 'Images', 'SEO'];

const emptyForm = {
  title: '',
  short_description: '',
  full_description: '',
  category_id: '',
  status: 'draft',
  featured: false,
  project_url: '',
  github_url: '',
  case_study_url: '',
  project_date: '',
  client_type: '',
  challenges: '',
  solution: '',
  results: '',
  seo_title: '',
  seo_description: '',
  technology_ids: [],
  features: [''],
};

export default function ProjectForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [projectId, setProjectId] = useState(id || null);
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [tab, setTab] = useState('Basic Info');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api.get('/categories').then(setCategories).catch(() => {});
    api.get('/technologies').then(setTechnologies).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/projects/admin/${id}`).then((p) => {
      setForm({
        title: p.title,
        short_description: p.short_description || '',
        full_description: p.full_description || '',
        category_id: p.category_id || '',
        status: p.status,
        featured: Boolean(p.featured),
        project_url: p.project_url || '',
        github_url: p.github_url || '',
        case_study_url: p.case_study_url || '',
        project_date: p.project_date || '',
        client_type: p.client_type || '',
        challenges: p.challenges || '',
        solution: p.solution || '',
        results: p.results || '',
        seo_title: p.seo_title || '',
        seo_description: p.seo_description || '',
        technology_ids: p.technologies.map((t) => t.id),
        features: p.features.length ? p.features.map((f) => f.feature_text) : [''],
      });
      setImages(p.images);
      setProjectId(p.id);
    });
  }, [id, isEdit]);

  // Warn before leaving the tab with unsaved changes.
  useEffect(() => {
    const handler = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  };

  const toggleTechnology = (techId) => {
    setForm((f) => {
      const has = f.technology_ids.includes(techId);
      return { ...f, technology_ids: has ? f.technology_ids.filter((t) => t !== techId) : [...f.technology_ids, techId] };
    });
    setDirty(true);
  };

  const updateFeature = (idx, value) => {
    setForm((f) => {
      const features = [...f.features];
      features[idx] = value;
      return { ...f, features };
    });
    setDirty(true);
  };

  const addFeature = () => setForm((f) => ({ ...f, features: [...f.features, ''] }));
  const removeFeature = (idx) => setForm((f) => ({ ...f, features: f.features.filter((_, i) => i !== idx) }));

  const save = async (statusOverride) => {
    setError('');
    setSaving(true);
    const payload = {
      ...form,
      category_id: form.category_id || null,
      status: statusOverride || form.status,
      features: form.features.filter((f) => f.trim()),
    };
    try {
      let saved;
      if (projectId) {
        saved = await api.put(`/projects/admin/${projectId}`, payload);
      } else {
        saved = await api.post('/projects/admin', payload);
        setProjectId(saved.id);
        navigate(`/admin/projects/${saved.id}/edit`, { replace: true });
      }
      setForm((f) => ({ ...f, status: saved.status }));
      setDirty(false);
      setNotice(statusOverride === 'published' ? 'Project published.' : 'Saved.');
      setTimeout(() => setNotice(''), 3000);
    } catch (e) {
      setError(e.message || 'Could not save this project.');
    } finally {
      setSaving(false);
    }
  };

  const uploadImages = async (fileList) => {
    if (!projectId) {
      setError('Save the project once (Save Draft) before adding images.');
      return;
    }
    const fd = new FormData();
    Array.from(fileList).forEach((file) => fd.append('images', file));
    setSaving(true);
    try {
      const updated = await api.upload(`/projects/${projectId}/images`, fd);
      setImages(updated);
    } catch (e) {
      setError(e.message || 'One or more images could not be uploaded.');
    } finally {
      setSaving(false);
    }
  };

  const setCover = async (imageId) => {
    await api.put(`/projects/${projectId}/images/${imageId}/cover`);
    setImages((imgs) => imgs.map((i) => ({ ...i, is_cover: i.id === imageId ? 1 : 0 })));
  };

  const updateImageMeta = async (imageId, field, value) => {
    setImages((imgs) => imgs.map((i) => (i.id === imageId ? { ...i, [field]: value } : i)));
  };

  const saveImageMeta = async (image) => {
    await api.patch(`/projects/${projectId}/images/${image.id}`, { alt_text: image.alt_text, caption: image.caption });
  };

  const deleteImage = async (imageId) => {
    if (!window.confirm('Delete this image?')) return;
    await api.delete(`/projects/${projectId}/images/${imageId}`);
    setImages((imgs) => imgs.filter((i) => i.id !== imageId));
  };

  const moveImage = async (index, direction) => {
    const next = [...images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next);
    await api.put(`/projects/${projectId}/images/reorder`, { order: next.map((i) => i.id) });
  };

  const groupedTech = useMemo(() => {
    return technologies.reduce((acc, t) => {
      const key = t.category || 'Other';
      acc[key] = acc[key] || [];
      acc[key].push(t);
      return acc;
    }, {});
  }, [technologies]);

  return (
    <div>
      <Seo title={isEdit ? 'Edit Project' : 'Add Project'} noindex />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>{isEdit ? 'Edit Project' : 'Add Project'}</h1>
        <span className={`badge badge-${form.status}`}>{form.status}</span>
      </div>
      <p className="muted" style={{ marginBottom: 24 }}>
        {projectId ? `Editing project #${projectId}. Changes save when you click Save Draft or Publish.` : 'Fill in the basics, then Save Draft to unlock image uploads.'}
      </p>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}

      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--line)', marginBottom: 28, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="btn btn-secondary"
            style={{
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              borderRadius: 0,
              background: 'transparent',
              padding: '10px 14px',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Basic Info' && (
        <div style={{ maxWidth: 600 }}>
          <div className="field">
            <label htmlFor="title">Project title</label>
            <input id="title" value={form.title} onChange={update('title')} maxLength={150} required />
          </div>
          <div className="field">
            <label htmlFor="short_description">Short description (for project cards)</label>
            <textarea id="short_description" value={form.short_description} onChange={update('short_description')} maxLength={240} style={{ minHeight: 80 }} />
          </div>
          <div className="field">
            <label htmlFor="category_id">Category</label>
            <select id="category_id" value={form.category_id} onChange={update('category_id')}>
              <option value="">Select a category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <p className="hint">Manage categories under Categories &amp; Tech.</p>
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" value={form.status} onChange={update('status')}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>
              <input type="checkbox" style={{ width: 'auto', marginRight: 8 }} checked={form.featured} onChange={update('featured')} />
              Featured project (shown on homepage)
            </label>
          </div>
          <div className="field">
            <label htmlFor="project_date">Project date (optional)</label>
            <input id="project_date" value={form.project_date} onChange={update('project_date')} placeholder="e.g. 2025" />
          </div>
          <div className="field">
            <label htmlFor="client_type">Client / project type (optional)</label>
            <input id="client_type" value={form.client_type} onChange={update('client_type')} />
          </div>
        </div>
      )}

      {tab === 'Description' && (
        <div style={{ maxWidth: 700 }}>
          <div className="field">
            <label htmlFor="full_description">Full description / overview</label>
            <textarea id="full_description" value={form.full_description} onChange={update('full_description')} style={{ minHeight: 160 }} />
          </div>
          <div className="field">
            <label htmlFor="challenges">Problem / challenges (optional)</label>
            <textarea id="challenges" value={form.challenges} onChange={update('challenges')} />
          </div>
          <div className="field">
            <label htmlFor="solution">Solution (optional)</label>
            <textarea id="solution" value={form.solution} onChange={update('solution')} />
          </div>
          <div className="field">
            <label htmlFor="results">Outcome / results (optional — only factual results you can confirm)</label>
            <textarea id="results" value={form.results} onChange={update('results')} />
            <p className="hint">This is shown publicly as-is. Do not include numbers you can't stand behind.</p>
          </div>
        </div>
      )}

      {tab === 'Technology' && (
        <div style={{ maxWidth: 700 }}>
          {Object.keys(groupedTech).length === 0 && <p className="muted">No technologies yet — add some under Categories &amp; Tech.</p>}
          {Object.entries(groupedTech).map(([category, items]) => (
            <div key={category} style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: '0.95rem' }}>{category}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {items.map((t) => {
                  const active = form.technology_ids.includes(t.id);
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => toggleTechnology(t.id)}
                      className="badge"
                      style={{
                        cursor: 'pointer',
                        background: active ? 'var(--ink)' : 'transparent',
                        color: active ? '#fff' : 'var(--ink)',
                        borderColor: active ? 'var(--ink)' : 'var(--line)',
                      }}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Features' && (
        <div style={{ maxWidth: 600 }}>
          {form.features.map((f, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input value={f} onChange={(e) => updateFeature(idx, e.target.value)} placeholder="e.g. Real-time dashboard with role-based access" />
              <button type="button" className="btn btn-secondary" onClick={() => removeFeature(idx)} aria-label="Remove feature">✕</button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary" onClick={addFeature}>+ Add feature</button>
        </div>
      )}

      {tab === 'Links' && (
        <div style={{ maxWidth: 600 }}>
          <div className="field">
            <label htmlFor="project_url">Live project URL (optional)</label>
            <input id="project_url" value={form.project_url} onChange={update('project_url')} placeholder="https://" />
          </div>
          <div className="field">
            <label htmlFor="github_url">GitHub URL (optional)</label>
            <input id="github_url" value={form.github_url} onChange={update('github_url')} placeholder="https://github.com/…" />
          </div>
          <div className="field">
            <label htmlFor="case_study_url">External case study URL (optional)</label>
            <input id="case_study_url" value={form.case_study_url} onChange={update('case_study_url')} placeholder="https://" />
          </div>
        </div>
      )}

      {tab === 'Images' && (
        <div style={{ maxWidth: 800 }}>
          {!projectId ? (
            <p className="muted">Save the project once first (Save Draft below) to unlock image uploads.</p>
          ) : (
            <>
              <div className="field">
                <label htmlFor="image-upload">Upload images (JPEG, PNG or WEBP)</label>
                <input id="image-upload" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => uploadImages(e.target.files)} />
                <p className="hint">Images are validated and re-optimized automatically. Drag from your phone or desktop's file picker.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginTop: 16 }}>
                {images.map((img, idx) => (
                  <div key={img.id} className="card" style={{ padding: 12 }}>
                    <img src={uploadUrl(img.filename)} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 3, marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                      <button className="btn btn-secondary" style={{ flex: 1, padding: '4px 8px' }} onClick={() => moveImage(idx, -1)} disabled={idx === 0}>↑</button>
                      <button className="btn btn-secondary" style={{ flex: 1, padding: '4px 8px' }} onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1}>↓</button>
                    </div>
                    <input
                      placeholder="Alt text (for accessibility)"
                      value={img.alt_text || ''}
                      onChange={(e) => updateImageMeta(img.id, 'alt_text', e.target.value)}
                      onBlur={() => saveImageMeta(img)}
                      style={{ marginBottom: 6, fontSize: '0.85rem' }}
                    />
                    <input
                      placeholder="Caption (optional)"
                      value={img.caption || ''}
                      onChange={(e) => updateImageMeta(img.id, 'caption', e.target.value)}
                      onBlur={() => saveImageMeta(img)}
                      style={{ marginBottom: 8, fontSize: '0.85rem' }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={() => setCover(img.id)}
                        disabled={Boolean(img.is_cover)}
                      >
                        {img.is_cover ? 'Cover image' : 'Set as cover'}
                      </button>
                      <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => deleteImage(img.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'SEO' && (
        <div style={{ maxWidth: 600 }}>
          <div className="field">
            <label htmlFor="seo_title">SEO title (optional — defaults to project title)</label>
            <input id="seo_title" value={form.seo_title} onChange={update('seo_title')} maxLength={70} />
          </div>
          <div className="field">
            <label htmlFor="seo_description">SEO description (optional — defaults to short description)</label>
            <textarea id="seo_description" value={form.seo_description} onChange={update('seo_description')} maxLength={160} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--line)' }}>
        <button className="btn btn-secondary" disabled={saving || !form.title.trim()} onClick={() => save('draft')}>
          Save Draft
        </button>
        <button className="btn" disabled={saving || !form.title.trim()} onClick={() => save('published')}>
          {saving ? 'Saving…' : 'Publish'}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/projects')}>
          Back to list
        </button>
      </div>
    </div>
  );
}
