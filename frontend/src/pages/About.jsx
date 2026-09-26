
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import Seo from '../components/Seo';

export default function About() {
  const { settings } = useOutletContext();

  const [technologies, setTechnologies] = useState([]);
  const [experience, setExperience] = useState([]);

  useEffect(() => {
    api
      .get('/technologies')
      .then(setTechnologies)
      .catch(() => {});

    api
      .get('/experience')
      .then(setExperience)
      .catch(() => {});
  }, []);

  const grouped = technologies.reduce((acc, technology) => {
    const category = technology.category || 'Technologies';

    if (!acc[category]) {
      acc[category] = [];
    }

    acc[category].push(technology);

    return acc;
  }, {});

  return (
    <>
      <Seo
        title="About"
        description={settings?.bio || ''}
      />

      <main className="about-page">

        {/* INTRO */}
        <section className="about-hero">
          <div className="container about-hero-grid">
            <div>
              <p className="section-kicker">About me</p>

              <h1>
                Building software with
                <span> purpose.</span>
              </h1>
            </div>

            <div className="about-intro">
              {settings?.bio ? (
                <p>{settings.bio}</p>
              ) : (
                <p>
                  Add a professional summary from the
                  admin settings page.
                </p>
              )}
            </div>
          </div>
        </section>


        {/* TECHNOLOGIES */}
        {Object.keys(grouped).length > 0 && (
          <section className="about-section technologies-section">
            <div className="container">

              <div className="about-section-heading">
                <div>
                  <p className="section-kicker">
                    Toolkit
                  </p>

                  <h2>Technologies</h2>
                </div>

                <p>
                  Tools and technologies I use to turn
                  ideas into working software.
                </p>
              </div>

              <div className="technology-grid">
                {Object.entries(grouped).map(
                  ([category, items]) => (
                    <article
                      key={category}
                      className="technology-group"
                    >
                      <h3>{category}</h3>

                      <div className="technology-list">
                        {items.map((technology) => (
                          <span
                            key={technology.id}
                            className="technology-item"
                          >
                            {technology.name}
                          </span>
                        ))}
                      </div>
                    </article>
                  )
                )}
              </div>
            </div>
          </section>
        )}


        {/* EXPERIENCE */}
        {experience.length > 0 && (
          <section className="about-section experience-section">
            <div className="container">

              <div className="about-section-heading">
                <div>
                  <p className="section-kicker">
                    Journey
                  </p>

                  <h2>Experience</h2>
                </div>

                <p>
                  A timeline of roles, projects and
                  professional experience.
                </p>
              </div>

              <div className="experience-list">
                {experience.map((item, index) => (
                  <article
                    key={item.id}
                    className="experience-item"
                  >
                    <div className="experience-number">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div className="experience-content">
                      <p className="experience-date">
                        {item.start_date}

                        {item.end_date
                          ? ` - ${item.end_date}`
                          : ' - Present'}
                      </p>

                      <h3>
                        {item.role}
                      </h3>

                      <p className="experience-company">
                        {item.organization}
                      </p>

                      {item.description && (
                        <p className="experience-description">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>
    </>
  );
}
