import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';

import { api, uploadUrl } from '../api/client';
import ProjectCard from '../components/ProjectCard';
import Seo from '../components/Seo';

export default function Home() {
  const { settings } = useOutletContext();

  const [featured, setFeatured] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    api
      .get('/projects?featured=true')
      .then((rows) => setFeatured(rows.slice(0, 3)))
      .catch(() => {});

    api
      .get('/services')
      .then(setServices)
      .catch(() => {});
  }, []);

  const hasProfile = settings?.name || settings?.title;

  return (
    <>
      <Seo
        title={
          settings?.name
            ? `${settings.name} — ${settings.title || 'Software Developer'}`
            : 'Portfolio'
        }
        description={
          settings?.value_proposition ||
          settings?.bio ||
          ''
        }
      />

      {/* HERO */}
      <section className="hero">
        <div className="container hero-grid">

          <div className="hero-copy">
            {hasProfile ? (
              <>
                <p className="hero-eyebrow">
                  {settings.title || 'Software Developer'}
                </p>

                <h1>{settings.name}</h1>

                {settings.value_proposition && (
                  <p className="hero-description">
                    {settings.value_proposition}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="hero-eyebrow">
                  Software Developer
                </p>

                <h1>
                  Building useful software for real problems.
                </h1>

                <p className="hero-description">
                  My portfolio is currently being set up.
                  Add your name, title and value proposition
                  from the admin dashboard to personalize this section.
                </p>
              </>
            )}

            <div className="hero-actions">
              <Link to="/projects" className="btn">
                View my work
                <span aria-hidden="true">↗</span>
              </Link>

              <Link to="/contact" className="btn btn-secondary">
                Let's work together
              </Link>
            </div>
          </div>

          {settings?.profile_image && (
            <div className="hero-image-wrap">
              <img
                className="hero-image"
                src={uploadUrl(settings.profile_image)}
                alt={
                  settings?.name
                    ? `Portrait of ${settings.name}`
                    : 'Profile photo'
                }
              />
            </div>
          )}

        </div>
      </section>

      {/* FEATURED WORK */}
      {featured.length > 0 && (
        <section className="section section-tight projects-section">
          <div className="container">

            <div className="section-heading">
              <div>
                <p className="section-kicker">
                  Selected work
                </p>

                <h2>
                  Things I've built
                </h2>
              </div>

              <Link to="/projects" className="muted">
                View all projects →
              </Link>
            </div>

            <div className="project-grid">
              {featured.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                />
              ))}
            </div>

          </div>
        </section>
      )}

      {/* SERVICES */}
      {services.length > 0 && (
        <section className="section services-section">
          <div className="container">

            <div className="section-heading">
              <div>
                <p className="section-kicker">
                  Capabilities
                </p>

                <h2>
                  What I do
                </h2>
              </div>
            </div>

            <div className="grid grid-3">
              {services.map((service) => (
                <article
                  key={service.id}
                  className="service-card"
                >
                  <h3>{service.title}</h3>

                  {service.description && (
                    <p>{service.description}</p>
                  )}
                </article>
              ))}
            </div>

          </div>
        </section>
      )}
    </>
  );
}