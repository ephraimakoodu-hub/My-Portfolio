
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import Seo from '../components/Seo';

const initial = {
  name: '',
  email: '',
  company: '',
  project_type: '',
  budget_range: '',
  message: '',
  website: '',
};

export default function Contact() {
  const { settings } = useOutletContext();

  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const update = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    setError('');
    setStatus('sending');

    try {
      await api.post('/contact', form);

      setStatus('sent');
      setForm(initial);
    } catch (err) {
      setStatus('error');
      setError(
        err.message ||
        'Something went wrong. Please try again.'
      );
    }
  };

  return (
    <>
      <Seo
        title="Contact"
        description="Get in touch about a project."
      />

      <main className="contact-page">

        {/* INTRO */}
        <section className="contact-hero">
          <div className="container contact-hero-grid">

            <div>
              <p className="section-kicker">
                Get in touch
              </p>

              <h1>
                Have a project
                <span> in mind?</span>
              </h1>
            </div>

            <div className="contact-intro">
              <p>
                Tell me what you're building, what problem
                you're trying to solve, and where you want
                to take it.
              </p>

              {settings?.email && (
                <a
                  href={`mailto:${settings.email}`}
                  className="contact-email"
                >
                  {settings.email}
                  <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>

          </div>
        </section>


        {/* FORM */}
        <section className="contact-form-section">
          <div className="container">

            {status === 'sent' ? (
              <div
                className="contact-success"
                role="status"
              >
                <p className="section-kicker">
                  Message received
                </p>

                <h2>
                  Thanks for reaching out.
                </h2>

                <p>
                  Your message has been sent successfully.
                  I'll get back to you as soon as possible.
                </p>

                <button
                  className="btn"
                  type="button"
                  onClick={() => setStatus('idle')}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form
                onSubmit={submit}
                noValidate
                className="contact-form"
              >
                <div className="contact-form-heading">
                  <div>
                    <p className="section-kicker">
                      Project enquiry
                    </p>

                    <h2>
                      Tell me about it.
                    </h2>
                  </div>

                  <p>
                    Fields marked required are needed
                    to send your enquiry.
                  </p>
                </div>

                {error && (
                  <div
                    className="alert alert-error"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                {/* Honeypot */}
                <div
                  className="honeypot-field"
                  aria-hidden="true"
                >
                  <label htmlFor="website">
                    Leave this field blank
                  </label>

                  <input
                    id="website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={update('website')}
                  />
                </div>

                <div className="contact-form-grid">

                  <div className="field">
                    <label htmlFor="name">
                      Name *
                    </label>

                    <input
                      id="name"
                      required
                      value={form.name}
                      onChange={update('name')}
                      maxLength={120}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="email">
                      Email *
                    </label>

                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={update('email')}
                      maxLength={200}
                      placeholder="you@example.com"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="company">
                      Company
                    </label>

                    <input
                      id="company"
                      value={form.company}
                      onChange={update('company')}
                      maxLength={120}
                      placeholder="Company or organization"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="project_type">
                      Project type
                    </label>

                    <input
                      id="project_type"
                      value={form.project_type}
                      onChange={update('project_type')}
                      maxLength={120}
                      placeholder="Website, web app, system..."
                    />
                  </div>

                </div>

                <div className="field">
                  <label htmlFor="budget_range">
                    Budget range
                  </label>

                  <input
                    id="budget_range"
                    value={form.budget_range}
                    onChange={update('budget_range')}
                    maxLength={60}
                    placeholder="Optional"
                  />
                </div>

                <div className="field">
                  <label htmlFor="message">
                    Tell me about your project *
                  </label>

                  <textarea
                    id="message"
                    required
                    value={form.message}
                    onChange={update('message')}
                    maxLength={5000}
                    placeholder="What are you trying to build?"
                  />
                </div>

                <div className="contact-form-footer">
                  <p>
                    Your information is only used to respond
                    to your enquiry. See the{' '}
                    <a href="/privacy">
                      privacy policy
                    </a>{' '}
                    for details.
                  </p>

                  <button
                    className="btn"
                    type="submit"
                    disabled={status === 'sending'}
                  >
                    {status === 'sending'
                      ? 'Sending...'
                      : 'Send enquiry'}
                    <span aria-hidden="true">↗</span>
                  </button>
                </div>

              </form>
            )}

          </div>
        </section>

      </main>
    </>
  );
}
