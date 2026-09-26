import { useOutletContext } from 'react-router-dom';
import Seo from '../components/Seo';

export default function RefundPolicy() {
  const { settings } = useOutletContext();
  const contactEmail = settings?.email || '(add your contact email in admin settings)';

  return (
    <div className="container section" style={{ maxWidth: 760 }}>
      <Seo title="Refund Policy" description="Refund policy for services." noindex />
      <h1>Refund Policy</h1>
      <p>
        This website does not currently process any online payments. There is no payment or checkout
        system built into it, so no automated refund process applies. If and when paid services are
        offered, this page should be replaced with an accurate description of the actual refund terms
        that apply to those services.
      </p>
      <p>
        For any commercial arrangement made directly (for example by invoice or contract outside this
        website), the refund terms are whatever is agreed in that specific contract. Contact {contactEmail}
        {' '}with questions about a specific engagement.
      </p>
    </div>
  );
}
