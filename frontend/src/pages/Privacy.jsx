import { useOutletContext } from 'react-router-dom';
import Seo from '../components/Seo';

export default function Privacy() {
  const { settings } = useOutletContext();
  const contactEmail = settings?.email || '(add your contact email in admin settings)';

  return (
    <div className="container section" style={{ maxWidth: 760 }}>
      <Seo title="Privacy Policy" description="How this site handles your information." noindex />
      <h1>Privacy Policy</h1>
      <p className="muted">Last reviewed: check with the site owner for the current revision date.</p>

      <p>
        This policy describes what information this website actually collects and how it is used. It is
        written to match this specific implementation rather than a generic template, and it is not a
        substitute for legal advice. If you operate this site commercially or in a jurisdiction with
        specific data-protection requirements (such as the EU/UK GDPR or the California CCPA/CPRA), have
        this reviewed by a qualified professional before relying on it.
      </p>

      <h3>Information collected through the contact form</h3>
      <p>
        When you submit the contact form, this site stores the name, email address, and message you
        provide, along with any optional company, project type, or budget details you choose to include.
        This information is used solely to respond to your inquiry. It is not sold, rented, or shared
        with third parties, and it is not used for marketing without your separate, explicit consent.
      </p>
      <p>
        A one-way cryptographic hash of your IP address is stored alongside each submission for spam and
        abuse prevention. The raw IP address itself is never stored.
      </p>

      <h3>Cookies</h3>
      <p>
        This site uses two strictly necessary cookies and no others by default: one to keep an
        administrator signed in to the private dashboard, and one to prevent cross-site request forgery
        attacks against that dashboard. Neither cookie is used for tracking, analytics, or advertising, and
        neither is set for visitors who are not logged in as an administrator. See the
        <a href="/cookies"> Cookie Policy</a> for details. If analytics or other tracking is added to this
        site in the future, this policy and the cookie policy will be updated to reflect it before it is
        deployed.
      </p>

      <h3>Data storage and security</h3>
      <p>
        Data is stored in a private database that is not publicly accessible. Administrative access is
        protected by authentication, and the site is designed to run over HTTPS in production. No system
        can guarantee absolute security, but reasonable technical safeguards (encrypted transport,
        hashed passwords, restricted database access) are in place.
      </p>

      <h3>Data retention</h3>
      <p>
        Contact form submissions are retained until the site owner deletes them from the admin dashboard.
        There is currently no automatic deletion schedule; the site owner should define and follow a
        retention period appropriate to their jurisdiction and business needs.
      </p>

      <h3>Your rights</h3>
      <p>
        Depending on where you live, you may have the right to request access to, correction of, or
        deletion of your personal information. To make such a request, contact {contactEmail}.
      </p>

      <h3>Contact</h3>
      <p>Questions about this policy can be sent to {contactEmail}.</p>
    </div>
  );
}
