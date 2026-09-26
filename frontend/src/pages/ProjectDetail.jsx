import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, uploadUrl } from '../api/client';
import Seo from '../components/Seo';

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export default function ProjectDetail() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    setStatus('loading');
    api
      .get(`/projects/slug/${slug}`)
      .then((p) => {
        setProject(p);
        setStatus('ready');
      })
      .catch(() => setStatus('not-found'));
  }, [slug]);

  if (status === 'loading') return <div className="container section">Loading…</div>;
  if (status === 'not-found' || !project) {
    return (
      <div className="container section">
        <h1>Project not found</h1>
        <p>This project may have been unpublished or moved.</p>
        <Link to="/projects" className="btn">Back to work</Link>
      </div>
    );
  }

  const cover = project.images.find((i) => i.is_cover) || project.images[0];
  const gallery = project.images.filter((i) => !cover || i.id !== cover.id);

  return (
    <article>
      <Seo
        title={`${project.title} — Case Study`}
        description={project.short_description || project.seo_description}
        image={cover ? uploadUrl(cover.filename) : undefined}
      />

      <div className="container" style={{ paddingTop: 48 }}>
        <Link to="/projects" className="muted">&larr; All projects</Link>
        {project.category?.name && <p className="eyebrow" style={{ marginTop: 24 }}>{project.category.name}</p>}
        <h1>{project.title}</h1>
        {project.short_description && <p style={{ fontSize: '1.1rem', maxWidth: 640 }}>{project.short_description}</p>}

        <div style={{ display: 'flex', gap: 14, margin: '20px 0 36px', flexWrap: 'wrap' }}>
          {project.project_url && (
            <a className="btn" href={project.project_url} target="_blank" rel="noreferrer noopener">Visit live project</a>
          )}
          {project.github_url && (
            <a className="btn btn-secondary" href={project.github_url} target="_blank" rel="noreferrer noopener">View source</a>
          )}
          {project.case_study_url && (
            <a className="btn btn-secondary" href={project.case_study_url} target="_blank" rel="noreferrer noopener">Full case study</a>
          )}
        </div>

        {cover && (
          <img
            src={uploadUrl(cover.filename)}
            alt={cover.alt_text || `${project.title} cover screenshot`}
            style={{ width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--line)', marginBottom: 48 }}
          />
        )}
      </div>

      <div className="container" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 56, paddingBottom: 64 }}>
        <div>
          {project.full_description && <Section title="Overview"><p>{project.full_description}</p></Section>}
          {project.challenges && <Section title="The problem"><p>{project.challenges}</p></Section>}
          {project.solution && <Section title="The solution"><p>{project.solution}</p></Section>}
          {project.features?.length > 0 && (
            <Section title="Key features">
              <ul>
                {project.features.map((f) => <li key={f.id}>{f.feature_text}</li>)}
              </ul>
            </Section>
          )}
          {project.results && <Section title="Outcome"><p>{project.results}</p></Section>}

          {gallery.length > 0 && (
            <Section title="Gallery">
              <div className="grid grid-2">
                {gallery.map((img) => (
                  <figure key={img.id} style={{ margin: 0 }}>
                    <img
                      src={uploadUrl(img.filename)}
                      alt={img.alt_text || `${project.title} screenshot`}
                      style={{ width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }}
                      loading="lazy"
                    />
                    {img.caption && <figcaption className="muted" style={{ marginTop: 6 }}>{img.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </Section>
          )}
        </div>

        <aside>
          {project.technologies?.length > 0 && (
            <Section title="Technology">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {project.technologies.map((t) => <span key={t.id} className="badge">{t.name}</span>)}
              </div>
            </Section>
          )}
          {project.client_type && <Section title="Project type"><p>{project.client_type}</p></Section>}
          {project.project_date && <Section title="Date"><p>{project.project_date}</p></Section>}
        </aside>
      </div>
    </article>
  );
}
