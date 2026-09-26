import { useOutletContext } from 'react-router-dom';
import Seo from '../components/Seo';

export default function Terms() {
  const { settings } = useOutletContext();
  const contactEmail = settings?.email || '(add your contact email in admin settings)';
  const name = settings?.name || 'the site owner';

  return (
    <div className="container section" style={{ maxWidth: 760 }}>
      <Seo title="Terms and Conditions" description="Terms of use for this website." noindex />
      <h1>Terms and Conditions</h1>
      <p className="muted">This is a plain-language draft matching this site's actual functionality. Have it reviewed by a qualified professional before relying on it for legal protection.</p>

      <h3>Use of this website</h3>
      <p>
        This website is a personal/professional portfolio operated by {name}. You may browse it and use
        the contact form to get in touch about potential work. You agree not to misuse the site, including
        attempting to gain unauthorized access to the administrative dashboard or its underlying systems.
      </p>

      <h3>Intellectual property</h3>
      <p>
        The design, text, and code of this website, and the project screenshots and descriptions shown on
        it, belong to {name} unless otherwise noted, and may not be copied or reused without permission.
        Third-party trademarks or project names referenced on this site belong to their respective owners.
      </p>

      <h3>Project content and links</h3>
      <p>
        Project pages describe work {name} has actually completed. Live project links and source-code
        links point to third-party or client-controlled resources where applicable; {name} does not
        control the ongoing availability or content of external sites linked from this portfolio.
      </p>

      <h3>Availability and liability</h3>
      <p>
        This site is provided as-is. {name} does not guarantee uninterrupted availability and is not
        liable for damages arising from your use of, or inability to use, this website, to the fullest
        extent permitted by applicable law.
      </p>

      <h3>Changes to these terms</h3>
      <p>These terms may be updated from time to time. Continued use of the site after a change constitutes acceptance of the revised terms.</p>

      <h3>Contact</h3>
      <p>Questions about these terms can be sent to {contactEmail}.</p>
    </div>
  );
}
