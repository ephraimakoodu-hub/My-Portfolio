import { useEffect, useState } from 'react';
import { api, uploadUrl } from '../api/client';
import Seo from '../components/Seo';

export default function Settings() {
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get('/settings').then(setForm).catch(() => setForm({}));
  }, []);

  if (!form) return <p className="muted">Loading…</p>;

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const saved = await api.put('/settings', form);
      setForm(saved);
      setNotice('Profile settings saved.');
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    const fd = new FormData();
    fd.append('image', file);
    try {
      const result = await api.upload('/settings/profile-image', fd);
      setForm((f) => ({ ...f, profile_image: result.profile_image }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Seo title="Profile Settings" noindex />
      <h1>Profile Settings</h1>
      <p className="muted">This information drives your homepage hero, About page, and footer. Only what you enter here is shown publicly.</p>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 40, maxWidth: 900 }}>
        <form onSubmit={save}>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" value={form.name || ''} onChange={update('name')} />
          </div>
          <div className="field">
            <label htmlFor="title">Professional title</label>
            <input id="title" value={form.title || ''} onChange={update('title')} placeholder="e.g. Full-Stack Software Developer" />
          </div>
          <div className="field">
            <label htmlFor="value_proposition">Hero value proposition (one or two sentences)</label>
            <textarea id="value_proposition" value={form.value_proposition || ''} onChange={update('value_proposition')} />
          </div>
          <div className="field">
            <label htmlFor="bio">Professional bio / about summary</label>
            <textarea id="bio" value={form.bio || ''} onChange={update('bio')} style={{ minHeight: 140 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field">
              <label htmlFor="email">Contact email</label>
              <input id="email" type="email" value={form.email || ''} onChange={update('email')} />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone (optional)</label>
              <input id="phone" value={form.phone || ''} onChange={update('phone')} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="location">Location (optional)</label>
            <input id="location" value={form.location || ''} onChange={update('location')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field">
              <label htmlFor="github_url">GitHub URL</label>
              <input id="github_url" value={form.github_url || ''} onChange={update('github_url')} />
            </div>
            <div className="field">
              <label htmlFor="linkedin_url">LinkedIn URL</label>
              <input id="linkedin_url" value={form.linkedin_url || ''} onChange={update('linkedin_url')} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="resume_url">Resume / CV link (optional)</label>
            <input id="resume_url" value={form.resume_url || ''} onChange={update('resume_url')} />
          </div>
          <button className="btn" type="submit">Save changes</button>
        </form>

        <div>
          <div className="field">
            <label>Profile picture</label>
            {form.profile_image ? (
              <img src={uploadUrl(form.profile_image)} alt="Current profile" style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', borderRadius: 'var(--radius)', border: '1px solid var(--line)', marginBottom: 10 }} />
            ) : (
              <div className="card" style={{ aspectRatio: '4/5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <span className="muted">No photo yet</span>
              </div>
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadPhoto(e.target.files[0])} disabled={uploading} />
            <p className="hint">One professional photo only. Uploading a new one replaces the current photo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
