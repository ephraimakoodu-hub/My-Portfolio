import Seo from '../components/Seo';

export default function Cookies() {
  return (
    <div className="container section" style={{ maxWidth: 760 }}>
      <Seo title="Cookie Policy" description="Cookies used on this website." noindex />
      <h1>Cookie Policy</h1>
      <p>
        This site keeps cookie use to the minimum required for it to function. As built, it does not load
        any analytics, advertising, or third-party tracking cookies. If that ever changes, this page and a
        consent banner will be added before any non-essential cookie is set — nothing non-essential is
        loaded silently.
      </p>

      <h3>Strictly necessary cookies</h3>
      <table>
        <thead>
          <tr><th>Cookie</th><th>Purpose</th><th>Set for</th><th>Duration</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>portfolio_session</td>
            <td>Keeps an administrator signed in to the private dashboard</td>
            <td>Logged-in administrators only</td>
            <td>Up to 8 hours, or until logout</td>
          </tr>
          <tr>
            <td>csrf_token</td>
            <td>Prevents cross-site request forgery against admin actions</td>
            <td>All visitors (empty of personal data)</td>
            <td>Session</td>
          </tr>
        </tbody>
      </table>

      <p>
        Because these cookies are strictly necessary for the site's security and core administrative
        function, they are not subject to a consent banner under most cookie-law frameworks, and cannot
        be disabled without breaking the admin login. Regular visitors browsing the public portfolio are
        not tracked by either cookie.
      </p>
    </div>
  );
}
