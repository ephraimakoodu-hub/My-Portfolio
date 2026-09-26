
import { Link } from 'react-router-dom';

export default function Footer({ settings }) {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">

        <div className="footer-main">

          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <span
                className="site-logo-mark"
                aria-hidden="true"
              />

              {settings?.name || 'Portfolio'}
            </Link>

            <p>
              Building useful software for real-world
              problems.
            </p>
          </div>


          <div className="footer-links">

            <div className="footer-column">
              <span className="footer-label">
                Explore
              </span>

              <Link to="/">Home</Link>
              <Link to="/projects">Work</Link>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
            </div>


            <div className="footer-column">
              <span className="footer-label">
                Connect
              </span>

              {settings?.github_url && (
                <a
                  href={settings.github_url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  GitHub
                </a>
              )}

              {settings?.linkedin_url && (
                <a
                  href={settings.linkedin_url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  LinkedIn
                </a>
              )}

              {settings?.email && (
                <a href={`mailto:${settings.email}`}>
                  Email
                </a>
              )}
            </div>


            <div className="footer-column">
              <span className="footer-label">
                Legal
              </span>

              <Link to="/privacy">
                Privacy
              </Link>

              <Link to="/terms">
                Terms
              </Link>

              <Link to="/cookies">
                Cookies
              </Link>
            </div>

          </div>
        </div>


        <div className="footer-bottom">

          <span>
            © {year} {settings?.name || 'Portfolio'}
          </span>

          <span>
            All rights reserved.
          </span>

        </div>

      </div>
    </footer>
  );
}
