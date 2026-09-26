
import { Link } from 'react-router-dom';
import { uploadUrl } from '../api/client';

export default function ProjectCard({ project }) {
  const cover =
    project.images?.find((image) => image.is_cover) ||
    project.images?.[0];

  return (
    <article className="project-card">
      <Link
        to={`/projects/${project.slug}`}
        aria-label={`View project: ${project.title}`}
        className="project-card-image-link"
      >
        {cover ? (
          <img
            src={uploadUrl(cover.filename)}
            alt={
              cover.alt_text ||
              `${project.title} screenshot`
            }
            loading="lazy"
          />
        ) : (
          <div className="project-card-placeholder" />
        )}
      </Link>

      <div className="project-card-content">
        {project.category?.name && (
          <p className="project-category">
            {project.category.name}
          </p>
        )}

        <h3>
          <Link
            to={`/projects/${project.slug}`}
            className="project-card-title"
          >
            {project.title}
          </Link>
        </h3>

        {project.short_description && (
          <p className="project-card-description">
            {project.short_description}
          </p>
        )}

        {project.technologies?.length > 0 && (
          <div className="project-technologies">
            {project.technologies.slice(0, 5).map((technology) => (
              <span
                key={technology.id}
                className="badge"
              >
                {technology.name}
              </span>
            ))}
          </div>
        )}

        <Link
          to={`/projects/${project.slug}`}
          className="project-card-link"
        >
          View project
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}
