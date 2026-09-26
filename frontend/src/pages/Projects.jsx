
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import ProjectCard from '../components/ProjectCard';
import Seo from '../components/Seo';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [params, setParams] = useSearchParams();

  const activeCategory = params.get('category') || '';

  useEffect(() => {
    api
      .get('/categories')
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);

    const query = activeCategory
      ? `?category=${encodeURIComponent(activeCategory)}`
      : '';

    api
      .get(`/projects${query}`)
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  return (
    <>
      <Seo
        title="Work"
        description="A selection of finished projects."
      />

      <main className="projects-page">
        <section className="projects-hero">
          <div className="container">
            <p className="section-kicker">Portfolio</p>

            <h1>Selected work</h1>

            <p className="projects-intro">
              A collection of software projects built to solve
              practical problems and create useful experiences.
            </p>
          </div>
        </section>

        <section className="projects-list-section">
          <div className="container">

            {categories.length > 0 && (
              <div className="project-filters">
                <button
                  className={
                    activeCategory
                      ? 'filter-btn'
                      : 'filter-btn active'
                  }
                  onClick={() => setParams({})}
                >
                  All projects
                </button>

                {categories.map((category) => (
                  <button
                    key={category.id}
                    className={
                      activeCategory === category.slug
                        ? 'filter-btn active'
                        : 'filter-btn'
                    }
                    onClick={() =>
                      setParams({
                        category: category.slug,
                      })
                    }
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="projects-status">
                <p>Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="projects-status">
                <p>No published projects here yet.</p>
                <span>
                  Check back soon for new work.
                </span>
              </div>
            ) : (
              <div className="project-grid">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
