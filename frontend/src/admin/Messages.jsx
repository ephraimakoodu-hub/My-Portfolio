import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Seo from '../components/Seo';

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/contact').then(setMessages).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm('Delete this message? This cannot be undone.')) return;
    await api.delete(`/contact/${id}`);
    load();
  };

  return (
    <div>
      <Seo title="Messages" noindex />
      <h1>Messages</h1>
      <p className="muted">Submissions from your contact form. Delete messages you no longer need to keep — there is no automatic expiry.</p>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : messages.length === 0 ? (
        <p className="muted">No messages yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
          {messages.map((m) => (
            <div key={m.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <strong>{m.name}</strong> &lt;{m.email}&gt;
                  {m.company && <span className="muted"> · {m.company}</span>}
                </div>
                <span className="muted">{new Date(m.created_at).toLocaleString()}</span>
              </div>
              {(m.project_type || m.budget_range) && (
                <p className="muted" style={{ marginBottom: 8 }}>
                  {m.project_type && <>Project type: {m.project_type} </>}
                  {m.budget_range && <>· Budget: {m.budget_range}</>}
                </p>
              )}
              <p style={{ whiteSpace: 'pre-wrap' }}>{m.message}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <a className="btn btn-secondary" href={`mailto:${m.email}`}>Reply by email</a>
                <button className="btn btn-danger" onClick={() => remove(m.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
